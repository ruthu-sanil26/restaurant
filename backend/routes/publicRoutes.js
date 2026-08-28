const express = require('express');
const router = express.Router();
const {
  getMenu,
  getTable,
  getOrder,
  getTableOrders,
  createOrder,
  updatePayment,
  getETA,
  createDodoCheckout,
  dodoSuccess,
  sendOTP,
  submitFeedback,
  updateOrderNotes,
} = require('../controllers/publicController');

router.get('/menu', getMenu);
router.get('/tables/:id', getTable);
router.get('/orders/:id', getOrder);
router.get('/tables/:tableId/orders', getTableOrders);
router.post('/orders', createOrder);
router.post('/orders/send-otp', sendOTP);
router.post('/orders/eta', getETA);
router.patch('/orders/:id/payment', updatePayment);
router.post('/orders/:id/dodo-checkout', createDodoCheckout);
router.get('/orders/:id/dodo-success', dodoSuccess);
router.post('/orders/:id/feedback', submitFeedback);
router.patch('/orders/:id/notes', updateOrderNotes);

module.exports = router;
