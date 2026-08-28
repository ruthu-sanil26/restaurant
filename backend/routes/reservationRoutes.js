const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { protect, adminOnly } = require('../middleware/auth');

// Public route to create a reservation
router.post('/public', reservationController.createReservation);

// Protected Admin routes
router.get('/', protect, adminOnly, reservationController.getAllReservations);
router.put('/:id', protect, adminOnly, reservationController.updateReservationStatus);
router.post('/:id/resend-email', protect, adminOnly, reservationController.resendConfirmationEmail);

module.exports = router;
