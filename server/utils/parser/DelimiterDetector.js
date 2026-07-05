/**
 * DelimiterDetector
 *
 * Automatically detects the field delimiter used in a CSV-like file by
 * scoring each candidate delimiter based on:
 *
 *   1. Average occurrence count per line (higher = more likely separator)
 *   2. Variance in occurrence count across lines (lower = more consistent)
 *
 * Consistency score = avg / (1 + variance)
 *
 * Candidates tested: comma, semicolon, tab, pipe.
 * Falls back to comma if no candidate scores above zero.
 *
 * Counting is quote-aware — delimiters inside double-quoted fields are ignored.
 */
class DelimiterDetector {

    static CANDIDATES = [',', ';', '\t', '|'];

    /**
     * Detect the delimiter for the given raw file content string.
     * @param {string} content - The raw text content of the file.
     * @returns {{ delimiter: string, confidence: number }}
     */
    static detect(content) {
        // Use first 15 non-empty lines for analysis
        const lines = content
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(Boolean)
            .slice(0, 15);

        if (!lines.length) {
            return { delimiter: ',', confidence: 0 };
        }

        let bestDelimiter = ',';
        let bestScore     = -1;

        for (const delim of DelimiterDetector.CANDIDATES) {
            const counts = lines.map(line =>
                DelimiterDetector._countOutsideQuotes(line, delim)
            );

            const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
            if (avg === 0) continue;

            const variance = counts.reduce((sum, c) => sum + (c - avg) ** 2, 0) / counts.length;
            const score    = avg / (1 + variance);

            if (score > bestScore) {
                bestScore     = score;
                bestDelimiter = delim;
            }
        }

        // Normalise confidence to [0, 1] — a score ≥ 5 is considered very confident
        const confidence = bestScore <= 0 ? 0 : Math.min(1.0, bestScore / 5);

        return {
            delimiter:  bestDelimiter,
            confidence: parseFloat(confidence.toFixed(4))
        };
    }

    /**
     * Count occurrences of a delimiter in a line, skipping double-quoted regions.
     * @param {string} line
     * @param {string} delim
     * @returns {number}
     */
    static _countOutsideQuotes(line, delim) {
        let count    = 0;
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (!inQuotes && ch === delim) {
                count++;
            }
        }

        return count;
    }
}

module.exports = DelimiterDetector;
