const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/User');

const router = express.Router();

// Get reviews for a property
router.get('/property/:propertyId', async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = 'newest' } = req.query;
    const skip = (page - 1) * limit;

    let sortOption = {};
    switch (sort) {
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'highest':
        sortOption = { 'rating.overall': -1 };
        break;
      case 'lowest':
        sortOption = { 'rating.overall': 1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const reviews = await Review.find({ 
      property: req.params.propertyId, 
      isPublic: true 
    })
      .populate('guest', 'name avatar')
      .populate('host', 'name')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const total = await Review.countDocuments({ 
      property: req.params.propertyId, 
      isPublic: true 
    });

    res.json({
      reviews,
      pagination: {
        current: Number(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// Get user's reviews (as guest)
router.get('/my-reviews', authenticateToken, async (req, res) => {
  try {
    const reviews = await Review.find({ guest: req.user._id })
      .populate('property', 'title images location')
      .populate('host', 'name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({ message: 'Failed to fetch your reviews' });
  }
});

// Get reviews for host's properties
router.get('/host-reviews', authenticateToken, async (req, res) => {
  try {
    const reviews = await Review.find({ host: req.user._id })
      .populate('property', 'title images location')
      .populate('guest', 'name avatar')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Get host reviews error:', error);
    res.status(500).json({ message: 'Failed to fetch host reviews' });
  }
});

// Create a new review
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { bookingId, rating, comment, privateComment } = req.body;

    // Check if booking exists and belongs to user
    const booking = await Booking.findById(bookingId)
      .populate('property')
      .populate('host');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.guest.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to review this booking' });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Can only review completed bookings' });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      return res.status(400).json({ message: 'Review already exists for this booking' });
    }

    // Create review
    const review = new Review({
      property: booking.property._id,
      guest: req.user._id,
      host: booking.host._id,
      booking: bookingId,
      rating,
      comment,
      privateComment
    });

    await review.save();

    const populatedReview = await Review.findById(review._id)
      .populate('guest', 'name avatar')
      .populate('host', 'name')
      .populate('property', 'title images location');

    res.status(201).json({
      message: 'Review created successfully',
      review: populatedReview
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Failed to create review' });
  }
});

// Update a review
router.put('/:reviewId', authenticateToken, async (req, res) => {
  try {
    const { rating, comment, privateComment } = req.body;

    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user is the author of the review
    if (review.guest.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }

    // Update review
    review.rating = rating;
    review.comment = comment;
    if (privateComment !== undefined) {
      review.privateComment = privateComment;
    }

    await review.save();

    const updatedReview = await Review.findById(review._id)
      .populate('guest', 'name avatar')
      .populate('host', 'name')
      .populate('property', 'title images location');

    res.json({
      message: 'Review updated successfully',
      review: updatedReview
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ message: 'Failed to update review' });
  }
});

// Delete a review
router.delete('/:reviewId', authenticateToken, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user is the author of the review
    if (review.guest.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    await review.remove();

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Failed to delete review' });
  }
});

// Host response to a review
router.post('/:reviewId/response', authenticateToken, async (req, res) => {
  try {
    const { comment } = req.body;

    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user is the host of the property
    if (review.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to respond to this review' });
    }

    // Add or update response
    review.response = {
      comment,
      date: new Date()
    };

    await review.save();

    const updatedReview = await Review.findById(review._id)
      .populate('guest', 'name avatar')
      .populate('host', 'name')
      .populate('property', 'title images location');

    res.json({
      message: 'Response added successfully',
      review: updatedReview
    });
  } catch (error) {
    console.error('Add response error:', error);
    res.status(500).json({ message: 'Failed to add response' });
  }
});

// Mark review as helpful/unhelpful
router.post('/:reviewId/helpful', authenticateToken, async (req, res) => {
  try {
    const { helpful } = req.body;

    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user already marked this review
    const existingMark = review.helpful.find(mark => 
      mark.user.toString() === req.user._id.toString()
    );

    if (existingMark) {
      // Update existing mark
      existingMark.helpful = helpful;
    } else {
      // Add new mark
      review.helpful.push({
        user: req.user._id,
        helpful
      });
    }

    await review.save();

    res.json({ message: 'Review marked successfully' });
  } catch (error) {
    console.error('Mark review helpful error:', error);
    res.status(500).json({ message: 'Failed to mark review' });
  }
});

// Get review statistics for a property
router.get('/property/:propertyId/stats', async (req, res) => {
  try {
    const stats = await Review.calculateAverageRating(req.params.propertyId);
    
    // Get rating distribution
    const distribution = await Review.aggregate([
      { $match: { property: req.params.propertyId, isPublic: true } },
      {
        $group: {
          _id: '$rating.overall',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.json({
      ...stats,
      distribution
    });
  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({ message: 'Failed to fetch review statistics' });
  }
});

module.exports = router; 