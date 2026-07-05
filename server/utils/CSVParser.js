const StatementParser        = require('./StatementParser');
const DelimiterDetector      = require('./parser/DelimiterDetector');
const HeaderRowDetector      = require('./parser/HeaderRowDetector');
const HeaderMapper           = require('./parser/HeaderMapper');
const TransactionNormalizer  = require('./parser/TransactionNormalizer');

const PARSER_VERSION = '3.0.0';

/**
 * CSVParser
 *
 * Extends StatementParser to parse CSV (and CSV-like) bank statements using
 * the Universal Statement Parser pipeline:
 *
 *   Raw CSV bytes
 *     → UTF-8 / BOM decode
 *     → Full-content tokenizer (multi-line field & quote-aware)
 *     → DelimiterDetector  (comma / semicolon / tab / pipe)
 *     → HeaderRowDetector  (skip bank metadata, locate real header row)
 *     → HeaderMapper       (semantic column detection with confidence scoring)
 *     → TransactionNormalizer (row → standard transaction object, with warnings)
 *     → Parser Report
 *
 * ─── Return Shape ──────────────────────────────────────────────────────────
 *
 *   SUCCESS:
 *   {
 *     status:         'SUCCESS',
 *     transactions:   [ { date, description, amount, type, balance, referenceNo, rawRow } ],
 *     detectedHeaders: { DATE: '...', DESCRIPTION: '...', ... },
 *     report: {
 *       parserVersion:        string,
 *       delimiter:            string,
 *       delimiterConfidence:  number,
 *       headerRow:            number,   ← 0-based index of header row in file
 *       headerRowConfidence:  number,
 *       headerConfidence:     { [semanticType]: number },
 *       rowsRead:             number,
 *       rowsImported:         number,
 *       rowsSkipped:          number,
 *       warnings:             string[]
 *     }
 *   }
 *
 *   MAPPING_REQUIRED:
 *   {
 *     status:           'MAPPING_REQUIRED',
 *     missingSemantics:  string[],
 *     detectedHeaders:   Object,
 *     uncertainHeaders:  Object,
 *     unmatchedHeaders:  Array,
 *     report: { parserVersion, delimiter, delimiterConfidence, headerRow, rowsRead, warnings }
 *   }
 *
 * ─── Robustness Features ───────────────────────────────────────────────────
 *   • Automatic delimiter detection (comma, semicolon, tab, pipe)
 *   • Automatic header-row detection (skips metadata rows)
 *   • Multi-line quoted fields preserved correctly
 *   • Duplicate column names disambiguated with _2 / _3 suffix
 *   • Blank rows skipped
 *   • Malformed rows recorded in warnings, never crash
 *   • BOM stripped
 *   • Amount parsing via AmountNormalizer (see that module for detail)
 *   • Date parsing with documented precedence (see TransactionNormalizer)
 */
class CSVParser extends StatementParser {

