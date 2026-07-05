const HeaderNormalizer = require('./HeaderNormalizer');
const HeaderConfidenceEngine = require('./HeaderConfidenceEngine');
const { REQUIRED_SEMANTICS, REQUIRED_ONE_OF } = require('./HeaderDictionary');

/**
 * HeaderMapper
 * 
 * Orchestrates the full header detection pipeline:
 *   HeaderNormalizer → HeaderConfidenceEngine → decision
 * 
 * Given an array of raw CSV headers, it returns either:
 *
 *   Success result (all required semantics detected with confidence):
 *   {
 *     status: 'SUCCESS',
 *     mapping: {
 *       DATE:        { index, normalizedHeader, confidence, strategy },
 *       DESCRIPTION: { index, normalizedHeader, confidence, strategy },
 *       DEBIT:       { index, ... } | null,
 *       CREDIT:      { index, ... } | null,
 *       BALANCE:     { index, ... } | null,
 *       REFERENCE:   { index, ... } | null,
 *     },
 *     detectedHeaders: { [semanticType]: normalizedHeader }
 *   }
 *
 *   Mapping required result (required semantics missing or low-confidence):
 *   {
 *     status: 'MAPPING_REQUIRED',
 *     missingSemantics: ['DATE', ...],
 *     detectedHeaders: { [semanticType]: normalizedHeader },
 *     uncertainHeaders: { [semanticType]: normalizedHeader },
 *     unmatchedHeaders: [{ index, normalizedHeader }]
 *   }
 */
class HeaderMapper {

    /**
     * Analyse raw CSV headers and determine semantic column mappings.
     * @param {string[]} rawHeaders - The raw header strings from the CSV.
     * @returns {Object} A SUCCESS or MAPPING_REQUIRED result object.
     */
    static map(rawHeaders) {
        const normalizedHeaders = HeaderNormalizer.normalizeAll(rawHeaders);
        const { confident, uncertain, unmatched } = HeaderConfidenceEngine.evaluate(normalizedHeaders);

        // Build a summary of what was detected (for client-side display)
        const detectedHeaders = {};
        for (const [type, info] of Object.entries(confident)) {
            detectedHeaders[type] = info.normalizedHeader;
        }
        const uncertainHeaders = {};
        for (const [type, info] of Object.entries(uncertain)) {
            uncertainHeaders[type] = info.normalizedHeader;
        }

        // Check required semantics
        const missingSemantics = [];

        for (const required of REQUIRED_SEMANTICS) {
            if (!confident[required]) {
                missingSemantics.push(required);
            }
        }

        // Check that at least one of DEBIT or CREDIT is confidently mapped
        const hasDebitOrCredit = REQUIRED_ONE_OF.some(type => confident[type]);
        if (!hasDebitOrCredit) {
            // Add whichever are missing
            for (const type of REQUIRED_ONE_OF) {
                if (!confident[type]) missingSemantics.push(type);
            }
        }

        if (missingSemantics.length > 0) {
            return {
                status: 'MAPPING_REQUIRED',
                missingSemantics: [...new Set(missingSemantics)],
                detectedHeaders,
                uncertainHeaders,
                unmatchedHeaders: unmatched
            };
        }

        // All required columns mapped — build the final mapping object
        const mapping = {
            DATE:        confident.DATE        || null,
            DESCRIPTION: confident.DESCRIPTION || null,
            DEBIT:       confident.DEBIT       || null,
            CREDIT:      confident.CREDIT      || null,
            BALANCE:     confident.BALANCE     || null,
            REFERENCE:   confident.REFERENCE   || null
        };

        return {
            status: 'SUCCESS',
            mapping,
            detectedHeaders
        };
    }
}

module.exports = HeaderMapper;
