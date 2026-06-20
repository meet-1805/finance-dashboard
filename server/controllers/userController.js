const User = require("../models/User");
const Budget = require("../models/Budget");

// Get the authenticated user's profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user profile", error: error.message });
    }
};

// Onboard user
exports.onboardUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const { monthlySalary, budgets } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.onboardingState === 'COMPLETED') {
            return res.status(400).json({ message: "User is already onboarded" });
        }

        if (monthlySalary === undefined || monthlySalary < 0) {
            return res.status(400).json({ message: "Valid monthly salary is required" });
        }

        // Update user
        user.monthlySalary = monthlySalary;
        user.onboardingState = 'COMPLETED';
        await user.save();

        // Create budgets if provided
        if (Array.isArray(budgets) && budgets.length > 0) {
            const budgetDocs = budgets.map(b => ({
                userId,
                category: b.category,
                monthlyLimit: b.monthlyLimit
            }));
            await Budget.insertMany(budgetDocs);
        }

        // Fetch updated profile without password
        const updatedUser = await User.findById(userId).select("-password");

        res.status(200).json({
            message: "Onboarding completed successfully",
            user: updatedUser
        });

    } catch (error) {
        res.status(500).json({ message: "Error during onboarding", error: error.message });
    }
};
