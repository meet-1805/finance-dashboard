'use strict';

const Category = require('../models/Category');
const Budget   = require('../models/Budget');
const Expense  = require('../models/Expense');
const Income   = require('../models/Income');

// ── Shared predefined names (kept for V1 backward compatibility) ──────────────
const DEFAULT_CATEGORIES = [
  'Food', 'Travel', 'Shopping', 'Entertainment', 'Medical',
  'Education', 'Bills', 'Rent', 'Utilities', 'Other'
];

// ─────────────────────────────────────────────────────────────────────────────
// V1 API — UNCHANGED
// All existing callers (Budgets, Expenses, Income, Import Engine) continue
// to receive a flat string[] from this endpoint.
// ─────────────────────────────────────────────────────────────────────────────

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

    // 2. Fetch existing categories available to this user (non-archived)
    const existingCategories = await Category.find({
      $or: [{ isDefault: true }, { userId }],
      isArchived: { $ne: true }
    });
    const existingNamesLower = new Set(existingCategories.map(c => c.name.toLowerCase()));

    // 3. JIT Migration: scan old budgets and expenses for legacy categories
    const userBudgets  = await Budget.find({ userId }).select('category');
    const userExpenses = await Expense.find({ userId }).select('category');

    const legacyNames = new Set();
    userBudgets.forEach(b  => legacyNames.add(b.category));
    userExpenses.forEach(e => legacyNames.add(e.category));

    const missingCategories = [];
    legacyNames.forEach(catName => {
      if (catName && !existingNamesLower.has(catName.toLowerCase())) {
        missingCategories.push({ name: catName, userId, isDefault: false });
        existingNamesLower.add(catName.toLowerCase());
      }
    });

    if (missingCategories.length > 0) {
      await Category.insertMany(missingCategories, { ordered: false }).catch(() => {});
    }

    // 4. Re-fetch to get the complete list and return sorted names
    const allCategories = await Category.find({
      $or: [{ isDefault: true }, { userId }],
      isArchived: { $ne: true }
    });

    // Deduplicate by lowercase name, keep original casing
    const uniqueMap = new Map();
    allCategories.forEach(cat => {
      const lower = cat.name.trim().toLowerCase();
      if (!uniqueMap.has(lower)) uniqueMap.set(lower, cat.name.trim());
    });

    const sortedNames = Array.from(uniqueMap.values()).sort((a, b) => a.localeCompare(b));
    res.status(200).json(sortedNames);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create a custom category (V1)
// @route   POST /api/categories
// @access  Private
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const userId   = req.user.id;

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

// ─────────────────────────────────────────────────────────────────────────────
// V2 API — NEW ENDPOINTS (additive, no existing routes changed)
// ─────────────────────────────────────────────────────────────────────────────

// ── Helper: compute usage counts for categories by aggregating across
//    Income and Expense collections.
//    Returns Map<categoryNameLowercase, { incomeCount, expenseCount, total }>
async function computeUsageCounts(userId) {
  const [incomeAgg, expenseAgg] = await Promise.all([
    Income.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(userId) } },
      { $group: { _id: { $toLower: '$category' }, count: { $sum: 1 } } }
    ]),
    Expense.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(userId) } },
      { $group: { _id: { $toLower: '$category' }, count: { $sum: 1 } } }
    ])
  ]);

  const map = new Map();

  incomeAgg.forEach(r => {
    if (!map.has(r._id)) map.set(r._id, { incomeCount: 0, expenseCount: 0, total: 0 });
    const entry = map.get(r._id);
    entry.incomeCount  += r.count;
    entry.total        += r.count;
  });

  expenseAgg.forEach(r => {
    if (!map.has(r._id)) map.set(r._id, { incomeCount: 0, expenseCount: 0, total: 0 });
    const entry = map.get(r._id);
    entry.expenseCount += r.count;
    entry.total        += r.count;
  });

  return map;
}

// ── Attach usageCount to a category document (non-mutating) ──────────────────
function attachUsage(cat, usageMap) {
  const key    = cat.name.toLowerCase();
  const counts = usageMap.get(key) || { incomeCount: 0, expenseCount: 0, total: 0 };
  return { ...cat.toObject(), ...counts, usageCount: counts.total };
}

