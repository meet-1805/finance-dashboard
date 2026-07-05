'use strict';
/**
 * Benchmark: Before vs After categorizationService refactor.
 * Run: node profile_import.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/finance';

const MerchantMapping  = require('./models/MerchantMapping');
const Income           = require('./models/Income');
const Expense          = require('./models/Expense');
const { normalizeMerchantName }        = require('./utils/merchantNormalizer');
const { generateTransactionFingerprint } = require('./utils/transactionFingerprint');
const CategorizationService            = require('./services/categorizationService');

// ── Query counter ─────────────────────────────────────────────────────────────
let queryCount = 0;
const queryLog = [];
const origExec = mongoose.Query.prototype.exec;
mongoose.Query.prototype.exec = async function (...a) {
    queryCount++;
    queryLog.push(this.getQuery ? JSON.stringify(this.getQuery()).slice(0, 80) : '?');
    return origExec.apply(this, a);
};

// ── 30 synthetic transactions ─────────────────────────────────────────────────
const N = 30;
const DESC = [
    'NEFT/CR/Salary','POS SWIGGY FOODS','ATM WDL','GROCERY MART','AMAZON RETAIL',
    'NETFLIX SUBSCRIPTION','ELECTRICITY BILL','UPI ZOMATO','FUEL STATION','RENT PAYMENT',
    'FREELANCE PAYMENT','INSURANCE PREMIUM','UBER RIDE','TRAIN TICKET','SPOTIFY PREMIUM',
    'INTERNET BILL','MOBILE RECHARGE','MEDICAL STORE','CLOTHING STORE','RESTAURANT BILL',
    'COFFEE SHOP','BOOK PURCHASE','GYM MEMBERSHIP','MUTUAL FUND SIP','DIVIDEND CREDIT',
    'BANK CHARGE','SALARY BONUS','TAX REFUND','INTEREST CREDIT','WATER BILL'
];
const makeTxns = () => DESC.slice(0, N).map((d, i) => ({
    description: d,
    type: i % 2 === 0 ? 'Income' : 'Expense',
    amount: 1000 + i * 100,
    date: new Date(),
    duplicate: false
}));

function resetQueries() { queryCount = 0; queryLog.length = 0; }
function snap() { return queryCount; }

async function main() {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected\n');

    const anyIncome = await Income.findOne();
    const userId = anyIncome?.userId || new mongoose.Types.ObjectId();
    resetQueries(); // don't count the findOne above

    console.log(`userId: ${userId}  |  transactions: ${N}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 1 — Duplicate Detection (unchanged, verify still 2 queries)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('STAGE 1 — Duplicate Detection');
    console.log('───────────────────────────────────────────────────────────────');
    const q_dup_before = snap();
    console.time('  duplicate detection');

    const [incomes, expenses] = await Promise.all([
        Income.find({ userId }),
        Expense.find({ userId })
    ]);
    const fpMap = new Map();
    incomes.forEach(r  => fpMap.set(generateTransactionFingerprint({ ...r.toObject(), type: 'Income'  }), true));
    expenses.forEach(r => fpMap.set(generateTransactionFingerprint({ ...r.toObject(), type: 'Expense' }), true));
    makeTxns().forEach(tx => generateTransactionFingerprint(tx));

    console.timeEnd('  duplicate detection');
    const q_dup = snap() - q_dup_before;
    console.log(`  Queries: ${q_dup}  (expected: 2)\n`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 2A — Categorization BEFORE (simulate N+1 with old approach)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('STAGE 2A — Categorization BEFORE refactor (N+1 simulation)');
    console.log('───────────────────────────────────────────────────────────────');
    const txnsBefore = makeTxns();
    const q_cat_old_before = snap();
    console.time('  categorization BEFORE');

    for (const tx of txnsBefore) {
        if (tx.duplicate) continue;
        const norm = normalizeMerchantName(tx.description);
        await MerchantMapping.findOne({ userId, normalizedMerchant: norm, type: tx.type });
        if (tx.type === 'Expense') {
            await Expense.findOne({ userId, title: { $regex: new RegExp('^' + tx.description.trim().toLowerCase() + '$', 'i') } }).sort({ transactionDate: -1 });
        } else {
            await Income.findOne({ userId, title: { $regex: new RegExp('^' + tx.description.trim().toLowerCase() + '$', 'i') } }).sort({ transactionDate: -1 });
        }
    }

    console.timeEnd('  categorization BEFORE');
    const q_cat_old = snap() - q_cat_old_before;
    console.log(`  Queries: ${q_cat_old}  (expected: N×2 = ${N * 2})\n`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 2B — Categorization AFTER (new CategorizationService)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('STAGE 2B — Categorization AFTER refactor (bulk preload)');
    console.log('───────────────────────────────────────────────────────────────');

    // Simulate a real session object
    const fakeSession = { transactions: makeTxns() };
    const q_cat_new_before = snap();

    console.time('  buildContext (Promise.all — 3 queries)');
    const context = await CategorizationService.buildContext(userId);
    console.timeEnd('  buildContext (Promise.all — 3 queries)');
    const q_context = snap() - q_cat_new_before;

    console.time('  in-memory categorization loop (0 queries)');
    for (const tx of fakeSession.transactions) {
        if (!tx.duplicate) {
            CategorizationService.categorizeTransaction(tx, context);
        }
    }
    console.timeEnd('  in-memory categorization loop (0 queries)');

    console.time('  TOTAL categorization AFTER');
    console.timeEnd('  TOTAL categorization AFTER');
    const q_cat_new = snap() - q_cat_new_before;
    console.log(`  Queries in buildContext: ${q_context}  (expected: 3)`);
    console.log(`  Queries in loop: ${q_cat_new - q_context}  (expected: 0)`);
    console.log(`  Total queries: ${q_cat_new}  (expected: 3)\n`);

    // ─── Run again with a timer for accurate wall-clock comparison ────────────
    resetQueries();
    const t0_old = Date.now();
    for (const tx of makeTxns()) {
        await MerchantMapping.findOne({ userId, normalizedMerchant: normalizeMerchantName(tx.description), type: tx.type });
        if (tx.type === 'Expense') {
            await Expense.findOne({ userId, title: { $regex: new RegExp('^' + tx.description.trim().toLowerCase() + '$', 'i') } }).sort({ transactionDate: -1 });
        } else {
            await Income.findOne({ userId, title: { $regex: new RegExp('^' + tx.description.trim().toLowerCase() + '$', 'i') } }).sort({ transactionDate: -1 });
        }
    }
    const ms_old = Date.now() - t0_old;
    const q_old_total = queryCount;
    resetQueries();

    const t0_new = Date.now();
    const ctx2 = await CategorizationService.buildContext(userId);
    for (const tx of makeTxns()) CategorizationService.categorizeTransaction(tx, ctx2);
    const ms_new = Date.now() - t0_new;
    const q_new_total = queryCount;

    // ═══════════════════════════════════════════════════════════════════════════
    // FINAL REPORT
    // ═══════════════════════════════════════════════════════════════════════════
    const improvement = (((ms_old - ms_new) / ms_old) * 100).toFixed(1);
    const queryReduction = (((q_old_total - q_new_total) / q_old_total) * 100).toFixed(1);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('BENCHMARK RESULTS — 30 Transactions');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('                         BEFORE       AFTER');
    console.log(`  DB queries             ${String(q_old_total).padStart(6)}      ${String(q_new_total).padStart(6)}`);
    console.log(`  Categorization time    ${String(ms_old + 'ms').padStart(6)}    ${String(ms_new + 'ms').padStart(6)}`);
    console.log(`  Query reduction        ${queryReduction}%`);
    console.log(`  Speed improvement      ${improvement}%`);
    console.log('');
    console.log(`  Scalability: BEFORE = O(N)  |  AFTER = O(1)`);
    console.log('═══════════════════════════════════════════════════════════════');

    await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
