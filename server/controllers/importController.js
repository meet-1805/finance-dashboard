const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
const ParserFactory = require('../utils/ParserFactory');
const ImportSession = require('../models/ImportSession');
const duplicateService = require('../services/duplicateService');
const categorizationService = require('../services/categorizationService');
const merchantLearningService = require('../services/merchantLearningService');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const ImportHistory = require('../models/ImportHistory');

// Configure multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // Limit file size to 2MB
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.csv') {
            return cb(new Error('Only CSV files are supported in this phase.'));
        }
        cb(null, true);
    }
});

// Empty handlers skeleton for future phases
// Phase 7 Permanent Import Execution
exports.confirmImport = async (req, res) => {
    const { sessionId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ message: "Invalid session ID format." });
    }

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        // Find import session within transaction
        const importSession = await ImportSession.findOne({
            _id: sessionId,
            userId: req.user.id
        }).session(dbSession);

        if (!importSession) {
            await dbSession.abortTransaction();
            dbSession.endSession();
            return res.status(404).json({ message: "Import session not found or expired." });
        }

        // Update session status to prevent duplicate triggers
        importSession.status = 'IMPORTING';
        await importSession.save({ session: dbSession });

        const importedIncomeIds = [];
        const importedExpenseIds = [];
        let duplicateCount = 0;
        let skippedCount = 0;

        for (const tx of importSession.transactions) {
            // Import rules: approved is true, duplicate is false, finalCategory is present
            const isApproved = tx.approved === true;
            const isNotDuplicate = tx.duplicate === false;
            const hasCategory = tx.finalCategory !== null && tx.finalCategory !== undefined && tx.finalCategory !== '';

            if (isApproved && isNotDuplicate && hasCategory) {
                if (tx.type === 'Income') {
                    const newIncome = new Income({
                        title: tx.description,
                        amount: tx.amount,
                        category: tx.finalCategory,
                        userId: req.user.id,
                        transactionDate: tx.date
                    });
                    await newIncome.save({ session: dbSession });
                    importedIncomeIds.push(newIncome._id);
                } else if (tx.type === 'Expense') {
                    const newExpense = new Expense({
                        title: tx.description,
                        amount: tx.amount,
                        category: tx.finalCategory,
                        userId: req.user.id,
                        transactionDate: tx.date
                    });
                    await newExpense.save({ session: dbSession });
                    importedExpenseIds.push(newExpense._id);
                }
            } else {
                if (tx.duplicate === true) {
                    duplicateCount++;
                } else {
                    skippedCount++;
                }
            }
        }

        // Create ImportHistory record within transaction
        const history = await ImportHistory.create([{
            userId: req.user.id,
            sessionId: importSession._id,
            importedCount: importedIncomeIds.length + importedExpenseIds.length,
            skippedCount: skippedCount,
            duplicateCount: duplicateCount,
            fileType: importSession.fileType,
            parserVersion: importSession.parserVersion,
            startedAt: importSession.uploadedAt,
            completedAt: new Date(),
            status: 'COMPLETED',
            importedIncomeIds,
            importedExpenseIds
        }], { session: dbSession });

        // Delete the temporary ImportSession
        await ImportSession.deleteOne({ _id: sessionId, userId: req.user.id }).session(dbSession);

        // Commit transaction atomic block
        await dbSession.commitTransaction();
        dbSession.endSession();

        res.status(200).json({
            message: "Import executed successfully.",
            summary: {
                totalTransactions: importSession.transactions.length,
                importedCount: importedIncomeIds.length + importedExpenseIds.length,
                skippedCount,
                duplicateCount,
                incomeCount: importedIncomeIds.length,
                expenseCount: importedExpenseIds.length
            },
            historyId: history[0]._id
        });

    } catch (error) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        res.status(500).json({
            message: "Failed to commit transactions to the database. Rollback executed.",
            error: error.message
        });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const history = await ImportHistory.find({ userId: req.user.id }).sort({ completedAt: -1 });
        res.status(200).json(history);
    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve import history.",
            error: error.message
        });
    }
};

