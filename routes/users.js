const express = require('express');
const User = require('../models/User');
const Property = require('../models/Property');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get user profile by ID (public info only)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name avatar role')
      .populate('favorites', 'title images location price');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Get user's properties (if they're a host)
router.get('/:id/properties', async (req, res) => {
  try {
    const properties = await Property.find({ 
      host: req.params.id, 
      isAvailable: true 
    })
    .populate('host', 'name avatar')
    .sort({ createdAt: -1 });

    res.json(properties);
  } catch (error) {
    console.error('Get user properties error:', error);
    res.status(500).json({ message: 'Failed to fetch properties' });
  }
});

// Get user's favorites
router.get('/me/favorites', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('favorites', 'title images location price host')
      .select('favorites');

    res.json(user.favorites);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Failed to fetch favorites' });
  }
});

// Admin: Get all users
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const query = {};

    if (role) {
      query.role = role;
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        current: Number(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Admin: Update user role
router.put('/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!['user', 'host', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User role updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

// Admin: Delete user
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Get user statistics (for dashboard)
router.get('/me/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's properties count
    const propertiesCount = await Property.countDocuments({ host: userId });

    // Get user's bookings count (as guest)
    const Booking = require('../models/Booking');
    const bookingsCount = await Booking.countDocuments({ guest: userId });

    // Get user's hosting bookings count
    const hostingBookingsCount = await Booking.countDocuments({ host: userId });

    // Get total earnings (if host)
    const totalEarnings = await Booking.aggregate([
      { $match: { host: userId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    res.json({
      propertiesCount,
      bookingsCount,
      hostingBookingsCount,
      totalEarnings: totalEarnings[0]?.total || 0
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Failed to fetch user statistics' });
  }
});

module.exports = router; 