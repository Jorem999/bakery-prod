const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { recognizeText } = require('../services/ocr');
const { parseProductionText } = require('../services/parser');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió imagen' });
    }

    const imagePath = req.file.path;
    const text = await recognizeText(imagePath);
    const parsed = parseProductionText(text);

    res.json({
      success: true,
      filename: req.file.filename,
      rawText: text,
      data: parsed
    });
  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
