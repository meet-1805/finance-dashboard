/**
 * Normalizes a merchant name by removing payment prefixes, special characters, and extra spaces.
 * @param {string} description - The raw transaction description.
 * @returns {string} The normalized merchant name.
 */
function normalizeMerchantName(description) {
    if (!description) return '';
    
    let cleaned = String(description).toLowerCase();
    
    // Remove common payment prefixes with optional slashes, dashes, and spaces
    cleaned = cleaned.replace(/^(upi|imps|neft|rtgs|pos|card|eft|chg|atm)[\s\-/|]*\s*/i, '');
    
    // Remove special characters (keep spaces and alphanumeric characters)
    cleaned = cleaned.replace(/[^a-z0-9\s]/g, '');
    
    // Collapse multiple spaces to a single space, and trim
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
}

module.exports = {
    normalizeMerchantName
};
