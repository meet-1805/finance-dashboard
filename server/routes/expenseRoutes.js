const express = require("express");

const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  addExpense,
  getExpenses,
  updateExpense,
  deleteExpense
} = require("../controllers/expenseController");

router.use(authMiddleware);

router.post("/", addExpense);

router.get("/", getExpenses);

router.put("/:id", updateExpense);

router.delete("/:id", deleteExpense);

module.exports = router;
