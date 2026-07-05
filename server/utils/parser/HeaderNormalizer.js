/**
 * HeaderNormalizer
 * 
 * Normalizes raw CSV header strings into a canonical form for matching.
 * 
 * Steps:
 *   1. Convert to lowercase
 *   2. Remove punctuation (dots, slashes, brackets, etc.)
 *   3. Collapse multiple whitespace characters into a single space
 *   4. Trim leading/trailing whitespace
 */
class HeaderNormalizer {
    /**
     * Normalize a single header string.
     * @param {string} header - The raw header string.
     * @returns {string} The normalized header string.
     */
    static normalize(header) {
        if (typeof header !== 'string') return '';
        return header
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ') // Remove all non-alphanumeric characters except spaces
            .replace(/\s+/g, ' ')          // Collapse multiple spaces
            .trim();
    }

    /**
     * Normalize an array of headers.
     * @param {string[]} headers - Array of raw header strings.
     * @returns {string[]} Array of normalized header strings.
     */
    static normalizeAll(headers) {
        return headers.map(h => HeaderNormalizer.normalize(h));
    }
}

module.exports = HeaderNormalizer;
