const MerchantMapping = require('../models/MerchantMapping');
const Expense = require('../models/Expense');
const Income = require('../models/Income');

// 1. MerchantRuleEngine
class MerchantRuleEngine {
    static async match(description, userId, type) {
        const cleanedText = description.trim().toLowerCase();
        const mapping = await MerchantMapping.findOne({
            userId,
            rawMerchantText: cleanedText,
            type
        });
        if (mapping) {
            return {
                category: mapping.category,
                confidence: mapping.confidenceScore || 0.95
            };
        }
        return null;
    }
}

// 2. KeywordRuleEngine
class KeywordRuleEngine {
    static match(description) {
        const text = description.toLowerCase();
        
        const rules = [
            { keywords: ['uber', 'lyft', 'taxi', 'cab', 'metro', 'train', 'fuel', 'petrol', 'transport'], category: 'Transport', confidence: 0.75 },
            { keywords: ['walmart', 'grocery', 'supermarket', 'mart', 'food', 'restaurant', 'cafe', 'swiggy', 'zomato'], category: 'Food', confidence: 0.75 },
            { keywords: ['netflix', 'spotify', 'hulu', 'steam', 'game', 'cinema', 'movie'], category: 'Entertainment', confidence: 0.75 },
            { keywords: ['electric', 'water', 'gas', 'internet', 'bill', 'wifi', 'power', 'telecom'], category: 'Utilities', confidence: 0.75 },
            { keywords: ['rent', 'lease', 'mortgage', 'housing'], category: 'Housing', confidence: 0.75 },
            { keywords: ['salary', 'wage', 'paycheck', 'bonus'], category: 'Salary', confidence: 0.75 }
        ];

        for (const rule of rules) {
            if (rule.keywords.some(keyword => text.includes(keyword))) {
                return {
                    category: rule.category,
                    confidence: rule.confidence
                };
            }
        }
        return null;
    }
}

// 3. UserHistoryEngine
class UserHistoryEngine {
    static async match(description, userId, type) {
        const cleanDesc = description.trim().toLowerCase();
        
        if (type === 'Expense') {
            const historicalRecord = await Expense.findOne({
                userId,
                title: { $regex: new RegExp('^' + cleanDesc + '$', 'i') }
            }).sort({ createdAt: -1 }); // Get the latest one

            if (historicalRecord) {
                return {
                    category: historicalRecord.category,
                    confidence: 0.85
                };
            }
        } else {
            const historicalRecord = await Income.findOne({
                userId,
                title: { $regex: new RegExp('^' + cleanDesc + '$', 'i') }
            }).sort({ createdAt: -1 });

            if (historicalRecord) {
                return {
                    category: historicalRecord.category,
                    confidence: 0.85
                };
            }
        }
        return null;
    }
}

// 4. ConfidenceCalculator & Main Orchestrator
class CategorizationService {
    static async categorizeTransaction(transaction, userId) {
        const { description, type } = transaction;

        // Step 1: Try MerchantMapping (highest precedence)
        const merchantMatch = await MerchantRuleEngine.match(description, userId, type);
        if (merchantMatch) {
            return {
                suggestedCategory: merchantMatch.category,
                confidence: merchantMatch.confidence,
                categoryStatus: this.getStatusByConfidence(merchantMatch.confidence),
                categorizationSource: 'MERCHANT_MAPPING'
            };
        }

        // Step 2: Try User History (medium precedence)
        const historyMatch = await UserHistoryEngine.match(description, userId, type);
        if (historyMatch) {
            return {
                suggestedCategory: historyMatch.category,
                confidence: historyMatch.confidence,
                categoryStatus: this.getStatusByConfidence(historyMatch.confidence),
                categorizationSource: 'USER_HISTORY'
            };
        }

        // Step 3: Try Keyword rules (lower precedence)
        const keywordMatch = KeywordRuleEngine.match(description);
        if (keywordMatch) {
            return {
                suggestedCategory: keywordMatch.category,
                confidence: keywordMatch.confidence,
                categoryStatus: this.getStatusByConfidence(keywordMatch.confidence),
                categorizationSource: 'KEYWORD'
            };
        }

        // Step 4: Fallback to Unknown
        return {
            suggestedCategory: null,
            confidence: 0.0,
            categoryStatus: 'UNKNOWN',
            categorizationSource: 'UNKNOWN'
        };
    }

    static getStatusByConfidence(confidence) {
        if (confidence >= 0.90) return 'AUTO';
        if (confidence >= 0.60) return 'REVIEW';
        return 'UNKNOWN';
    }

    static async categorizeSession(session, userId) {
        for (const transaction of session.transactions) {
            // Process only non-duplicate transactions
            if (!transaction.duplicate) {
                const result = await this.categorizeTransaction(transaction, userId);
                transaction.suggestedCategory = result.suggestedCategory;
                transaction.confidence = result.confidence;
                transaction.confidenceScore = result.confidence; // populate both for schema safety
                transaction.categoryStatus = result.categoryStatus;
                transaction.categorizationSource = result.categorizationSource;
            }
        }
    }
}

module.exports = CategorizationService;