    /**
     * Parse a CSV file buffer.
     * @param {Buffer} fileBuffer - The in-memory file buffer.
     * @returns {Promise<Object>} A SUCCESS or MAPPING_REQUIRED result object.
     */
    async parse(fileBuffer) {
        const warnings = [];

        // ── 1. Decode & strip BOM ────────────────────────────────────────────
        let content = fileBuffer.toString('utf8');
        if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

        if (!content.trim()) {
            return this._success([], {}, {
                parserVersion: PARSER_VERSION,
                delimiter: ',', delimiterConfidence: 0,
                headerRow: 0, headerRowConfidence: 0,
                headerConfidence: {}, rowsRead: 0, rowsImported: 0,
                rowsSkipped: 0, warnings: []
            });
        }

        // ── 2. Detect delimiter ──────────────────────────────────────────────
        const { delimiter, confidence: delimConf } = DelimiterDetector.detect(content);

        // ── 3. Tokenize full content (multi-line quote-aware) ────────────────
        const allRows = CSVParser._tokenizeContent(content, delimiter);

        // Remove completely blank rows
        const rows = allRows.filter(row => row.some(cell => cell.trim().length > 0));

        if (rows.length < 2) {
            const report = {
                parserVersion: PARSER_VERSION,
                delimiter, delimiterConfidence: delimConf,
                headerRow: 0, headerRowConfidence: 0,
                headerConfidence: {}, rowsRead: rows.length,
                rowsImported: 0, rowsSkipped: 0, warnings
            };
            return this._success([], {}, report);
        }

        // ── 4. Detect header row (skip metadata rows) ────────────────────────
        const { headerRow, confidence: headerRowConf } = HeaderRowDetector.detect(rows);
        const rawHeaders = CSVParser._deduplicateHeaders(rows[headerRow]);

        // ── 5. Run semantic header mapping ───────────────────────────────────
        const mapResult = HeaderMapper.map(rawHeaders);

        const baseReport = {
            parserVersion:       PARSER_VERSION,
            delimiter,
            delimiterConfidence: delimConf,
            headerRow,
            headerRowConfidence: headerRowConf,
            rowsRead:            rows.length - headerRow - 1,
            warnings
        };

        if (mapResult.status === 'MAPPING_REQUIRED') {
            return {
                ...mapResult,
                report: { ...baseReport, rowsImported: 0, rowsSkipped: 0 }
            };
        }

        // ── 6. Build header confidence map for the report ────────────────────
        const { mapping, detectedHeaders } = mapResult;
        const headerConfidence = {};
        for (const [type, entry] of Object.entries(mapping)) {
            if (entry) headerConfidence[type] = entry.confidence;
        }

        // ── 7. Normalise data rows ────────────────────────────────────────────
        const transactions = [];
        let rowsSkipped    = 0;

        const dataRows = rows.slice(headerRow + 1);

        dataRows.forEach((rowValues, idx) => {
            // 1-based display number, accounting for skipped metadata rows
            const displayRow = headerRow + idx + 2;

            const { transaction, warnings: rowWarnings } = TransactionNormalizer.normalize(
                rowValues, mapping, displayRow
            );

            warnings.push(...rowWarnings);

            if (transaction) {
                transactions.push(transaction);
            } else {
                // Only count as skipped if it had some data (not a trailing empty row)
                if (rowValues.some(v => v.trim())) rowsSkipped++;
            }
        });

        const report = {
            ...baseReport,
            headerConfidence,
            rowsRead:     dataRows.length,
            rowsImported: transactions.length,
            rowsSkipped
        };

        return this._success(transactions, detectedHeaders, report);
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    /**
     * Build a SUCCESS result object.
     */
    _success(transactions, detectedHeaders, report) {
        return { status: 'SUCCESS', transactions, detectedHeaders, report };
    }

    /**
     * Tokenize the full content string into a 2-D array of rows × cells.
     * Handles:
     *   • Double-quoted fields (delimiter and newlines inside quotes preserved)
     *   • Escaped double-quotes ("") inside quoted fields
     *   • \r\n, \n, and \r line endings
     *
     * @param {string} content
     * @param {string} delimiter
     * @returns {string[][]}
     */
    static _tokenizeContent(content, delimiter) {
        const rows   = [];
        let row      = [];
        let field    = '';
        let inQuotes = false;

        for (let i = 0; i < content.length; i++) {
            const ch   = content[i];
            const next = content[i + 1];

            if (ch === '"') {
                if (inQuotes && next === '"') {
                    field += '"';   // escaped double-quote
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch === delimiter && !inQuotes) {
                row.push(field.trim());
                field = '';
            } else if (!inQuotes && (ch === '\n' || (ch === '\r' && next === '\n') || ch === '\r')) {
                if (ch === '\r' && next === '\n') i++; // consume \n after \r
                row.push(field.trim());
                field = '';
                rows.push(row);
                row = [];
            } else {
                field += ch;
            }
        }

        // Final field/row
        if (field || row.length > 0) {
            row.push(field.trim());
            rows.push(row);
        }

        return rows;
    }

    /**
     * Deduplicate header names by appending _2, _3, ... to repeats.
     * Prevents HeaderMapper from crashing when a bank repeats a column name.
     * @param {string[]} headers
     * @returns {string[]}
     */
    static _deduplicateHeaders(headers) {
        const seen  = {};
        return headers.map(h => {
            const key = (h || '').toLowerCase().trim();
            if (!key) return h;
            seen[key] = (seen[key] || 0) + 1;
            if (seen[key] === 1) return h;          // first occurrence untouched
            return `${h}_${seen[key]}`;             // duplicate: Debit → Debit_2
        });
    }
}

module.exports = CSVParser;
