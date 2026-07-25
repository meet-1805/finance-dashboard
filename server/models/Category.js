const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null // null = global default / system category
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },

  // ── V2 fields (all optional — backward compatible) ──────────────────────────

  // Hierarchy
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    default: null
  },

  // Financial type: separates income-only, expense-only, or general categories
  categoryType: {
    type: String,
    enum: ["Income", "Expense", "Transfer", "General"],
    default: "General"
  },

  // Visual presentation
  icon: {
    type: String,
    default: "folder"         // Emoji or icon-font class name
  },
  colour: {
    type: String,
    default: "#6B7280"        // Tailwind gray-500 as neutral default
  },
  description: {
    type: String,
    default: ""
  },

  // AI keyword matching for auto-categorisation (loaded into categorizationService)
  keywords: {
    type: [String],
    default: []
  },

  // Aliases are alternate display names (e.g. "Groceries" → alias "Food Shopping")
  aliases: {
    type: [String],
    default: []
  },

  // Ordering for display lists
  displayOrder: {
    type: Number,
    default: 0
  },

  // Soft-delete (archive) instead of physical deletion
  isArchived: {
    type: Boolean,
    default: false
  },

  // Marks system-seeded entries that must not be user-deleted
  isSystem: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

// ── Indexes ──────────────────────────────────────────────────────────────────
// Original index (unchanged — preserves existing unique constraint behaviour)
categorySchema.index({ name: 1, userId: 1 }, { unique: true });

// V2 indexes
categorySchema.index({ parentId: 1 });
categorySchema.index({ isArchived: 1 });
categorySchema.index({ categoryType: 1 });
categorySchema.index({ isSystem: 1 });

module.exports = mongoose.model("Category", categorySchema);
