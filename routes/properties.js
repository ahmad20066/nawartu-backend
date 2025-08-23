const express = require('express');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { authenticateToken, requireHost, optionalAuth } = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/upload');
const router = express.Router();



// Get trending properties based on recent bookings
router.get('/trending', async (req, res) => {
  try {
    console.log('Trending properties route hit');
    const { limit = 10 } = req.query;

    // Rolling 30-day window
    const now = new Date();
    const last30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last30DaysEnd = now;


    // First, let's check if we have any relevant bookings
    const totalBookings = await Booking.countDocuments({
      status: { $in: ['confirmed', 'completed'] },
      checkIn: { $gte: last30DaysStart, $lte: last30DaysEnd }
    });


    // Get trending properties based on recent bookings
    const trendingProperties = await Property.aggregate([
      // Lookup bookings from last month
      {
        $lookup: {
          from: 'bookings',
          let: { propertyId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$property', '$$propertyId'] },
                    { $gte: ['$checkIn', last30DaysStart] },
                    { $lte: ['$checkIn', last30DaysEnd] },
                    { $in: ['$status', ['confirmed', 'completed']] }
                  ]
                }
              }
            }
          ],
          as: 'recentBookings'
        }
      },
      // Only include properties with recent bookings
      {
        $match: {
          'recentBookings.0': { $exists: true },
          isAvailable: true
        }
      },
      // Add booking count and sort by it
      {
        $addFields: {
          recentBookingCount: { $size: '$recentBookings' }
        }
      },
      // Sort by recent booking count (most popular first)
      {
        $sort: { recentBookingCount: -1 }
      },
      // Limit results
      {
        $limit: parseInt(limit)
      },
      // Project the final output
      {
        $project: {
          _id: 1,
          description: 1,
          amenities: 1,
          title: 1,
          images: 1,
          price: 1,
          rating: 1,
          location: 1,
          propertyType: 1,
          capacity: 1,
          recentBookingCount: 1,
          isAvailable: 1,
          host: 1,
          images: 1,
          category: 1,
          capacity: 1,
          reviews: 1,
        }
      }
    ]);

    console.log('Trending properties result count (30d):', trendingProperties.length);

    // If no results, try a simpler approach - get properties with any confirmed bookings
    if (trendingProperties.length === 0) {
      console.log('No results from aggregation, trying simpler approach...');

      const simpleProperties = await Property.aggregate([
        {
          $lookup: {
            from: 'bookings',
            let: { propertyId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$property', '$$propertyId'] },
                      { $in: ['$status', ['confirmed', 'completed']] }
                    ]
                  }
                }
              }
            ],
            as: 'allBookings'
          }
        },
        {
          $match: {
            'allBookings.0': { $exists: true },
            isAvailable: true
          }
        },
        {
          $addFields: {
            totalBookingCount: { $size: '$allBookings' }
          }
        },
        {
          $sort: { totalBookingCount: -1 }
        },
        {
          $limit: parseInt(limit)
        },
        {
          $project: {
            _id: 1,
            title: 1,
            images: 1,
            price: 1,
            rating: 1,
            location: 1,
            propertyType: 1,
            capacity: 1,
            totalBookingCount: 1,
            isAvailable: 1
          }
        }
      ]);

      console.log('Simple approach result count:', simpleProperties.length);

      if (simpleProperties.length > 0) {
        // Populate host information
        const populatedProperties = await Property.populate(simpleProperties, {
          path: 'host',
          select: 'name avatar'
        });

        return res.json({
          success: true,
          properties: populatedProperties,
          metadata: {
            totalProperties: populatedProperties.length,
            period: 'All Time (fallback)',
            note: 'No bookings in last 30 days, showing all-time trending properties'
          }
        });
      }
    }

    // Populate host information for trending properties
    const populatedProperties = await Property.populate(trendingProperties, {
      path: 'host',
      select: 'name avatar'
    });

    res.json({
      success: true,
      properties: populatedProperties,
      metadata: {
        totalProperties: populatedProperties.length,
        period: 'Last 30 days'
      }
    });
  } catch (error) {
    console.error('Get trending properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending properties'
    });
  }
});

