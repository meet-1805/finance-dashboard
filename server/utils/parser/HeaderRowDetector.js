const HeaderNormalizer = require('./HeaderNormalizer');
const HeaderMatcher    = require('./HeaderMatcher');

/**
 * HeaderRowDetector
 *
 * Scans the first N rows of a tokenised file to find which row is the
 * actual column header row, automatically skipping bank metadata rows such as:
 *
 *   "Statement of Account"
 *   "Account No: 12345678"
 *   "From: 01/01/2024  To: 30/06/2024"
 *   ...
 *   Date, Narration, Withdrawal Amt., Deposit Amt., Closing Balance   ← real header
 *
 * Strategy:
 *   For each candidate row (up to maxScanRows), normalise every cell and run
 *   it through HeaderMatcher. Count how many cells get a confident semantic
 *   match (confidence ≥ 0.80). The row with the most matches (requiring at
 *   least 2) is elected as the header row.
 *
 *   If no row has 2+ confident matches, row index 0 is returned as a safe default.
 */
class HeaderRowDetector {

    static MATCH_THRESHOLD = 0.80;
    static MIN_MATCHES     = 2;
    static DEFAULT_SCAN    = 20;

    /**
     * Identify the header row index from a 2-D array of tokenised rows.
     *
     * @param {string[][]} rows         - All tokenised rows from the file.
     * @param {number}     maxScanRows  - Maximum rows to scan (default 20).
     * @returns {{ headerRow: number, confidence: number }}
     */
    static detect(rows, maxScanRows = HeaderRowDetector.DEFAULT_SCAN) {
        const limit = Math.min(rows.length, maxScanRows);

        let bestRow        = 0;
        let bestMatchCount = 0;
        let bestScore      = 0;

        for (let i = 0; i < limit; i++) {
            const cells = rows[i];
            if (!cells || !cells.length) continue;

            let matchCount = 0;
            let scoreSum   = 0;

            for (const cell of cells) {
                const normalized = HeaderNormalizer.normalize(cell);
                if (!normalized) continue;

                const match = HeaderMatcher.match(normalized);
                if (match.confidence >= HeaderRowDetector.MATCH_THRESHOLD) {
                    matchCount++;
                    scoreSum += match.confidence;
                }
            }

            // Score = average confidence across ALL cells (not just matched ones)
            // Penalises rows with many unmatched cells even if some match well
            const score = matchCount >= HeaderRowDetector.MIN_MATCHES
                ? scoreSum / cells.length
                : 0;

            if (score > bestScore) {
                bestScore      = score;
                bestMatchCount = matchCount;
                bestRow        = i;
            }
        }

        return {
            headerRow:  bestRow,
            confidence: parseFloat(bestScore.toFixed(4))
        };
    }
}

module.exports = HeaderRowDetector;
