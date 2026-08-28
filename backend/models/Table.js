const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true },
    capacity: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['available', 'occupied', 'reserved'], default: 'available' },
    currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Table', tableSchema);
