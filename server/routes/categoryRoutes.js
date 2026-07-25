const express  = require('express');
const router   = express.Router();
const protect  = require('../middleware/authMiddleware');
const {
  // V1 — unchanged
  getCategories,
  createCategory,

  // V2 — additive new routes
  getCategoriesV2,
  getCategoryByIdV2,
  createCategoryV2,
  updateCategoryV2,
  archiveCategoryV2,
  restoreCategoryV2,
  triggerSeedV2
} = require('../controllers/categoryController');

// All routes are protected
router.use(protect);

// ── V1 routes (unchanged — all existing callers continue to work) ─────────────
router.route('/')
  .get(getCategories)
  .post(createCategory);

// ── V2 routes (new, additive) ─────────────────────────────────────────────────
router.get('/v2',            getCategoriesV2);
router.post('/v2',           createCategoryV2);
router.post('/v2/seed',      triggerSeedV2);
router.get('/v2/:id',        getCategoryByIdV2);
router.put('/v2/:id',        updateCategoryV2);
router.patch('/v2/:id/archive', archiveCategoryV2);
router.patch('/v2/:id/restore', restoreCategoryV2);

module.exports = router;