exports.getHistoryDetail = async (req, res) => {
    try {
        const { historyId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(historyId)) {
            return res.status(400).json({ message: "Invalid history ID format." });
        }

        const record = await ImportHistory.findOne({
            _id: historyId,
            userId: req.user.id
        });

        if (!record) {
            return res.status(404).json({ message: "Import history record not found." });
        }

        res.status(200).json(record);
    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve import history details.",
            error: error.message
        });
    }
};

exports.rollbackImport = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid history ID format." });
    }

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        const history = await ImportHistory.findOne({
            _id: id,
            userId: req.user.id
        }).session(dbSession);

        if (!history) {
            await dbSession.abortTransaction();
            dbSession.endSession();
            return res.status(404).json({ message: "Import history record not found." });
        }

        if (history.status === 'ROLLED_BACK') {
            await dbSession.abortTransaction();
            dbSession.endSession();
            return res.status(400).json({ message: "This import has already been rolled back." });
        }

        // Delete all imported Income records associated with this import session
        if (history.importedIncomeIds && history.importedIncomeIds.length > 0) {
            await Income.deleteMany(
                { _id: { $in: history.importedIncomeIds }, userId: req.user.id },
                { session: dbSession }
            );
        }

        // Delete all imported Expense records associated with this import session
        if (history.importedExpenseIds && history.importedExpenseIds.length > 0) {
            await Expense.deleteMany(
                { _id: { $in: history.importedExpenseIds }, userId: req.user.id },
                { session: dbSession }
            );
        }

        // Mark history as ROLLED_BACK and record metadata
        history.status = 'ROLLED_BACK';
        history.rolledBackAt = new Date();
        history.rolledBackBy = req.user.id;
        await history.save({ session: dbSession });

        await dbSession.commitTransaction();
        dbSession.endSession();

        res.status(200).json({
            message: "Import rolled back successfully. Associated transactions deleted.",
            history
        });

    } catch (error) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        res.status(500).json({
            message: "Rollback failed. Database remains unchanged.",
            error: error.message
        });
    }
};

// Phase 1 & 2 Upload Handler
exports.uploadMiddleware = upload.single('statement');

exports.uploadStatement = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }

        const ext = path.extname(req.file.originalname);
        const parser = ParserFactory.getParser(ext);

        // parser.parse() now returns a structured result, never a bare array
        const parseResult = await parser.parse(req.file.buffer);

        // If the parser could not confidently identify required columns,
        // forward the mapping payload to the client for user-assisted mapping.
        // HTTP 200 is correct here — the file itself is valid.
        if (parseResult.status === 'MAPPING_REQUIRED') {
            return res.status(200).json({
                status: 'MAPPING_REQUIRED',
                missingSemantics:  parseResult.missingSemantics,
                detectedHeaders:   parseResult.detectedHeaders,
                uncertainHeaders:  parseResult.uncertainHeaders,
                unmatchedHeaders:  parseResult.unmatchedHeaders
            });
        }

        // SUCCESS — extract the normalized transactions array
        const transactions = parseResult.transactions;

        if (transactions.length === 0) {
            return res.status(400).json({ message: "No valid transactions found in statement. Empty sessions cannot be created." });
        }

        // Create the Import Session in the database
        const session = await ImportSession.create({
            userId: req.user.id,
            status: 'READY_FOR_REVIEW',
            fileType: 'CSV',
            parserVersion: parseResult.report?.parserVersion || '3.0.0',
            totalCount: transactions.length,
            transactions: transactions
        });

        res.status(200).json({
            status: 'SUCCESS',
            sessionId: session._id,
            transactionCount: session.transactions.length,
            transactions: session.transactions,
            detectedHeaders: parseResult.detectedHeaders,
            report: parseResult.report || null
        });

    } catch (error) {
        res.status(400).json({
            message: "Failed to parse statement.",
            error: error.message
        });
    }
};


// Phase 2 Get Session Preview Handler
exports.getSessionPreview = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({ message: "Invalid session ID format." });
        }

        const session = await ImportSession.findOne({
            _id: sessionId,
            userId: req.user.id
        });

        if (!session) {
            return res.status(404).json({ message: "Import session not found or expired." });
        }

        res.status(200).json({
            sessionId: session._id,
            transactionCount: session.transactions.length,
            transactions: session.transactions
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve import session.",
            error: error.message
        });
    }
};

