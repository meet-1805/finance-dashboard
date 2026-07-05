const { HEADER_DICTIONARY } = require('./HeaderDictionary');

/**
 * HeaderMatcher
 * 
 * Implements a multi-layered matching strategy to identify the semantic type
 * of a normalized CSV header string. Three strategies are applied in order of
 * confidence:
 * 
 *   Layer 1 — Exact synonym match      (confidence: 1.0)
 *   Layer 2 — Contains / partial match (confidence: 0.80)
 *   Layer 3 — Fuzzy similarity match   (confidence: 0.55–0.75, based on similarity)
 * 
 * The highest-confidence match across all semantic types is returned.
 */
class HeaderMatcher {

    /**
     * Attempt to match a normalized header against the dictionary.
     * @param {string} normalizedHeader - The already-normalized header string.
     * @returns {{ semanticType: string|null, confidence: number, strategy: string }}
     */
    static match(normalizedHeader) {
        let bestMatch = { semanticType: null, confidence: 0, strategy: 'none' };

        for (const [semanticType, synonyms] of Object.entries(HEADER_DICTIONARY)) {

            // --- Layer 1: Exact match ---
            if (synonyms.includes(normalizedHeader)) {
                return { semanticType, confidence: 1.0, strategy: 'exact' };
            }

            // --- Layer 2: Contains / partial match ---
            // Header contains a synonym OR a synonym contains the header
            for (const synonym of synonyms) {
                if (normalizedHeader.includes(synonym) || synonym.includes(normalizedHeader)) {
                    const candidate = { semanticType, confidence: 0.80, strategy: 'contains' };
                    if (candidate.confidence > bestMatch.confidence) {
                        bestMatch = candidate;
                    }
                    break;
                }
            }

            // --- Layer 3: Fuzzy similarity match ---
            for (const synonym of synonyms) {
                const similarity = HeaderMatcher._jaccardSimilarity(normalizedHeader, synonym);
                if (similarity >= 0.55) {
                    // Scale confidence linearly from 0.55 to 0.75 across similarity 0.55–1.0
                    const confidence = 0.55 + (similarity - 0.55) * (0.75 - 0.55) / (1.0 - 0.55);
                    if (confidence > bestMatch.confidence) {
                        bestMatch = { semanticType, confidence: parseFloat(confidence.toFixed(4)), strategy: 'fuzzy' };
                    }
                }
            }
        }

        return bestMatch;
    }

    /**
     * Compute the Jaccard similarity between two strings based on bigrams.
     * Jaccard = |intersection| / |union|
     * @param {string} a
     * @param {string} b
     * @returns {number} Similarity score between 0 and 1.
     */
    static _jaccardSimilarity(a, b) {
        if (!a || !b) return 0;
        const bigramsA = HeaderMatcher._getBigrams(a);
        const bigramsB = HeaderMatcher._getBigrams(b);

        if (bigramsA.size === 0 && bigramsB.size === 0) return 1;
        if (bigramsA.size === 0 || bigramsB.size === 0) return 0;

        let intersection = 0;
        for (const bigram of bigramsA) {
            if (bigramsB.has(bigram)) intersection++;
        }

        const union = bigramsA.size + bigramsB.size - intersection;
        return intersection / union;
    }

    /**
     * Generate a Set of character bigrams for a string.
     * @param {string} str
     * @returns {Set<string>}
     */
    static _getBigrams(str) {
        const bigrams = new Set();
        const padded = ` ${str} `;
        for (let i = 0; i < padded.length - 1; i++) {
            bigrams.add(padded.slice(i, i + 2));
        }
        return bigrams;
    }
}

module.exports = HeaderMatcher;
