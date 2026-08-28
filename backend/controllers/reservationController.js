const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const { emitOrderUpdate } = require('../config/socket');
const { sendSMSReservationConfirmation, sendSMSCancellation } = require('../utils/smsHelper');
const { sendReservationEmail, sendReservationCancellationEmail } = require('../utils/emailHelper');

// Public: Create a new reservation
exports.createReservation = async (req, res) => {
  try {
    const { customerName, customerPhone, customerEmail, partySize, date, time, notes, tableNumber, seatingArea, occasion } = req.body;

    if (!customerName || !customerPhone || !partySize || !date || !time) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    const bookingCode = 'RR-' + Math.floor(1000 + Math.random() * 9000);

    const reservation = await Reservation.create({
      bookingCode,
      customerName,
      customerPhone,
      customerEmail: customerEmail || '',
      partySize,
      tableNumber: tableNumber || '',
      seatingArea: seatingArea || 'Main Dining Hall',
      date,
      time,
      occasion: occasion || 'Casual Dining',
      notes: notes || '',
      status: 'pending'
    });

    // Send SMS notification for reservation request
    try {
      await sendSMSReservationConfirmation(reservation, false);
    } catch (smsErr) {
      console.error('Reservation creation SMS error:', smsErr);
    }

    // Send email notification for reservation request
    try {
      await sendReservationEmail(reservation, false);
    } catch (emailErr) {
      console.error('Reservation creation email error:', emailErr);
    }

    try {
      if (typeof emitOrderUpdate === 'function') {
        emitOrderUpdate({ type: 'NEW_RESERVATION', reservation });
      }
    } catch (e) {
      // Ignore socket errors gracefully
    }

    res.status(201).json(reservation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Get all reservations
exports.getAllReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find().sort({ createdAt: -1 });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Update Status of Reservation
exports.updateReservationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    // Trigger SMS notification on confirmation or cancellation
    try {
      if (status === 'confirmed') {
        await sendSMSReservationConfirmation(reservation, true);
      } else if (status === 'cancelled') {
        await sendSMSCancellation(reservation);
      }
    } catch (smsErr) {
      console.error('Reservation update SMS error:', smsErr);
    }

    // Send confirmation/cancellation email
    try {
      if (status === 'confirmed') {
        await sendReservationEmail(reservation, true);
      } else if (status === 'cancelled') {
        await sendReservationCancellationEmail(reservation);
      }
    } catch (emailErr) {
      console.error('Reservation email error:', emailErr);
    }

    // Attempt to parse out a table number and sync Table status
    if (reservation.tableNumber) {
      const match = reservation.tableNumber.match(/\d+/);
      if (match) {
        const tableNum = parseInt(match[0], 10);
        if (status === 'confirmed') {
          await Table.findOneAndUpdate({ number: tableNum }, { status: 'reserved' });
        } else if (status === 'cancelled' || status === 'completed') {
          await Table.findOneAndUpdate({ number: tableNum }, { status: 'available' });
        }
      }
    }

    res.json(reservation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Resend confirmation email for a reservation
exports.resendConfirmationEmail = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    if (!reservation.customerEmail) {
      return res.status(400).json({ message: 'No email address on file for this reservation.' });
    }
    const isConfirmed = reservation.status === 'confirmed';
    await sendReservationEmail(reservation, isConfirmed);
    res.json({ message: `Confirmation email sent to ${reservation.customerEmail}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

