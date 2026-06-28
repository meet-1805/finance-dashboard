const path = require('path');
const multer = require('multer');
const ParserFactory = require('../utils/ParserFactory');

// Configure multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // Limit file size to 2MB
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.csv') {
            return cb(new Error('Only CSV files are supported in this phase.'));
        }
        cb(null, true);
    }
});

// Empty handlers skeleton for future phases
exports.confirmImport = async (req, res) => {
    res.status(501).json({ message: "Not implemented in Phase 1" });
};

exports.getHistory = async (req, res) => {
    res.status(501).json({ message: "Not implemented in Phase 1" });
};

exports.rollbackImport = async (req, res) => {
    res.status(501).json({ message: "Not implemented in Phase 1" });
};

// Phase 1 Upload Handler
exports.uploadMiddleware = upload.single('statement');

exports.uploadStatement = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }

        const ext = path.extname(req.file.originalname);
        const parser = ParserFactory.getParser(ext);
        const transactions = await parser.parse(req.file.buffer);

        res.status(200).json({
            message: "File uploaded and parsed successfully.",
            fileType: "CSV",
            transactionCount: transactions.length,
            transactions: transactions
        });

    } catch (error) {
        res.status(400).json({
            message: "Failed to parse statement.",
            error: error.message
        });
    }
};
