const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/profile", authMiddleware, userController.getProfile);
router.post("/onboarding", authMiddleware, userController.onboardUser);

module.exports = router;
