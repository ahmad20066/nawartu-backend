const mongoose = require('mongoose');

const hostAnalyticsSchema = new mongoose.Schema({
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  metrics: {
    totalBookings: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    totalNights: {
      type: Number,
      default: 0
    },
    occupancyRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    averageDailyRate: {
      type: Number,
      default: 0
    },
    revenuePerAvailableRoom: {
      type: Number,
      default: 0
    },
    responseRate: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    acceptanceRate: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    reviewCount: {
      type: Number,
      default: 0
    }
  },
  bookings: {
    confirmed: { type: Number, default: 0 },
    cancelled: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    completed: { type: Number, default: 0 }
  },
  revenue: {
    confirmed: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
hostAnalyticsSchema.index({ host: 1, property: 1, year: 1, month: 1 }, { unique: true });
hostAnalyticsSchema.index({ host: 1, year: 1, month: 1 });

// Static method to generate analytics for a host
hostAnalyticsSchema.statics.generateHostAnalytics = async function(hostId, year, month) {
  const Booking = mongoose.model('Booking');
  const Property = mongoose.model('Property');
  
  // Get all properties for this host
  const properties = await Property.find({ host: hostId });
  
  const analytics = [];
  
  for (const property of properties) {
    // Date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    // Get bookings for this property in this month
    const bookings = await Booking.find({
      property: property._id,
      $or: [
        { checkIn: { $gte: startDate, $lte: endDate } },
        { checkOut: { $gte: startDate, $lte: endDate } },
        { checkIn: { $lt: startDate }, checkOut: { $gt: endDate } }
      ]
    });
    
    // Calculate metrics
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    
    const totalRevenue = bookings
      .filter(b => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, booking) => sum + booking.totalPrice, 0);
    
    const totalNights = bookings
      .filter(b => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, booking) => {
        const nights = Math.ceil((booking.checkOut - booking.checkIn) / (1000 * 60 * 60 * 24));
        return sum + nights;
      }, 0);
    
    const daysInMonth = endDate.getDate();
    const occupancyRate = totalNights > 0 ? (totalNights / daysInMonth) * 100 : 0;
    const averageDailyRate = totalNights > 0 ? totalRevenue / totalNights : 0;
    const revenuePerAvailableRoom = totalRevenue / daysInMonth;
    
    // Update or create analytics record
    await this.findOneAndUpdate(
      { host: hostId, property: property._id, year, month },
      {
        host: hostId,
        property: property._id,
        year,
        month,
        metrics: {
          totalBookings,
          totalRevenue,
          totalNights,
          occupancyRate: Math.round(occupancyRate * 100) / 100,
          averageDailyRate: Math.round(averageDailyRate * 100) / 100,
          revenuePerAvailableRoom: Math.round(revenuePerAvailableRoom * 100) / 100,
          averageRating: property.rating.average,
          reviewCount: property.rating.count
        },
        bookings: {
          confirmed: confirmedBookings,
          cancelled: cancelledBookings,
          pending: pendingBookings,
          completed: completedBookings
        },
        revenue: {
          confirmed: totalRevenue,
          pending: bookings
            .filter(b => b.status === 'pending')
            .reduce((sum, booking) => sum + booking.totalPrice, 0),
          total: totalRevenue
        }
      },
      { upsert: true, new: true }
    );
  }
  
  return analytics;
};

// Static method to get host summary analytics
hostAnalyticsSchema.statics.getHostSummary = async function(hostId, startYear, startMonth, endYear, endMonth) {
  const analytics = await this.find({
    host: hostId,
    $or: [
      { year: { $gt: startYear } },
      { year: startYear, month: { $gte: startMonth } }
    ],
    $and: [
      { year: { $lt: endYear } },
      { year: endYear, month: { $lte: endMonth } }
    ]
  }).populate('property', 'title images');
  
  const summary = {
    totalRevenue: 0,
    totalBookings: 0,
    totalNights: 0,
    averageOccupancyRate: 0,
    averageDailyRate: 0,
    totalProperties: 0,
    monthlyData: []
  };
  
  analytics.forEach(record => {
    summary.totalRevenue += record.metrics.totalRevenue;
    summary.totalBookings += record.metrics.totalBookings;
    summary.totalNights += record.metrics.totalNights;
  });
  
  const propertyCount = [...new Set(analytics.map(a => a.property._id.toString()))].length;
  summary.totalProperties = propertyCount;
  
  if (analytics.length > 0) {
    summary.averageOccupancyRate = analytics.reduce((sum, a) => sum + a.metrics.occupancyRate, 0) / analytics.length;
    summary.averageDailyRate = summary.totalNights > 0 ? summary.totalRevenue / summary.totalNights : 0;
  }
  
  return summary;
};

module.exports = mongoose.model('HostAnalytics', hostAnalyticsSchema); 