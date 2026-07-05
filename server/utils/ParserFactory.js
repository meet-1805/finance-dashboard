const CSVParser = require('./CSVParser');

class ParserFactory {
    /**
     * Factory method to return the appropriate parser based on file extension.
     * @param {string} fileExtension - The file extension (e.g., 'csv', '.csv').
     * @returns {StatementParser} An instance of a class extending StatementParser.
     */
    static getParser(fileExtension) {
        const ext = fileExtension.toLowerCase().replace(/^\./, '');
        switch (ext) {
            case 'csv':
                return new CSVParser();
            default:
                throw new Error(`Unsupported file type: .${ext}`);
        }
    }
}

module.exports = ParserFactory;
