const mongoose = require('mongoose');

const importHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fileType: {
        type: String,
        enum: ['CSV', 'EXCEL', 'PDF'],
        required: true
    },
    anonymizedName: {
        type: String,
        required: true
    },
    importDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['COMPLETED', 'ROLLED_BACK'],
        default: 'COMPLETED'
    },
    summary: {
        totalTransactions: Number,
        importedCount: Number,
        duplicateCount: Number,
        incomeCount: Number,
        expenseCount: Number,
        manualReviewCount: Number
    }
});

// Index for fast lookup by user and sorted by date
importHistorySchema.index({ userId: 1, importDate: -1 });

module.exports = mongoose.model('ImportHistory', importHistorySchema);
