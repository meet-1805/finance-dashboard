const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const mongoose = require('mongoose');

// @desc    Get all budgets with utilization calculation
// @route   GET /api/budgets
// @access  Private
exports.getBudgets = async (req, res) => {
    try {
        const userId = req.user.id;
        const budgets = await Budget.find({ userId });

        // Get current month date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Fetch all expenses for the user in the current month
        const expenses = await Expense.find({
            userId,
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        // Calculate utilization for each budget
        const budgetsWithUtilization = budgets.map(budget => {
            const categoryExpenses = expenses.filter(
                exp => exp.category.toLowerCase() === budget.category.toLowerCase()
            );

            const amountSpent = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
            const remainingBudget = budget.monthlyLimit - amountSpent;
            const usagePercentage = budget.monthlyLimit > 0 
                ? (amountSpent / budget.monthlyLimit) * 100 
                : 0;

            let status = 'Normal';
            if (usagePercentage > 100) {
                status = 'Exceeded';
            } else if (usagePercentage > 80) {
                status = 'Warning';
            }

            return {
                _id: budget._id,
                category: budget.category,
                monthlyLimit: budget.monthlyLimit,
                amountSpent: amountSpent,
                remainingBudget: remainingBudget,
                usagePercentage: parseFloat(usagePercentage.toFixed(2)),
                status: status,
                createdAt: budget.createdAt
            };
        });

        res.status(200).json(budgetsWithUtilization);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new budget
// @route   POST /api/budgets
// @access  Private
exports.createBudget = async (req, res) => {
    try {
        const { category, monthlyLimit } = req.body;
        const userId = req.user.id;

        // Check if budget for category already exists
        const existingBudget = await Budget.findOne({ 
            userId, 
            category: { $regex: new RegExp(`^${category}$`, 'i') } 
        });

        if (existingBudget) {
            return res.status(400).json({ message: 'Budget for this category already exists' });
        }

        const budget = await Budget.create({
            userId,
            category,
            monthlyLimit
        });

        res.status(201).json(budget);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Budget for this category already exists' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a budget
// @route   PUT /api/budgets/:id
// @access  Private
exports.updateBudget = async (req, res) => {
    try {
        const { monthlyLimit } = req.body;
        
        let budget = await Budget.findById(req.params.id);

        if (!budget) {
            return res.status(404).json({ message: 'Budget not found' });
        }

        // Make sure user owns budget
        if (budget.userId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        budget.monthlyLimit = monthlyLimit;
        await budget.save();

        res.status(200).json(budget);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a budget
// @route   DELETE /api/budgets/:id
// @access  Private
exports.deleteBudget = async (req, res) => {
    try {
        const budget = await Budget.findById(req.params.id);

        if (!budget) {
            return res.status(404).json({ message: 'Budget not found' });
        }

        // Make sure user owns budget
        if (budget.userId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await budget.deleteOne();

        res.status(200).json({ message: 'Budget removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
