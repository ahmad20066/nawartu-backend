const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { sendResetPasswordEmail } = require('../services/email');
const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      phone
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Send welcome email
    const { sendWelcomeEmail } = require('../services/email');
    await sendWelcomeEmail(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites');
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (avatar) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

// Become a host
router.post('/become-host', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { role: 'host' },
      { new: true }
    ).select('-password');

    res.json({
      message: 'You are now a host!',
      user
    });
  } catch (error) {
    console.error('Become host error:', error);
    res.status(500).json({ message: 'Failed to update role' });
  }
});
router.post('/send-reset-password-email', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Generate 6-digit code and set expiration to 15 minutes from now
    const code = Math.floor(100000 + Math.random() * 900000);
    user.resetPassword = {
      code: code.toString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };
    await user.save();


    await sendResetPasswordEmail(user, code);

    res.json({
      message: 'Password reset code sent to your email',
      expiresIn: '15 minutes'
    });
  } catch (error) {
    console.error('Send reset password email error:', error);
    res.status(500).json({ message: 'Failed to send reset password email' });
  }
});
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    // Validate required fields
    if (!email || !code || !newPassword) {
      s
      return res.status(400).json({
        message: 'Email, code, and new password are required'
      });
    }

    // Find user and validate code
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Check if reset code exists and is valid
    if (!user.resetPassword?.code || !user.resetPassword?.expiresAt) {
      return res.status(400).json({
        message: 'No reset code found. Please request a new code.'
      });
    }

    // Check if code has expired
    if (new Date() > user.resetPassword.expiresAt) {
      return res.status(400).json({
        message: 'Reset code has expired. Please request a new code.'
      });
    }

    // Verify the code
    if (user.resetPassword.code !== 123456) {
      return res.status(400).json({ message: 'Invalid reset code' });
    }

    // Update password and clear reset code
    user.password = newPassword;
    user.resetPassword = undefined;
    await user.save();

    // Generate new token
    const token = generateToken(user._id);

    res.json({
      message: 'Password has been reset successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

module.exports = router; 