const HeaderMatcher = require('./HeaderMatcher');

/**
 * HeaderConfidenceEngine
 * 
 * Responsible for processing raw match results from HeaderMatcher and
 * making the final confidence-based decision for each column.
 * 
 * Thresholds:
 *   >= 0.80 → CONFIDENT  (column is accepted automatically)
 *   >= 0.55 → UNCERTAIN  (column is flagged for potential manual review)
 *   <  0.55 → UNKNOWN    (column cannot be identified)
 * 
 * When two headers compete for the same semantic type, the one with the
 * higher confidence score wins (highest-confidence-wins resolution).
 */
class HeaderConfidenceEngine {

    static CONFIDENT_THRESHOLD = 0.80;
    static UNCERTAIN_THRESHOLD = 0.55;

    /**
     * Process a list of normalized headers and return confidence-rated mappings.
     * 
     * @param {string[]} normalizedHeaders - Array of normalized header strings.
     * @returns {{
     *   confident: Object,   // semanticType -> { index, rawHeader, confidence, strategy }
     *   uncertain: Object,   // semanticType -> { index, rawHeader, confidence, strategy }
     *   unmatched: Array     // [{ index, rawHeader }] that could not be semantically identified
     * }}
     */
    static evaluate(normalizedHeaders) {
        // Accumulate the best candidate per semantic type
        const candidates = {}; // semanticType -> best candidate so far
        const unmatched = [];

        normalizedHeaders.forEach((normalizedHeader, index) => {
            if (!normalizedHeader) return; // skip empty headers

            const match = HeaderMatcher.match(normalizedHeader);

            if (!match.semanticType || match.confidence < HeaderConfidenceEngine.UNCERTAIN_THRESHOLD) {
                unmatched.push({ index, normalizedHeader });
                return;
            }

            // Keep the highest-confidence candidate per semantic type
            if (
                !candidates[match.semanticType] ||
                match.confidence > candidates[match.semanticType].confidence
            ) {
                candidates[match.semanticType] = {
                    index,
                    normalizedHeader,
                    confidence: match.confidence,
                    strategy: match.strategy
                };
            }
        });

        // Split candidates into confident and uncertain tiers
        const confident = {};
        const uncertain = {};

        for (const [semanticType, candidate] of Object.entries(candidates)) {
            if (candidate.confidence >= HeaderConfidenceEngine.CONFIDENT_THRESHOLD) {
                confident[semanticType] = candidate;
            } else {
                uncertain[semanticType] = candidate;
            }
        }

        return { confident, uncertain, unmatched };
    }
}

module.exports = HeaderConfidenceEngine;
