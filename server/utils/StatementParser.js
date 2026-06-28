/**
 * Base class representing the StatementParser interface.
 * All format-specific parsers (CSV, Excel, PDF, etc.) must extend this class.
 */
class StatementParser {
    /**
     * Parses a statement file buffer and returns standardized transaction structures.
     * @param {Buffer} fileBuffer - The in-memory file buffer.
     * @returns {Promise<Array<Object>>} A promise resolving to an array of parsed transaction objects.
     */
    async parse(fileBuffer) {
        throw new Error("Method 'parse(fileBuffer)' must be implemented.");
    }
}

module.exports = StatementParser;
