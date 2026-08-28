const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String, default: '' },
  customization: { type: mongoose.Schema.Types.Mixed, default: {} }, // e.g. { "Spice Level": "Hot", "Extras": ["Cheese"] }
});

const orderSchema = new mongoose.Schema(
  {
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
    items: [orderItemSchema],
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'],
      default: 'pending',
    },
    totalAmount: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    servedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    paymentMethod: { type: String, enum: ['pending', 'cash', 'online'], default: 'pending' },
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    feedback: { type: String, default: '' },
    rating: { type: Number, min: 1, max: 5, default: null },
    customerName: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    orderType: { type: String, enum: ['ai', 'manual'], default: 'manual' },
  },
  { timestamps: true }
);

orderSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    this.itemNames = this.items.map((item) => {
      let custStr = "";
      if (item.customization && Object.keys(item.customization).length > 0) {
        const custArr = Object.entries(item.customization)
          .filter(([_, v]) => v && (!Array.isArray(v) || v.length > 0))
          .map(([k, v]) => Array.isArray(v) ? `${k}: ${v.join('|')}` : `${k}: ${v}`);
        if (custArr.length > 0) custStr = ` [${custArr.join(', ')}]`;
      }
      return `${item.name}${custStr} (x${item.quantity})`;
    }).join(', ');
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
