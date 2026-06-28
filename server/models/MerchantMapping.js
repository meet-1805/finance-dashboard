const mongoose = require('mongoose');

const merchantMappingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rawMerchantText: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['Income', 'Expense'],
        required: true
    },
    confidenceScore: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.7
    },
    usageCount: {
        type: Number,
        default: 1
    },
    lastUsed: {
        type: Date,
        default: Date.now
    }
});

// Ensure compound uniqueness for userId + rawMerchantText
merchantMappingSchema.index({ userId: 1, rawMerchantText: 1 }, { unique: true });

module.exports = mongoose.model('MerchantMapping', merchantMappingSchema);
