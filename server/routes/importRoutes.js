const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');
const authMiddleware = require('../middleware/authMiddleware');

// All import routes are protected by authMiddleware
router.post(
    '/upload', 
    authMiddleware, 
    importController.uploadMiddleware, 
    importController.uploadStatement
);

router.post('/confirm', authMiddleware, importController.confirmImport);
router.get('/history', authMiddleware, importController.getHistory);
router.post('/history/:id/rollback', authMiddleware, importController.rollbackImport);

module.exports = router;
