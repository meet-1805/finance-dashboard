const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const mongoose = require('mongoose');

const PREDEFINED_CATEGORIES = [
    'Food', 'Travel', 'Shopping', 'Entertainment', 'Medical', 
    'Education', 'Bills', 'Rent', 'Utilities', 'Other'
];

// @desc    Get all unique categories (predefined + user custom)
// @route   GET /api/budgets/categories
// @access  Private
exports.getCategories = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find all distinct categories created by the user in their budgets
        const userBudgets = await Budget.find({ userId }).select('category');
        const userCategories = userBudgets.map(b => b.category);

        // Combine predefined and user categories
        const combined = [...PREDEFINED_CATEGORIES, ...userCategories];

        // Deduplicate (case-insensitive) and sort
        const uniqueCategoriesMap = new Map();
        combined.forEach(cat => {
            const lower = cat.trim().toLowerCase();
            if (!uniqueCategoriesMap.has(lower)) {
                // Keep the original casing of the first encountered string
                uniqueCategoriesMap.set(lower, cat.trim());
            }
        });

        const finalCategories = Array.from(uniqueCategoriesMap.values()).sort((a, b) => a.localeCompare(b));

        res.status(200).json(finalCategories);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all budgets with utilization calculation
// @route   GET /api/budgets
// @access  Private
exports.getBudgets = async (req, res) => {
    try {
        const { getUTCMonthBoundaries } = require('../utils/dateUtils');
        const userId = req.user.id;
        const budgets = await Budget.find({ userId });

        const { month, year } = req.query;
        let startOfMonth, endOfMonth;

        if (month !== undefined || year !== undefined) {
            const boundaries = getUTCMonthBoundaries(month, year);
            if (!boundaries) {
                return res.status(400).json({ message: "Invalid month or year parameters" });
            }
            startOfMonth = boundaries.startOfPeriod;
            endOfMonth = boundaries.endOfPeriod;
        } else {
            // Default current month utilization if no parameters are supplied
            const now = new Date();
            startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
            endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
        }

        // Fetch all expenses for the user in the selected month
        const expenses = await Expense.find({
            userId,
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });

        // Calculate utilization for each budget
        const budgetsWithUtilization = budgets.map(budget => {
            const categoryExpenses = expenses.filter(
                exp => exp.category.toLowerCase() === budget.category.toLowerCase()
            );

            const effectiveLimit = month === 'all' ? budget.monthlyLimit * 12 : budget.monthlyLimit;
            const amountSpent = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
            const remainingBudget = effectiveLimit - amountSpent;
            const usagePercentage = effectiveLimit > 0 
                ? (amountSpent / effectiveLimit) * 100 
                : 0;

            let status = 'Normal';
            if (usagePercentage >= 100) {
                status = 'Over Budget';
            } else if (usagePercentage >= 80) {
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
