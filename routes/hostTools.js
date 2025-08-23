const express = require('express');
const Property = require('../models/Property');
const PropertyCalendar = require('../models/PropertyCalendar');
const HostAnalytics = require('../models/HostAnalytics');
const Booking = require('../models/Booking');
const { authenticateToken, requireHost } = require('../middleware/auth');

const router = express.Router();

// ==================== CALENDAR MANAGEMENT ====================

// Get calendar for a property
router.get('/calendar/:propertyId', authenticateToken, requireHost, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const propertyId = req.params.propertyId;

    // Verify property ownership
    const property = await Property.findById(propertyId);
    if (!property || property.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const calendar = await PropertyCalendar.find({
      property: propertyId,
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });

    // Get existing bookings for the date range
    const bookings = await Booking.find({
      property: propertyId,
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        { checkIn: { $gte: start, $lte: end } },
        { checkOut: { $gte: start, $lte: end } },
        { checkIn: { $lt: start }, checkOut: { $gt: end } }
      ]
    });

    res.json({
      calendar,
      bookings,
      property: {
        id: property._id,
        title: property.title,
        basePrice: property.price
      }
    });
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({ message: 'Failed to fetch calendar' });
  }
});

// Update calendar dates (block/unblock, pricing)
router.put('/calendar/:propertyId', authenticateToken, requireHost, async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    const { dates, updates } = req.body; // dates: array of date strings, updates: { isBlocked, customPrice, etc. }

    // Verify property ownership
    const property = await Property.findById(propertyId);
    if (!property || property.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const operations = dates.map(date => ({
      updateOne: {
        filter: { property: propertyId, date: new Date(date) },
        update: { 
          property: propertyId, 
          date: new Date(date), 
          ...updates 
        },
        upsert: true
      }
    }));

    await PropertyCalendar.bulkWrite(operations);

    res.json({ message: 'Calendar updated successfully' });
  } catch (error) {
    console.error('Update calendar error:', error);
    res.status(500).json({ message: 'Failed to update calendar' });
  }
});

// Bulk block dates
router.post('/calendar/:propertyId/block', authenticateToken, requireHost, async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    const { startDate, endDate, reason, notes } = req.body;

    // Verify property ownership
    const property = await Property.findById(propertyId);
    if (!property || property.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    const operations = dates.map(date => ({
      updateOne: {
        filter: { property: propertyId, date },
        update: { 
          property: propertyId, 
          date, 
          isBlocked: true,
          blockedReason: reason,
          notes
        },
        upsert: true
      }
    }));

    await PropertyCalendar.bulkWrite(operations);

    res.json({ message: `Blocked ${dates.length} dates successfully` });
  } catch (error) {
    console.error('Block dates error:', error);
    res.status(500).json({ message: 'Failed to block dates' });
  }
});

// ==================== ANALYTICS DASHBOARD ====================

