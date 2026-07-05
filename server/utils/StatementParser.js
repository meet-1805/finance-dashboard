/**
 * StatementParser
 * 
 * Base class for all bank statement parsers (CSV, Excel, PDF, etc.).
 * 
 * All concrete parsers MUST extend this class and implement `parse()`.
 * They SHOULD reuse the shared semantic pipeline modules:
 * 
 *   HeaderMapper         → semantic column detection
 *   TransactionNormalizer → row → standard transaction object
 * 
 * Return contract for `parse()`:
 * 
 *   On success:
 *   {
 *     status:         'SUCCESS',
 *     transactions:   Array<{
 *                       date:         Date,
 *                       description:  string,
 *                       amount:       number,
 *                       type:         'Income' | 'Expense',
 *                       balance:      number | null,
 *                       referenceNo:  string | null,
 *                       rawRow:       string[]
 *                     }>,
 *     detectedHeaders: Object   // semanticType → normalized header name
 *   }
 * 
 *   When required columns cannot be identified:
 *   {
 *     status:           'MAPPING_REQUIRED',
 *     missingSemantics:  string[],
 *     detectedHeaders:   Object,
 *     uncertainHeaders:  Object,
 *     unmatchedHeaders:  Array<{ index: number, normalizedHeader: string }>
 *   }
 * 
 * Concrete parsers MUST NOT throw on unrecognised headers — they must
 * return the MAPPING_REQUIRED structure instead.
 */
class StatementParser {
    /**
     * Parse a statement file buffer and return a structured result.
     * @param {Buffer} fileBuffer - The in-memory file buffer.
     * @returns {Promise<Object>} A SUCCESS or MAPPING_REQUIRED result object.
     */
    async parse(fileBuffer) {
        throw new Error("Method 'parse(fileBuffer)' must be implemented by a concrete StatementParser subclass.");
    }
}

module.exports = StatementParser;
