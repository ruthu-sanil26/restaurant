const express = require('express');
const router = express.Router();

const {
  getTables,
  getTable,
  createTable,
  updateTable,
  deleteTable,
} = require('../controllers/tableController');

const { protect, adminOnly } = require('../middleware/auth');
const Table = require('../models/Table'); // ✅ ADD THIS

/* ✅ ADD THIS FIRST (VERY IMPORTANT) */
router.get('/number/:number', async (req, res) => {
  try {
    const table = await Table.findOne({ number: req.params.number });

    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    res.json(table);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* EXISTING ROUTES */
router.get('/', getTables);
router.get('/:id', getTable);
router.post('/', protect, adminOnly, createTable);
router.put('/:id', protect, adminOnly, updateTable);
router.delete('/:id', protect, adminOnly, deleteTable);

module.exports = router;