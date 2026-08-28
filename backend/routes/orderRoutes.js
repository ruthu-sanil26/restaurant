const express = require('express');
const router = express.Router();
const {
  getOrders,
  getAnalytics,
  getOrder,
  createOrder,
  updateOrderStatus,
  updatePaymentStatus,
  cancelOrder,
  deleteOrder,
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getOrders);
router.get('/analytics', protect, getAnalytics);
router.get('/:id', protect, getOrder);
router.post('/', protect, createOrder);
router.put('/:id/status', protect, updateOrderStatus);
router.put('/:id/payment-status', protect, updatePaymentStatus);
router.post('/:id/cancel', protect, cancelOrder);
router.delete('/:id', protect, deleteOrder);

module.exports = router;