// Phase 3 Check Duplicates Handler
exports.checkDuplicates = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({ message: "Invalid session ID format." });
        }

        const session = await ImportSession.findOne({
            _id: sessionId,
            userId: req.user.id
        });

        if (!session) {
            return res.status(404).json({ message: "Import session not found or expired." });
        }

        if (session.transactions.length === 0) {
            return res.status(400).json({ message: "Session contains no transactions." });
        }

        // Perform duplicate detection
        await duplicateService.checkDuplicates(session, req.user.id);

        // Save the updated session transactions to the database
        await session.save();

        res.status(200).json({
            sessionId: session._id,
            transactionCount: session.transactions.length,
            transactions: session.transactions
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to perform duplicate detection.",
            error: error.message
        });
    }
};

// Phase 4 Categorize Session Handler
exports.categorizeSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({ message: "Invalid session ID format." });
        }

        const session = await ImportSession.findOne({
            _id: sessionId,
            userId: req.user.id
        });

        if (!session) {
            return res.status(404).json({ message: "Import session not found or expired." });
        }

        if (session.transactions.length === 0) {
            return res.status(400).json({ message: "Session contains no transactions." });
        }

        // Perform automatic categorization
        await categorizationService.categorizeSession(session, req.user.id);

        // Save the updated session transactions to the database
        await session.save();

        res.status(200).json({
            sessionId: session._id,
            transactionCount: session.transactions.length,
            transactions: session.transactions
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to perform automatic categorization.",
            error: error.message
        });
    }
};

// Phase 5 Learn Merchants Handler
exports.learnMerchants = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { transactions } = req.body;

        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({ message: "Invalid session ID format." });
        }

        const session = await ImportSession.findOne({
            _id: sessionId,
            userId: req.user.id
        });

        if (!session) {
            return res.status(404).json({ message: "Import session not found or expired." });
        }

        if (!transactions || !Array.isArray(transactions)) {
            return res.status(400).json({ message: "Reviewed transactions array is required." });
        }

        // Process merchant learning rules
        await merchantLearningService.learnFromReviewedTransactions(session, transactions, req.user.id);

        res.status(200).json({
            message: "Merchant learning completed successfully for confirmed transactions."
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to run merchant learning engine.",
            error: error.message
        });
    }
};

// Phase 6 Review Session Handler
exports.reviewSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { transactions } = req.body;

        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({ message: "Invalid session ID format." });
        }

        const session = await ImportSession.findOne({
            _id: sessionId,
            userId: req.user.id
        });

        if (!session) {
            return res.status(404).json({ message: "Import session not found or expired." });
        }

        if (!transactions || !Array.isArray(transactions)) {
            return res.status(400).json({ message: "Transactions review array is required." });
        }

        // Validate duplicates in incoming sessionTransactionIds to reject duplicate records in request body
        const seenIds = new Set();

        for (const review of transactions) {
            const { sessionTransactionId, approved, finalCategory } = review;

            if (!mongoose.Types.ObjectId.isValid(sessionTransactionId)) {
                return res.status(400).json({ message: `Invalid transaction ID format: ${sessionTransactionId}` });
            }

            if (seenIds.has(sessionTransactionId)) {
                return res.status(400).json({ message: `Duplicate transaction ID in review request: ${sessionTransactionId}` });
            }
            seenIds.add(sessionTransactionId);

            // Find matching transaction in session subdocument
            const sessionTx = session.transactions.id(sessionTransactionId);
            if (!sessionTx) {
                return res.status(400).json({ message: `Transaction not found in session: ${sessionTransactionId}` });
            }

            const isApproved = approved !== false; // defaults to true if not explicitly false

            if (isApproved && (!finalCategory || typeof finalCategory !== 'string' || finalCategory.trim() === '')) {
                return res.status(400).json({ message: `A valid category is required for approved transaction: ${sessionTransactionId}` });
            }

            // Store decision inside ImportSession
            sessionTx.approved = isApproved;
            sessionTx.finalCategory = isApproved ? finalCategory.trim() : null;
            sessionTx.reviewedAt = new Date();
            sessionTx.reviewedBy = req.user.id;
        }

        // Save session changes
        await session.save();

        res.status(200).json({
            sessionId: session._id,
            transactionCount: session.transactions.length,
            transactions: session.transactions
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to save session review choices.",
            error: error.message
        });
    }
};
