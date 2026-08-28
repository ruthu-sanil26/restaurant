const Table = require('../models/Table');

exports.getTables = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const tables = await Table.find(filter).populate('currentOrder').sort('number');
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTable = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id).populate('currentOrder');
    if (!table) return res.status(404).json({ message: 'Table not found' });
    res.json(table);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createTable = async (req, res) => {
  try {
    const table = await Table.create(req.body);
    res.status(201).json(table);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTable = async (req, res) => {
  try {
    const table = await Table.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!table) return res.status(404).json({ message: 'Table not found' });
    res.json(table);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteTable = async (req, res) => {
  try {
    const table = await Table.findByIdAndDelete(req.params.id);
    if (!table) return res.status(404).json({ message: 'Table not found' });
    res.json({ message: 'Table deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