// Get user's favorite properties
router.get("/favorites", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'favorites',
        populate: {
          path: 'host',
          select: 'name avatar email phone'
        }
      });

    res.json(user.favorites);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: error.message });
  }
});
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      search,
      neighborhood,
      minPrice,
      maxPrice,
      guests,
      propertyType,
      amenities,
      category,
      page = 1,
      limit = 12
    } = req.query;

    const query = { isAvailable: true };

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Filter by neighborhood
    if (neighborhood) {
      query['location.neighborhood'] = neighborhood;
    }

    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Guest capacity
    if (guests) {
      query['capacity.guests'] = { $gte: Number(guests) };
    }

    // Property type
    if (propertyType) {
      query.propertyType = propertyType;
    }

    // Amenities
    if (amenities) {
      const amenitiesArray = amenities.split(',');
      query.amenities = { $all: amenitiesArray };
    }

    // Category
    if (category) {
      query.category = category;
    }

    const skip = (page - 1) * limit;

    const properties = await Property.find(query)
      .populate('host', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Property.countDocuments(query);

    res.json({
      properties,
      pagination: {
        current: Number(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ message: 'Failed to fetch properties' });
  }
});

// Get single property
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('host', 'name avatar phone')
      .populate('reviews.user', 'name avatar');

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.json(property);
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ message: 'Failed to fetch property' });
  }
});

// Create new property (host only)
router.post('/', authenticateToken, requireHost, uploadSingleImage('images'), async (req, res) => {
  try {
    const propertyData = {
      ...req.body,
      host: req.user._id
    };

    const property = new Property(propertyData);
    await property.save();

    const populatedProperty = await Property.findById(property._id)
      .populate('host', 'name avatar');

    res.status(201).json({
      message: 'Property created successfully',
      property: populatedProperty
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ message: 'Failed to create property' });
  }
});

// Update property (host only)
router.put('/:id', authenticateToken, requireHost, uploadSingleImage('images'), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if user owns the property
    if (property.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('host', 'name avatar');

    res.json({
      message: 'Property updated successfully',
      property: updatedProperty
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ message: 'Failed to update property' });
  }
});

// Delete property (host only)
router.delete('/:id', authenticateToken, requireHost, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if user owns the property
    if (property.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Property.findByIdAndDelete(req.params.id);

    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ message: 'Failed to delete property' });
  }
});

// Add review to property
router.post('/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if user already reviewed this property
    const existingReview = property.reviews.find(
      review => review.user.toString() === req.user._id.toString()
    );

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this property' });
    }

    property.reviews.push({
      user: req.user._id,
      rating,
      comment
    });

    // Update average rating
    const totalRating = property.reviews.reduce((sum, review) => sum + review.rating, 0);
    property.rating.average = totalRating / property.reviews.length;
    property.rating.count = property.reviews.length;

    await property.save();

    const populatedProperty = await Property.findById(req.params.id)
      .populate('reviews.user', 'name avatar');

    res.json({
      message: 'Review added successfully',
      property: populatedProperty
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ message: 'Failed to add review' });
  }
});

// Get neighborhoods for filtering
router.get('/neighborhoods/list', async (req, res) => {
  try {
    const neighborhoods = await Property.distinct('location.neighborhood');
    res.json(neighborhoods);
  } catch (error) {
    console.error('Get neighborhoods error:', error);
    res.status(500).json({ message: 'Failed to fetch neighborhoods' });
  }
});




// Toggle favorite property
router.post('/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const propertyId = req.params.id;

    // Validate property ID format
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({ message: 'Invalid property ID format' });
    }

    // Check if property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const isFavorite = user.favorites.some(id => id.toString() === propertyId);

    if (isFavorite) {
      // Remove from favorites
      user.favorites = user.favorites.filter(id => id.toString() !== propertyId);
    } else {
      // Add to favorites
      user.favorites.push(propertyId);
    }

    await user.save();

    res.json({
      message: isFavorite ? 'Removed from favorites' : 'Added to favorites',
      isFavorite: !isFavorite
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ message: 'Failed to update favorites' });
  }
});


module.exports = router; 