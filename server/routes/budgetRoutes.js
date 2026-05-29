const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const {
    getBudgets,
    createBudget,
    updateBudget,
    deleteBudget
} = require('../controllers/budgetController');

// All budget routes must be protected
router.use(protect);

router.route('/')
    .get(getBudgets)
    .post(createBudget);

router.route('/:id')
    .put(updateBudget)
    .delete(deleteBudget);

module.exports = router;
