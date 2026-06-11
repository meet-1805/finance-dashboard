const Category = require('../models/Category');
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');

const DEFAULT_CATEGORIES = [
    'Food', 'Travel', 'Shopping', 'Entertainment', 'Medical',
    'Education', 'Bills', 'Rent', 'Utilities', 'Other'
];

// @desc    Get all categories (default + user custom) with JIT migration
// @route   GET /api/categories
// @access  Private
exports.getCategories = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Seed default categories if they don't exist yet
        const defaultCount = await Category.countDocuments({ isDefault: true });
        if (defaultCount === 0) {
            const defaultDocs = DEFAULT_CATEGORIES.map(name => ({
                name,
                isDefault: true,
                userId: null
            }));
            await Category.insertMany(defaultDocs, { ordered: false }).catch(() => {});
        }

        // 2. Fetch existing categories available to this user
        const existingCategories = await Category.find({
            $or: [{ isDefault: true }, { userId }]
        });
        const existingNamesLower = new Set(existingCategories.map(c => c.name.toLowerCase()));

        // 3. JIT Migration: scan old budgets and expenses for legacy categories
        const userBudgets = await Budget.find({ userId }).select('category');
        const userExpenses = await Expense.find({ userId }).select('category');

        const legacyNames = new Set();
        userBudgets.forEach(b => legacyNames.add(b.category));
        userExpenses.forEach(e => legacyNames.add(e.category));

        const missingCategories = [];
        legacyNames.forEach(catName => {
            if (catName && !existingNamesLower.has(catName.toLowerCase())) {
                missingCategories.push({
                    name: catName,
                    userId,
                    isDefault: false
                });
                existingNamesLower.add(catName.toLowerCase());
            }
        });

        if (missingCategories.length > 0) {
            await Category.insertMany(missingCategories, { ordered: false }).catch(() => {});
        }

        // 4. Re-fetch to get the complete list and return sorted names
        const allCategories = await Category.find({
            $or: [{ isDefault: true }, { userId }]
        });

        // Deduplicate by lowercase name, keep original casing
        const uniqueMap = new Map();
        allCategories.forEach(cat => {
            const lower = cat.name.trim().toLowerCase();
            if (!uniqueMap.has(lower)) {
                uniqueMap.set(lower, cat.name.trim());
            }
        });

        const sortedNames = Array.from(uniqueMap.values()).sort((a, b) => a.localeCompare(b));
        res.status(200).json(sortedNames);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a custom category
// @route   POST /api/categories
// @access  Private
exports.createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user.id;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Category name is required' });
        }

        // Check if category already exists for this user or as a default
        const existing = await Category.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            $or: [{ isDefault: true }, { userId }]
        });

        if (existing) {
            return res.status(400).json({ message: 'Category already exists' });
        }

        const category = await Category.create({
            name: name.trim(),
            userId,
            isDefault: false
        });

        res.status(201).json(category);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Category already exists' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
