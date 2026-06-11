const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const {
    getCategories,
    createCategory
} = require('../controllers/categoryController');

// All category routes are protected
router.use(protect);

router.route('/')
    .get(getCategories)
    .post(createCategory);

module.exports = router;
