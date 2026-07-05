const AmountNormalizer = require('./AmountNormalizer');

/**
 * TransactionNormalizer
 *
 * Converts a single tokenised CSV row into the standardised internal
 * transaction format consumed by the rest of the import pipeline
 * (duplicate detection, categorisation, review, confirmation, rollback).
 *
 * ─── Standard output format ───────────────────────────────────────────
 * {
 *   date:        Date,         ← parsed transaction date
 *   description: string,       ← cleaned merchant/narration text
 *   amount:      number,       ← absolute value > 0
 *   type:        string,       ← 'Income' | 'Expense'
 *   balance:     number|null,  ← closing balance if available
 *   referenceNo: string|null,  ← reference / UTR / cheque number if available
 *   rawRow:      string[]      ← original cell values preserved for audit/debug
 * }
 *
 * ─── Date Parsing Precedence ──────────────────────────────────────────
 * The parser tries formats in this priority order:
 *
 *  1. DD Mon YYYY   e.g. "01 Jun 2024", "1 January 2024"
 *  2. YYYY-MM-DD    ISO 8601 strict — unambiguous
 *  3. YYYY/MM/DD    ISO variant
 *  4. DD/MM/YYYY    Indian / international banking standard
 *     DD-MM-YYYY    (same, hyphen variant)
 *     DD.MM.YYYY    (same, dot variant)
 *     Disambiguation rule: if first segment > 12, it MUST be the day (DD/MM).
 *     If first segment ≤ 12, DD/MM is still preferred over MM/DD.
 *  5. MM/DD/YYYY    US format — used as last resort only when DD > 12 fails DD/MM
 *  6. Native Date() — fallback for remaining natural-language strings
 *
 * ─── Skip Conditions ──────────────────────────────────────────────────
 *  - Date is missing or unparseable
 *  - Description is empty
 *  - Both DEBIT and CREDIT cells are empty or zero
 *
 * ─── Return Value ─────────────────────────────────────────────────────
 * Returns { transaction, warnings } where:
 *   transaction = the normalised object, or null if the row should be skipped
 *   warnings    = string[] of non-fatal issues found while processing the row
 */
class TransactionNormalizer {

