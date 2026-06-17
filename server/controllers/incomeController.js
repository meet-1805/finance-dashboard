const Income = require("../models/Income");

const addIncome = async (req, res) => {

    try {

        const {
            title,
            amount,
            category
        } = req.body;

        const newIncome = new Income({

            title,
            amount,
            category,
            userId: req.user.id

        });

        await newIncome.save();

        res.status(201).json({

            message: "Income Added",
            income: newIncome

        });

    } catch(error){

        console.log(error);

        res.status(500).json({
            message: "Server Error"
        });

    }

};

const getIncome = async (req, res) => {

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

        const income = await Income.find(query).sort({ createdAt: -1 });

        res.status(200).json(income);

    } catch(error){

        console.log(error);

        res.status(500).json({
            message: "Server Error"
        });

    }

};

const updateIncome = async (req, res) => {

    try {

        const {
            title,
            amount,
            category
        } = req.body;

        const updatedIncome = await Income.findOneAndUpdate(
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

        if (!updatedIncome) {
            return res.status(404).json({
                message: "Income not found"
            });
        }

        res.status(200).json({
            message: "Income Updated",
            income: updatedIncome
        });

    } catch(error){

        console.log(error);

        res.status(500).json({
            message: "Server Error"
        });

    }

};

const deleteIncome = async (req, res) => {

    try {

        const deletedIncome = await Income.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!deletedIncome) {
            return res.status(404).json({
                message: "Income not found"
            });
        }

        res.status(200).json({
            message: "Income Deleted"
        });

    } catch(error){

        console.log(error);

        res.status(500).json({
            message: "Server Error"
        });

    }

};

module.exports = {

    addIncome,
    getIncome,
    updateIncome,
    deleteIncome

};
