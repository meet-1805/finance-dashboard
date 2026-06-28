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

router.get('/session/:sessionId', authMiddleware, importController.getSessionPreview);
router.post('/session/:sessionId/check-duplicates', authMiddleware, importController.checkDuplicates);
router.post('/session/:sessionId/categorize', authMiddleware, importController.categorizeSession);
router.post('/session/:sessionId/learn', authMiddleware, importController.learnMerchants);
router.post('/session/:sessionId/review', authMiddleware, importController.reviewSession);
router.post('/confirm', authMiddleware, importController.confirmImport);
router.get('/history', authMiddleware, importController.getHistory);
router.get('/history/:historyId', authMiddleware, importController.getHistoryDetail);
router.post('/history/:id/rollback', authMiddleware, importController.rollbackImport);

module.exports = router;
