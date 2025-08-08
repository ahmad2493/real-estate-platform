const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// MULTER CONFIGURATION
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/avatars/');
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// Import controllers
const {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
  uploadDocument,
  forgotPassword,
  resetPassword,
  updateUsername,
  updateRole,
} = require('../controllers/userController');
const { authenticateToken, requireVerification } = require('../middleware/auth');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Password reset routes (public)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Protected routes (require authentication)
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, upload.single('avatar'), updateProfile);
router.put('/change-password', authenticateToken, changePassword);
router.put('/role', authenticateToken, updateRole);
router.put('/username', authenticateToken, updateUsername);

// Routes that require verification
router.post('/documents', authenticateToken, requireVerification, uploadDocument);

module.exports = router;
