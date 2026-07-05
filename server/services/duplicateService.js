const Income = require('../models/Income');
const Expense = require('../models/Expense');
const { generateTransactionFingerprint } = require('../utils/transactionFingerprint');

/**
 * Scans transactions in an ImportSession and flags exact duplicates against existing records.
 * Updates the session's transactions in place.
 * 
 * @param {Object} session - The ImportSession Mongoose document.
 * @param {string} userId - The authenticated user's ID.
 */
async function checkDuplicates(session, userId) {
    // 1. Fetch all existing Income and Expense records for this user
    const [incomes, expenses] = await Promise.all([
        Income.find({ userId }),
        Expense.find({ userId })
    ]);

    // 2. Generate fingerprints for existing database entries
    const existingFingerprints = new Map(); // maps fingerprint -> { id, collection }

    incomes.forEach(income => {
        // Explicitly set type as it's not stored in the Income collection
        const item = { ...income.toObject(), type: 'Income' };
        const fp = generateTransactionFingerprint(item);
        existingFingerprints.set(fp, { id: income._id, collection: 'Income' });
    });

    expenses.forEach(expense => {
        // Explicitly set type as it's not stored in the Expense collection
        const item = { ...expense.toObject(), type: 'Expense' };
        const fp = generateTransactionFingerprint(item);
        existingFingerprints.set(fp, { id: expense._id, collection: 'Expense' });
    });

    // 3. Match session transactions against existing fingerprints
    session.transactions.forEach(transaction => {
        const fingerprint = generateTransactionFingerprint(transaction);
        transaction.fingerprint = fingerprint;

        if (existingFingerprints.has(fingerprint)) {
            const match = existingFingerprints.get(fingerprint);
            transaction.duplicate = true;
            transaction.duplicateStatus = 'EXACT';
            transaction.duplicateType = 'EXACT';
            transaction.matchedCollection = match.collection;
            transaction.matchedRecordId = match.id;
        } else {
            transaction.duplicate = false;
            transaction.duplicateStatus = 'NONE';
            transaction.duplicateType = 'NONE';
            transaction.matchedCollection = undefined;
            transaction.matchedRecordId = undefined;
        }
    });
}

module.exports = {
    checkDuplicates
};
