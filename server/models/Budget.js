const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true
    },
    monthlyLimit: {
        type: Number,
        required: [true, 'Monthly limit is required'],
        min: [0, 'Monthly limit cannot be negative']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure a user can only have one budget per category
budgetSchema.index({ userId: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
