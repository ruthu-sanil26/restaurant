const express = require('express');
const router = express.Router();
const path = require('path');
const {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require('../controllers/menuController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Image upload endpoint
router.post('/upload', protect, adminOnly, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

router.get('/', getMenuItems);
router.get('/:id', getMenuItem);
router.post('/', protect, adminOnly, createMenuItem);
router.put('/:id', protect, adminOnly, updateMenuItem);
router.delete('/:id', protect, adminOnly, deleteMenuItem);

module.exports = router;

