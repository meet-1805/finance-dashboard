const mongoose = require('mongoose');

const importSessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 1800 // Automatically delete after 30 minutes (TTL index)
    },
    status: {
        type: String,
        enum: ['READY_FOR_REVIEW', 'IMPORTING', 'COMPLETED', 'FAILED'],
        default: 'READY_FOR_REVIEW'
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    fileType: {
        type: String,
        enum: ['CSV', 'EXCEL', 'PDF'],
        required: true
    },
    parserVersion: {
        type: String,
        default: '1.0.0'
    },
    totalCount: {
        type: Number,
        required: true
    },
    transactions: [{
        date: {
            type: Date,
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['Income', 'Expense'],
            required: true
        },
        suggestedCategory: String,
        confidenceScore: Number,
        duplicateStatus: {
            type: String,
            enum: ['NONE', 'EXACT', 'POTENTIAL'],
            default: 'NONE'
        },
        userResolvedCategory: String
    }]
});

module.exports = mongoose.model('ImportSession', importSessionSchema);
