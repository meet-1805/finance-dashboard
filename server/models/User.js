const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: true
    },
    monthlySalary: {
        type: Number,
        default: 0,
        min: 0
    },
    onboardingState: {
        type: String,
        enum: ['PENDING', 'COMPLETED'],
        default: 'PENDING'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);