    // Short month name → zero-indexed month number
    static MONTH_MAP = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
        january: 0, february: 1, march: 2, april: 3, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    };

    /**
     * Normalise a single CSV data row.
     *
     * @param {string[]} values  - Array of raw string cell values.
     * @param {Object}   mapping - The HeaderMapper SUCCESS mapping object.
     * @param {number}   rowNum  - 1-based display row number (for warnings).
     * @returns {{ transaction: Object|null, warnings: string[] }}
     */
    static normalize(values, mapping, rowNum = 0) {
        const warnings = [];

        try {
            // ── Date ──────────────────────────────────────────────────────────
            const rawDate   = TransactionNormalizer._cell(values, mapping.DATE);
            const parsedDate = TransactionNormalizer._parseDate(rawDate);

            if (!parsedDate) {
                warnings.push(`Row ${rowNum}: unparseable date "${rawDate}", row skipped`);
                return { transaction: null, warnings };
            }

            // ── Description ───────────────────────────────────────────────────
            const description = TransactionNormalizer._cell(values, mapping.DESCRIPTION);

            if (!description) {
                warnings.push(`Row ${rowNum}: empty description, row skipped`);
                return { transaction: null, warnings };
            }

            // ── Debit / Credit ────────────────────────────────────────────────
            const rawDebit  = TransactionNormalizer._cell(values, mapping.DEBIT);
            const rawCredit = TransactionNormalizer._cell(values, mapping.CREDIT);

            const debitAmount  = AmountNormalizer.parseAbsolute(rawDebit);
            const creditAmount = AmountNormalizer.parseAbsolute(rawCredit);

            let amount, type;

            if (debitAmount > 0) {
                amount = debitAmount;
                type   = 'Expense';
            } else if (creditAmount > 0) {
                amount = creditAmount;
                type   = 'Income';
            } else {
                // Both empty or zero — skip silently (common for header-only rows)
                return { transaction: null, warnings };
            }

            // ── Optional: Balance ─────────────────────────────────────────────
            let balance = null;
            if (mapping.BALANCE) {
                const rawBalance = TransactionNormalizer._cell(values, mapping.BALANCE);
                if (rawBalance) {
                    const b = AmountNormalizer.parse(rawBalance);
                    if (!isNaN(b)) balance = b;
                }
            }

            // ── Optional: Reference number ────────────────────────────────────
            let referenceNo = null;
            if (mapping.REFERENCE) {
                const rawRef = TransactionNormalizer._cell(values, mapping.REFERENCE);
                if (rawRef) referenceNo = rawRef;
            }

            const transaction = {
                date:        parsedDate,
                description,
                amount,
                type,
                balance,
                referenceNo,
                rawRow: [...values]
            };

            return { transaction, warnings };

        } catch (err) {
            warnings.push(`Row ${rowNum}: unexpected error "${err.message}", row skipped`);
            return { transaction: null, warnings };
        }
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    /**
     * Safely extract and trim a cell value.
     */
    static _cell(values, mappingEntry) {
        if (!mappingEntry || mappingEntry.index == null) return '';
        return (values[mappingEntry.index] || '').trim();
    }

    /**
     * Parse a date string following the documented precedence rules.
     * Returns a UTC Date or null on failure.
     * @param {string} raw
     * @returns {Date|null}
     */
    static _parseDate(raw) {
        if (!raw) return null;
        const str = raw.trim();

        // ── Priority 1: DD Mon YYYY (e.g. "01 Jun 2024", "1 January 2024") ──
        const dmyAlpha = str.match(
            /^(\d{1,2})[\/\-\s]+([A-Za-z]{3,9})[\/\-\s.,]+(\d{2,4})$/
        );
        if (dmyAlpha) {
            const d = dmyAlpha[1].padStart(2, '0');
            const mIdx = TransactionNormalizer.MONTH_MAP[dmyAlpha[2].toLowerCase()];
            if (mIdx !== undefined) {
                let y = dmyAlpha[3];
                if (y.length === 2) y = '20' + y;
                const m = String(mIdx + 1).padStart(2, '0');
                const date = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
                if (!isNaN(date.getTime())) return date;
            }
        }

        // ── Priority 2: YYYY-MM-DD (ISO 8601 strict) ─────────────────────────
        const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
        if (iso) {
            const date = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00.000Z`);
            if (!isNaN(date.getTime())) return date;
        }

        // ── Priority 3: YYYY/MM/DD ────────────────────────────────────────────
        const isoSlash = str.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
        if (isoSlash) {
            const date = new Date(`${isoSlash[1]}-${isoSlash[2]}-${isoSlash[3]}T00:00:00.000Z`);
            if (!isNaN(date.getTime())) return date;
        }

        // ── Priority 4: DD/MM/YYYY (preferred) ───────────────────────────────
        // Also handles DD-MM-YYYY and DD.MM.YYYY
        const numeric = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
        if (numeric) {
            let [, seg1, seg2, y] = numeric;
            if (y.length === 2) y = '20' + y;

            const n1 = parseInt(seg1, 10);
            const n2 = parseInt(seg2, 10);

            // DD/MM: if first segment > 12 it can only be the day
            // If both ≤ 12, prefer DD/MM (international banking standard)
            if (n1 >= 1 && n1 <= 31 && n2 >= 1 && n2 <= 12) {
                const d    = seg1.padStart(2, '0');
                const m    = seg2.padStart(2, '0');
                const date = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
                if (!isNaN(date.getTime())) return date;
            }

            // ── Priority 5: MM/DD/YYYY (US — last resort) ──────────────────
            if (n2 >= 1 && n2 <= 31 && n1 >= 1 && n1 <= 12) {
                const m    = seg1.padStart(2, '0');
                const d    = seg2.padStart(2, '0');
                const date = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
                if (!isNaN(date.getTime())) return date;
            }
        }

        // ── Priority 6: Native Date() fallback ────────────────────────────────
        const fallback = new Date(str);
        if (!isNaN(fallback.getTime())) return fallback;

        return null;
    }
}

module.exports = TransactionNormalizer;
