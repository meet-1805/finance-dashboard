const express = require("express");
const cookieParser = require("cookie-parser");
const config = require("./config");
const mongoose = require("mongoose");
const cors = require("cors");
// Environment variables are validated in config.js


const authRoutes = require("./routes/authRoutes");
const incomeRoutes = require("./routes/incomeRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const categoryRoutes = require("./routes/categoryRoutes");

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());

mongoose.connect(config.MONGO_URI, {
    serverSelectionTimeoutMS: 5000
})
.then(() => {
    console.log("MongoDB Connected");
})
.catch((error) => {
    console.log(error);
});

app.use("/api/auth", authRoutes);


app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        database:
            mongoose.connection.readyState === 1
                ? "connected"
                : "disconnected"
    });
});

app.use("/api/income", incomeRoutes);

app.use("/api/expenses", expenseRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/categories", categoryRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message });
});
