const Expense = require("../models/Expense");

const addExpense = async (req, res) => {

  try {

    const {
      title,
      amount,
      category
    } = req.body;

    const newExpense = new Expense({
      title,
      amount,
      category,
      userId: req.user.id
    });

    await newExpense.save();

    res.status(201).json({
      message: "Expense Added",
      expense: newExpense
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server Error"
    });

  }

};

const getExpenses = async (req, res) => {

  try {

    const { month, year } = req.query;
    let query = { userId: req.user.id };

    if (month !== undefined || year !== undefined) {
      const { getUTCMonthBoundaries } = require('../utils/dateUtils');
      const boundaries = getUTCMonthBoundaries(month, year);
      if (!boundaries) {
        return res.status(400).json({ message: "Invalid month or year parameters" });
      }
      query.createdAt = { $gte: boundaries.startOfPeriod, $lte: boundaries.endOfPeriod };
    }

    const expenses = await Expense.find(query).sort({ createdAt: -1 });

    res.status(200).json(expenses);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server Error"
    });

  }

};

const updateExpense = async (req, res) => {

  try {

    const {
      title,
      amount,
      category
    } = req.body;

    const updatedExpense = await Expense.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id
      },
      {
        title,
        amount,
        category
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedExpense) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    res.status(200).json({
      message: "Expense Updated",
      expense: updatedExpense
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server Error"
    });

  }

};

const deleteExpense = async (req, res) => {

  try {

    const deletedExpense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!deletedExpense) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    res.status(200).json({
      message: "Expense Deleted"
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server Error"
    });

  }

};

module.exports = {
  addExpense,
  getExpenses,
  updateExpense,
  deleteExpense
};
