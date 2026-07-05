const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({

  title: {
    type: String,
    required: true,
    trim: true
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  category: {
    type: String,
    required: true,
    trim: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  transactionDate: {
    type: Date,
    required: true,
    default: Date.now
  }

}, {
  timestamps: true
});

module.exports = mongoose.model(
  "Expense",
  expenseSchema
);
