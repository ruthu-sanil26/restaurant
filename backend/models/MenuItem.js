const mongoose = require('mongoose');

const customizationOptionSchema = new mongoose.Schema({
  label: { type: String, required: true },           // e.g. "Spice Level"
  type: { type: String, enum: ['select', 'checkbox', 'text'], default: 'select' },
  choices: [{
    name: { type: String, required: true },
    extraPrice: { type: Number, default: 0 }
  }],
  required: { type: Boolean, default: false },
}, { _id: false });

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    image: { type: String, default: '' },
    available: { type: Boolean, default: true },
    isChefRecommended: { type: Boolean, default: false },
    tags: [{ type: String }],
    customizationOptions: [customizationOptionSchema],  // per-item customization definitions
  },
  { timestamps: true }
);

module.exports = mongoose.model('MenuItem', menuItemSchema);
