const express = require("express");

const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {

    addIncome,
    getIncome,
    updateIncome,
    deleteIncome

} = require("../controllers/incomeController");

router.use(authMiddleware);

router.post("/", addIncome);

router.get("/", getIncome);

router.put("/:id", updateIncome);

router.delete("/:id", deleteIncome);

module.exports = router;