// @desc    Get all V2 categories for this user with optional tree structure
// @route   GET /api/categories/v2
// @query   ?tree=true           Return nested tree (parent → children)
//          ?type=Income|Expense|Transfer|General
//          ?search=query        Name/alias/keyword search
//          ?includeArchived=true
// @access  Private
exports.getCategoriesV2 = async (req, res) => {
  try {
    const userId          = req.user.id;
    const { tree, type, search, includeArchived } = req.query;

    // Build query: system categories + user's own
    const query = {
      $or: [
        { userId: null, isSystem: true },
        { userId, isSystem: { $ne: true } }
      ]
    };

    if (!includeArchived || includeArchived === 'false') {
      query.isArchived = { $ne: true };
    }

    if (type) {
      query.categoryType = type;
    }

    if (search) {
      const re = new RegExp(search, 'i');
      query.$and = [
        { $or: [{ name: re }, { aliases: re }, { keywords: re }, { description: re }] }
      ];
    }

    const categories = await Category.find(query).sort({ displayOrder: 1, name: 1 });

    // Compute usage counts dynamically (no stored field)
    const usageMap = await computeUsageCounts(userId);
    const enriched = categories.map(c => attachUsage(c, usageMap));

    if (!tree || tree === 'false') {
      return res.status(200).json(enriched);
    }

    // Build tree
    const byId    = new Map(enriched.map(c => [String(c._id), c]));
    const roots   = [];
    const childMap = new Map();

    enriched.forEach(c => {
      const pid = c.parentId ? String(c.parentId) : null;
      if (!pid) {
        roots.push({ ...c, children: [] });
      } else {
        if (!childMap.has(pid)) childMap.set(pid, []);
        childMap.get(pid).push({ ...c, children: [] });
      }
    });

    // Attach children to roots
    const attach = (node) => {
      const kids = childMap.get(String(node._id)) || [];
      node.children = kids.map(k => attach(k));
      return node;
    };

    const rootNodes = roots.map(r => attach(r));
    return res.status(200).json(rootNodes);

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get single category by ID (V2)
// @route   GET /api/categories/v2/:id
// @access  Private
exports.getCategoryByIdV2 = async (req, res) => {
  try {
    const userId = req.user.id;
    const cat = await Category.findOne({
      _id: req.params.id,
      $or: [{ userId: null, isSystem: true }, { userId }]
    });

    if (!cat) return res.status(404).json({ message: 'Category not found' });

    const usageMap = await computeUsageCounts(userId);
    return res.status(200).json(attachUsage(cat, usageMap));
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create a full V2 category with metadata
// @route   POST /api/categories/v2
// @access  Private
exports.createCategoryV2 = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name, parentId, categoryType,
      icon, colour, description,
      keywords, aliases, displayOrder
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Check uniqueness for this user
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      $or: [{ isDefault: true }, { userId }]
    });
    if (existing) return res.status(400).json({ message: 'Category already exists' });

    // Validate parentId if supplied
    if (parentId) {
      const parent = await Category.findById(parentId);
      if (!parent) return res.status(400).json({ message: 'Parent category not found' });
    }

    const category = await Category.create({
      name:         name.trim(),
      userId,
      parentId:     parentId     || null,
      categoryType: categoryType || 'General',
      icon:         icon         || 'folder',
      colour:       colour       || '#6B7280',
      description:  description  || '',
      keywords:     Array.isArray(keywords) ? keywords : [],
      aliases:      Array.isArray(aliases)  ? aliases  : [],
      displayOrder: displayOrder != null ? Number(displayOrder) : 0,
      isDefault:    false,
      isSystem:     false,
      isArchived:   false
    });

    res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update a V2 category
// @route   PUT /api/categories/v2/:id
// @access  Private
exports.updateCategoryV2 = async (req, res) => {
  try {
    const userId = req.user.id;
    const cat = await Category.findById(req.params.id);

    if (!cat) return res.status(404).json({ message: 'Category not found' });

    // System categories: only allow updating non-structural fields
    if (cat.isSystem && cat.userId == null) {
      if (req.body.name !== undefined) {
        return res.status(403).json({ message: 'Cannot rename a system category' });
      }
    }

    // Ownership check for user categories
    if (!cat.isSystem && String(cat.userId) !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const allowedFields = [
      'parentId', 'categoryType', 'icon', 'colour',
      'description', 'keywords', 'aliases', 'displayOrder'
    ];

    // Only system-free user categories can be renamed
    if (!cat.isSystem && req.body.name !== undefined) {
      allowedFields.push('name');
    }

    const updates = {};
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    Object.assign(cat, updates);
    await cat.save();

    const usageMap = await computeUsageCounts(userId);
    return res.status(200).json(attachUsage(cat, usageMap));
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Archive a category (soft-delete). Never physically deletes.
//          System categories cannot be archived.
// @route   PATCH /api/categories/v2/:id/archive
// @access  Private
exports.archiveCategoryV2 = async (req, res) => {
  try {
    const userId = req.user.id;
    const cat = await Category.findById(req.params.id);

    if (!cat) return res.status(404).json({ message: 'Category not found' });
    if (cat.isSystem) return res.status(403).json({ message: 'System categories cannot be archived' });
    if (String(cat.userId) !== userId) return res.status(403).json({ message: 'Not authorized' });

    cat.isArchived = true;
    await cat.save();

    res.status(200).json({ message: 'Category archived successfully', category: cat });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Restore an archived category
// @route   PATCH /api/categories/v2/:id/restore
// @access  Private
exports.restoreCategoryV2 = async (req, res) => {
  try {
    const userId = req.user.id;
    const cat = await Category.findById(req.params.id);

    if (!cat) return res.status(404).json({ message: 'Category not found' });
    if (String(cat.userId) !== userId) return res.status(403).json({ message: 'Not authorized' });

    cat.isArchived = false;
    await cat.save();

    res.status(200).json({ message: 'Category restored successfully', category: cat });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Trigger seed via API (guarded — only seeds if system count < 5)
// @route   POST /api/categories/v2/seed
// @access  Private
exports.triggerSeedV2 = async (req, res) => {
  try {
    const systemCount = await Category.countDocuments({ isSystem: true, userId: null });
    if (systemCount >= 5) {
      return res.status(200).json({
        message: 'Seed already applied. Use force=true to override.',
        systemCount
      });
    }
    // Spawn seed as a detached process to avoid blocking the request
    const { execFile } = require('child_process');
    const path = require('path');
    const scriptPath = path.join(__dirname, '..', 'scripts', 'seedCategories.js');
    execFile('node', [scriptPath], (err) => {
      if (err) console.error('[SeedAPI] seed failed:', err.message);
    });
    res.status(202).json({ message: 'Seed triggered. Check server logs for status.' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
