const mongoose = require('mongoose');
const config = require('../config');
const Income = require('../models/Income');
const Expense = require('../models/Expense');

async function migrate() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(config.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB.');

        // Migrate Income
        const incomes = await Income.find({ transactionDate: { $exists: false } });
        console.log(`Found ${incomes.length} Income records missing transactionDate.`);
        for (const income of incomes) {
            income.transactionDate = income.createdAt || new Date();
            await income.save();
        }
        console.log('Income migration complete.');

        // Migrate Expense
        const expenses = await Expense.find({ transactionDate: { $exists: false } });
        console.log(`Found ${expenses.length} Expense records missing transactionDate.`);
        for (const expense of expenses) {
            expense.transactionDate = expense.createdAt || new Date();
            await expense.save();
        }
        console.log('Expense migration complete.');

        console.log('Migration finished successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
