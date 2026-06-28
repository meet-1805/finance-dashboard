const mongoose = require('mongoose');

const importHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    importedCount: {
        type: Number,
        required: true,
        default: 0
    },
    skippedCount: {
        type: Number,
        required: true,
        default: 0
    },
    duplicateCount: {
        type: Number,
        required: true,
        default: 0
    },
    fileType: {
        type: String,
        enum: ['CSV', 'EXCEL', 'PDF'],
        required: true
    },
    parserVersion: {
        type: String,
        required: true,
        default: '1.0.0'
    },
    startedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    completedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['COMPLETED', 'ROLLED_BACK'],
        default: 'COMPLETED'
    },
    importedIncomeIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Income'
    }],
    importedExpenseIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Expense'
    }],
    rolledBackAt: Date,
    rolledBackBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

// Index for fast lookup by user and sorted by date
importHistorySchema.index({ userId: 1, completedAt: -1 });

module.exports = mongoose.model('ImportHistory', importHistorySchema);