// Get host analytics summary
router.get('/analytics/summary', authenticateToken, requireHost, async (req, res) => {
  try {
    const { period = '6months' } = req.query;
    
    let startDate, endDate;
    const now = new Date();
    
    switch (period) {
      case '1month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case '1year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    }
    
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get host properties
    const properties = await Property.find({ host: req.user._id })
      .select('title images rating price');

    // Get recent bookings
    const recentBookings = await Booking.find({ host: req.user._id })
      .populate('property', 'title images')
      .populate('guest', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(10);

    // Calculate summary metrics
    const allBookings = await Booking.find({ 
      host: req.user._id,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const confirmedBookings = allBookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const totalBookings = allBookings.length;
    
    const totalNights = confirmedBookings.reduce((sum, booking) => {
      const nights = Math.ceil((booking.checkOut - booking.checkIn) / (1000 * 60 * 60 * 24));
      return sum + nights;
    }, 0);

    // Monthly breakdown
    const monthlyData = {};
    allBookings.forEach(booking => {
      const month = booking.createdAt.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { bookings: 0, revenue: 0, nights: 0 };
      }
      monthlyData[month].bookings++;
      if (booking.status === 'confirmed' || booking.status === 'completed') {
        monthlyData[month].revenue += booking.totalPrice;
        const nights = Math.ceil((booking.checkOut - booking.checkIn) / (1000 * 60 * 60 * 24));
        monthlyData[month].nights += nights;
      }
    });

    res.json({
      summary: {
        totalProperties: properties.length,
        totalRevenue,
        totalBookings,
        totalNights,
        averageDailyRate: totalNights > 0 ? totalRevenue / totalNights : 0,
        occupancyRate: 0 // Calculate based on available days vs booked days
      },
      properties: properties.map(prop => ({
        ...prop.toObject(),
        bookingCount: allBookings.filter(b => b.property.toString() === prop._id.toString()).length
      })),
      recentBookings,
      monthlyData: Object.entries(monthlyData).map(([month, data]) => ({
        month,
        ...data
      }))
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

// Get detailed property analytics
router.get('/analytics/property/:propertyId', authenticateToken, requireHost, async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    const { year = new Date().getFullYear(), month } = req.query;

    // Verify property ownership
    const property = await Property.findById(propertyId);
    if (!property || property.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let analytics;
    if (month) {
      // Get specific month analytics
      analytics = await HostAnalytics.findOne({
        host: req.user._id,
        property: propertyId,
        year: parseInt(year),
        month: parseInt(month)
      });

      if (!analytics) {
        // Generate analytics for this month
        await HostAnalytics.generateHostAnalytics(req.user._id, parseInt(year), parseInt(month));
        analytics = await HostAnalytics.findOne({
          host: req.user._id,
          property: propertyId,
          year: parseInt(year),
          month: parseInt(month)
        });
      }
    } else {
      // Get year analytics
      analytics = await HostAnalytics.find({
        host: req.user._id,
        property: propertyId,
        year: parseInt(year)
      }).sort({ month: 1 });
    }

    res.json({
      property: {
        id: property._id,
        title: property.title,
        images: property.images,
        rating: property.rating,
        price: property.price
      },
      analytics
    });
  } catch (error) {
    console.error('Get property analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch property analytics' });
  }
});

// ==================== PRICING TOOLS ====================

// Get pricing suggestions
router.get('/pricing/suggestions/:propertyId', authenticateToken, requireHost, async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    const { startDate, endDate } = req.query;

    // Verify property ownership
    const property = await Property.findById(propertyId);
    if (!property || property.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get similar properties in the area for comparison
    const similarProperties = await Property.find({
      'location.neighborhood': property.location.neighborhood,
      propertyType: property.propertyType,
      'capacity.guests': property.capacity.guests,
      _id: { $ne: propertyId }
    }).limit(10);

    const averagePrice = similarProperties.length > 0 
      ? similarProperties.reduce((sum, p) => sum + p.price, 0) / similarProperties.length
      : property.price;

    // Basic demand analysis (simplified)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const suggestions = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      let suggestedPrice = property.price;
      let reasoning = 'Base price';

      // Weekend premium
      if (isWeekend) {
        suggestedPrice *= 1.2;
        reasoning = 'Weekend premium (+20%)';
      }

      // Market comparison
      if (averagePrice > property.price * 1.1) {
        suggestedPrice = Math.min(suggestedPrice * 1.1, averagePrice);
        reasoning += ', Market opportunity';
      } else if (averagePrice < property.price * 0.9) {
        suggestedPrice = Math.max(suggestedPrice * 0.95, averagePrice);
        reasoning += ', Competitive pricing';
      }

      suggestions.push({
        date: new Date(d),
        currentPrice: property.price,
        suggestedPrice: Math.round(suggestedPrice),
        reasoning,
        demandLevel: isWeekend ? 'high' : 'medium'
      });
    }

    res.json({
      property: {
        id: property._id,
        title: property.title,
        currentPrice: property.price
      },
      marketData: {
        averagePrice: Math.round(averagePrice),
        similarPropertiesCount: similarProperties.length,
        priceRange: {
          min: Math.min(...similarProperties.map(p => p.price)),
          max: Math.max(...similarProperties.map(p => p.price))
        }
      },
      suggestions
    });
  } catch (error) {
    console.error('Get pricing suggestions error:', error);
    res.status(500).json({ message: 'Failed to get pricing suggestions' });
  }
});

// Update property pricing
router.put('/pricing/:propertyId', authenticateToken, requireHost, async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    const { basePrice, customPricing } = req.body; // customPricing: [{ date, price }]

    // Verify property ownership
    const property = await Property.findById(propertyId);
    if (!property || property.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update base price
    if (basePrice) {
      property.price = basePrice;
      await property.save();
    }

    // Update custom pricing in calendar
    if (customPricing && customPricing.length > 0) {
      const operations = customPricing.map(({ date, price }) => ({
        updateOne: {
          filter: { property: propertyId, date: new Date(date) },
          update: { 
            property: propertyId, 
            date: new Date(date), 
            customPrice: price 
          },
          upsert: true
        }
      }));

      await PropertyCalendar.bulkWrite(operations);
    }

    res.json({ message: 'Pricing updated successfully' });
  } catch (error) {
    console.error('Update pricing error:', error);
    res.status(500).json({ message: 'Failed to update pricing' });
  }
});

// ==================== BULK OPERATIONS ====================

// Get all host properties for bulk operations
router.get('/properties/bulk', authenticateToken, requireHost, async (req, res) => {
  try {
    const properties = await Property.find({ host: req.user._id })
      .populate('host', 'name avatar')
      .sort({ createdAt: -1 });

    // Get booking counts for each property
    const propertiesWithStats = await Promise.all(
      properties.map(async (property) => {
        const bookingCount = await Booking.countDocuments({ property: property._id });
        const activeBookings = await Booking.countDocuments({ 
          property: property._id, 
          status: { $in: ['confirmed', 'pending'] } 
        });
        
        return {
          ...property.toObject(),
          stats: {
            totalBookings: bookingCount,
            activeBookings
          }
        };
      })
    );

    res.json(propertiesWithStats);
  } catch (error) {
    console.error('Get bulk properties error:', error);
    res.status(500).json({ message: 'Failed to fetch properties' });
  }
});

// Bulk update properties
router.put('/properties/bulk', authenticateToken, requireHost, async (req, res) => {
  try {
    const { propertyIds, updates } = req.body;

    // Verify all properties belong to the host
    const properties = await Property.find({
      _id: { $in: propertyIds },
      host: req.user._id
    });

    if (properties.length !== propertyIds.length) {
      return res.status(403).json({ message: 'Not authorized for some properties' });
    }

    // Perform bulk update
    const result = await Property.updateMany(
      { _id: { $in: propertyIds }, host: req.user._id },
      updates
    );

    res.json({
      message: `Updated ${result.modifiedCount} properties successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ message: 'Failed to update properties' });
  }
});

// ==================== HOST VERIFICATION ====================

// Get host verification status
router.get('/verification/status', authenticateToken, requireHost, async (req, res) => {
  try {
    const host = await req.user.populate('verificationData');
    
    res.json({
      isVerified: host.isVerified || false,
      verificationLevel: host.verificationLevel || 'none',
      verificationData: host.verificationData || {},
      nextSteps: [
        'Upload government ID',
        'Verify phone number', 
        'Verify email address',
        'Complete background check'
      ]
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({ message: 'Failed to get verification status' });
  }
});

module.exports = router; 