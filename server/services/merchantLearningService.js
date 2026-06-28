const MerchantMapping = require('../models/MerchantMapping');
const { normalizeMerchantName } = require('../utils/merchantNormalizer');

/**
 * Processes reviewed transactions from an import session and updates merchant learning rules.
 * 
 * @param {Object} session - The ImportSession document.
 * @param {Array<Object>} reviewedTransactions - Transactions submitted by the user.
 * @param {string} userId - The authenticated user's ID.
 */
async function learnFromReviewedTransactions(session, reviewedTransactions, userId) {
    if (!reviewedTransactions || !Array.isArray(reviewedTransactions)) {
        return;
    }

    for (const reviewedTx of reviewedTransactions) {
        // Find matching transaction in the session to get reliable schema fields (type, duplicate, categoryStatus)
        const sessionTx = session.transactions.find(tx => 
            tx.description === reviewedTx.description || 
            normalizeMerchantName(tx.description) === normalizeMerchantName(reviewedTx.description)
        );

        if (!sessionTx) {
            continue; // Skip if transaction doesn't match session records
        }

        // Apply Learning Rules
        const isConfirmed = reviewedTx.confirmed === true;
        const isNotDuplicate = sessionTx.duplicate === false;
        const hasCategory = reviewedTx.finalCategory !== null && reviewedTx.finalCategory !== undefined && reviewedTx.finalCategory !== '';
        const isNotUnknown = sessionTx.categoryStatus !== 'UNKNOWN';

        if (isConfirmed && isNotDuplicate && hasCategory && isNotUnknown) {
            const normalized = normalizeMerchantName(sessionTx.description);
            const category = reviewedTx.finalCategory;
            const type = sessionTx.type;

            // Check if mapping already exists
            const existingMapping = await MerchantMapping.findOne({
                userId,
                normalizedMerchant: normalized,
                type
            });

            if (existingMapping) {
                // Update mapping
                existingMapping.category = category;
                existingMapping.lastUsed = new Date();
                existingMapping.usageCount += 1;
                await existingMapping.save();
            } else {
                // Create new mapping
                await MerchantMapping.create({
                    userId,
                    normalizedMerchant: normalized,
                    originalMerchant: sessionTx.description,
                    category,
                    type,
                    usageCount: 1,
                    lastUsed: new Date(),
                    confidenceScore: 0.70
                });
            }
        }
    }
}

module.exports = {
    learnFromReviewedTransactions
};
