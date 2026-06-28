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
        enum: ['PROCESSING', 'REVIEWING', 'COMPLETED'],
        default: 'PROCESSING'
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
