const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, default: '' },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerEmail: { type: String, default: '' },
    partySize: { type: Number, required: true, min: 1 },
    tableNumber: { type: String, default: '' },
    seatingArea: { type: String, default: 'Main Dining Hall' },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    time: { type: String, required: true }, // Format: HH:MM
    occasion: { type: String, default: 'Casual Dining' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending'
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reservation', reservationSchema);

