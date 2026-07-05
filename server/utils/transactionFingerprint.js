const crypto = require('crypto');

/**
 * Generates a deterministic SHA-256 hash (fingerprint) for a transaction.
 * Accommodates field name variations between raw statement transactions (date, description)
 * and persisted Mongoose documents (createdAt, title).
 * 
 * @param {Object} transaction - The transaction object.
 * @returns {string} The SHA-256 hash in hex format.
 */
function generateTransactionFingerprint(transaction) {
    const dateValue = transaction.date || transaction.transactionDate || transaction.createdAt;
    const date = new Date(dateValue);
    const dateStr = isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
    
    const amountStr = Number(transaction.amount || 0).toFixed(2);
    const typeStr = String(transaction.type || '').toLowerCase();
    
    const rawDesc = transaction.description || transaction.title || '';
    const descStr = String(rawDesc)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();

    const normalizedString = `${dateStr}|${amountStr}|${descStr}|${typeStr}`;
    
    return crypto.createHash('sha256').update(normalizedString).digest('hex');
}

module.exports = {
    generateTransactionFingerprint
};
