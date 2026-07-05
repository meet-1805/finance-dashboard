'use strict';

const MerchantMapping = require('../models/MerchantMapping');
const Expense         = require('../models/Expense');
const Income          = require('../models/Income');
const { normalizeMerchantName } = require('../utils/merchantNormalizer');

// ─────────────────────────────────────────────────────────────────────────────
// CategorizationContext
//
// Immutable in-memory data structure built from one bulk preload.
// Holds three optimised lookup Maps so every categorization engine
// can run without touching the database.
//
//  merchantMap       — normalizedMerchant|type  → MerchantMapping doc
//  incomeHistoryMap  — title.toLowerCase()      → latest Income doc
//  expenseHistoryMap — title.toLowerCase()      → latest Expense doc
//
// The Maps are built once per session and reused across all transactions.
// ─────────────────────────────────────────────────────────────────────────────
class CategorizationContext {
    /**
     * @param {Map} merchantMap
     * @param {Map} incomeHistoryMap
     * @param {Map} expenseHistoryMap
     */
    constructor(merchantMap, incomeHistoryMap, expenseHistoryMap) {
        this.merchantMap       = merchantMap;
        this.incomeHistoryMap  = incomeHistoryMap;
        this.expenseHistoryMap = expenseHistoryMap;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MerchantRuleEngine  — PURE IN-MEMORY, no database access
//
// Looks up a normalised merchant name in the pre-loaded merchantMap.
// ─────────────────────────────────────────────────────────────────────────────
class MerchantRuleEngine {
    /**
     * @param {string}               description - Raw transaction description.
     * @param {string}               type        - 'Income' | 'Expense'
     * @param {CategorizationContext} context
     * @returns {{ category: string, confidence: number } | null}
     */
    static match(description, type, context) {
        const normalized = normalizeMerchantName(description);
        const key        = `${normalized}|${type}`;
        const mapping    = context.merchantMap.get(key);

        if (mapping) {
            return {
                category:   mapping.category,
                confidence: mapping.confidenceScore || 0.95
            };
        }
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// KeywordRuleEngine  — PURE IN-MEMORY (was already pure, no change)
// ─────────────────────────────────────────────────────────────────────────────
class KeywordRuleEngine {
    static RULES = [
        { keywords: ['uber', 'lyft', 'taxi', 'cab', 'metro', 'train', 'fuel', 'petrol', 'transport'], category: 'Transport',     confidence: 0.75 },
        { keywords: ['walmart', 'grocery', 'supermarket', 'mart', 'food', 'restaurant', 'cafe', 'swiggy', 'zomato'],              category: 'Food',          confidence: 0.75 },
        { keywords: ['netflix', 'spotify', 'hulu', 'steam', 'game', 'cinema', 'movie'],               category: 'Entertainment', confidence: 0.75 },
        { keywords: ['electric', 'water', 'gas', 'internet', 'bill', 'wifi', 'power', 'telecom'],     category: 'Utilities',     confidence: 0.75 },
        { keywords: ['rent', 'lease', 'mortgage', 'housing'],                                          category: 'Housing',       confidence: 0.75 },
        { keywords: ['salary', 'wage', 'paycheck', 'bonus'],                                           category: 'Salary',        confidence: 0.75 }
    ];

    /**
     * @param {string} description
     * @returns {{ category: string, confidence: number } | null}
     */
    static match(description) {
        const text = description.toLowerCase();
        for (const rule of KeywordRuleEngine.RULES) {
            if (rule.keywords.some(kw => text.includes(kw))) {
                return { category: rule.category, confidence: rule.confidence };
            }
        }
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// UserHistoryEngine  — PURE IN-MEMORY, no database access
//
// Looks up the transaction description in the pre-loaded income/expense history
// Maps to find the most recent matching user record.
// ─────────────────────────────────────────────────────────────────────────────
class UserHistoryEngine {
    /**
     * @param {string}               description
     * @param {string}               type        - 'Income' | 'Expense'
     * @param {CategorizationContext} context
     * @returns {{ category: string, confidence: number } | null}
     */
    static match(description, type, context) {
        const key    = description.trim().toLowerCase();
        const map    = type === 'Expense' ? context.expenseHistoryMap : context.incomeHistoryMap;
        const record = map.get(key);

        if (record) {
            return { category: record.category, confidence: 0.85 };
        }
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CategorizationService  — Main orchestrator
// ─────────────────────────────────────────────────────────────────────────────
class CategorizationService {

    // ── Confidence → status mapping (unchanged) ───────────────────────────────
    static getStatusByConfidence(confidence) {
        if (confidence >= 0.90) return 'AUTO';
        if (confidence >= 0.60) return 'REVIEW';
        return 'UNKNOWN';
    }

    // ── Bulk preload — exactly 3 MongoDB queries via Promise.all ──────────────
    /**
     * Fetches all data needed for categorization in a single parallel round-trip
     * and returns an immutable CategorizationContext for in-memory lookups.
     *
     * DB queries issued: exactly 3 (regardless of transaction count).
     *
     * @param {string|ObjectId} userId
     * @returns {Promise<CategorizationContext>}
     */
    static async buildContext(userId) {
        // Single parallel round-trip — 3 queries, zero serial waits
        const [merchantMappings, incomeHistory, expenseHistory] = await Promise.all([
            MerchantMapping.find({ userId }),
            Income.find({ userId }).sort({ transactionDate: -1 }),
            Expense.find({ userId }).sort({ transactionDate: -1 })
        ]);

        // merchantMap: normalizedMerchant|type → mapping doc
        // Multiple rules for same merchant are resolved by last-write-wins;
        // in practice each normalizedMerchant+type pair is unique.
        const merchantMap = new Map();
        for (const m of merchantMappings) {
            merchantMap.set(`${m.normalizedMerchant}|${m.type}`, m);
        }

        // incomeHistoryMap: title.toLowerCase() → latest Income doc
        // Results are already sorted descending by transactionDate,
        // so the first time we see a title it is the most recent record.
        const incomeHistoryMap = new Map();
        for (const record of incomeHistory) {
            const key = record.title.toLowerCase();
            if (!incomeHistoryMap.has(key)) {
                incomeHistoryMap.set(key, record);
            }
        }

        // expenseHistoryMap: title.toLowerCase() → latest Expense doc
        const expenseHistoryMap = new Map();
        for (const record of expenseHistory) {
            const key = record.title.toLowerCase();
            if (!expenseHistoryMap.has(key)) {
                expenseHistoryMap.set(key, record);
            }
        }

        return new CategorizationContext(merchantMap, incomeHistoryMap, expenseHistoryMap);
    }

    // ── Pure in-memory single-transaction categorization (synchronous) ────────
    /**
     * Categorizes a single transaction using pre-loaded context.
     * Performs ZERO database queries — only Map lookups, string ops, keyword checks.
     *
     * Precedence (unchanged from original):
     *   1. MerchantMapping  (confidence 0.95, source: MERCHANT_MAPPING)
     *   2. User History     (confidence 0.85, source: USER_HISTORY)
     *   3. Keyword rules    (confidence 0.75, source: KEYWORD)
     *   4. Unknown fallback (confidence 0.00, source: UNKNOWN)
     *
     * @param {Object}               transaction
     * @param {CategorizationContext} context
     * @returns {{ suggestedCategory, confidence, categoryStatus, categorizationSource }}
     */
    static categorizeTransaction(transaction, context) {
        const { description, type } = transaction;

        // Step 1: Merchant Mapping (highest precedence)
        const merchantMatch = MerchantRuleEngine.match(description, type, context);
        if (merchantMatch) {
            return {
                suggestedCategory:    merchantMatch.category,
                confidence:           merchantMatch.confidence,
                categoryStatus:       this.getStatusByConfidence(merchantMatch.confidence),
                categorizationSource: 'MERCHANT_MAPPING'
            };
        }

        // Step 2: User History (medium precedence)
        const historyMatch = UserHistoryEngine.match(description, type, context);
        if (historyMatch) {
            return {
                suggestedCategory:    historyMatch.category,
                confidence:           historyMatch.confidence,
                categoryStatus:       this.getStatusByConfidence(historyMatch.confidence),
                categorizationSource: 'USER_HISTORY'
            };
        }

        // Step 3: Keyword rules (lower precedence)
        const keywordMatch = KeywordRuleEngine.match(description);
        if (keywordMatch) {
            return {
                suggestedCategory:    keywordMatch.category,
                confidence:           keywordMatch.confidence,
                categoryStatus:       this.getStatusByConfidence(keywordMatch.confidence),
                categorizationSource: 'KEYWORD'
            };
        }

        // Step 4: Unknown fallback
        return {
            suggestedCategory:    null,
            confidence:           0.0,
            categoryStatus:       'UNKNOWN',
            categorizationSource: 'UNKNOWN'
        };
    }

    // ── Session categorization entry point ────────────────────────────────────
    /**
     * Categorizes all non-duplicate transactions in a session.
     *
     * Query profile:
     *   - 3 queries total (in buildContext) — O(1) regardless of session size
     *   - 0 queries inside the loop
     *
     * @param {Object}        session - ImportSession Mongoose document (mutated in place)
     * @param {string|ObjectId} userId
     */
    static async categorizeSession(session, userId) {
        // ONE bulk preload — 3 queries total, executed in parallel
        const context = await CategorizationService.buildContext(userId);

        // Pure in-memory loop — zero additional database queries
        for (const transaction of session.transactions) {
            if (!transaction.duplicate) {
                const result = CategorizationService.categorizeTransaction(transaction, context);

                transaction.suggestedCategory    = result.suggestedCategory;
                transaction.confidence           = result.confidence;
                transaction.confidenceScore      = result.confidence; // both fields for schema safety
                transaction.categoryStatus       = result.categoryStatus;
                transaction.categorizationSource = result.categorizationSource;
            }
        }
        // session.save() is called by the controller after this returns — not here
    }
}

module.exports = CategorizationService;
