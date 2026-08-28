const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  getUsers,
  updateUserRole,
  deleteUser,
} = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// Staff management — admin only
router.get('/users', protect, adminOnly, getUsers);
router.put('/users/:id/role', protect, adminOnly, updateUserRole);
router.delete('/users/:id', protect, adminOnly, deleteUser);

module.exports = router;
