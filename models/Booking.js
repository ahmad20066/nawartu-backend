const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: [true, 'Property is required']
  },
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Guest is required']
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Host is required']
  },
  checkIn: {
    type: Date,
    required: [true, 'Check-in date is required']
  },
  checkOut: {
    type: Date,
    required: [true, 'Check-out date is required']
  },
  guests: {
    type: Number,
    required: [true, 'Number of guests is required'],
    min: 1
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'paypal', 'cash'],
    default: 'cash'
  },
  paymentDetails: {
    paypalOrderId: String,
    captureId: String,
    transactionId: String
  },
  specialRequests: {
    type: String,
    trim: true
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true
    },
    date: {
      type: Date
    }
  }
}, {
  timestamps: true
});

// Validate check-out date is after check-in date
bookingSchema.pre('save', function(next) {
  if (this.checkOut <= this.checkIn) {
    return next(new Error('Check-out date must be after check-in date'));
  }
  next();
});

// Calculate total price based on nights and property price
bookingSchema.methods.calculateTotalPrice = async function() {
  const Property = mongoose.model('Property');
  const PropertyCalendar = mongoose.model('PropertyCalendar');
  
  const property = await Property.findById(this.property);
  if (!property) {
    throw new Error('Property not found');
  }

  // Get custom pricing from calendar if exists
  try {
    const pricing = await PropertyCalendar.getPricingForRange(
      this.property, 
      this.checkIn, 
      this.checkOut
    );
    
    const totalPrice = pricing.reduce((sum, day) => sum + day.price, 0);
    return totalPrice;
  } catch (error) {
    // Fallback to basic calculation
  const nights = Math.ceil((this.checkOut - this.checkIn) / (1000 * 60 * 60 * 24));
    return nights * property.price;
  }
};

// Static method to check availability
bookingSchema.statics.checkAvailability = async function(propertyId, checkIn, checkOut) {
  const PropertyCalendar = mongoose.model('PropertyCalendar');
  
  // Check if dates are blocked in calendar
  const calendarAvailable = await PropertyCalendar.checkDateRangeAvailability(
    propertyId, 
    checkIn, 
    checkOut
  );
  
  if (!calendarAvailable) {
    return false;
  }

  // Check for overlapping bookings
  const overlappingBookings = await this.find({
    property: propertyId,
    status: { $in: ['confirmed', 'pending'] },
    $or: [
      {
        checkIn: { $lt: checkOut },
        checkOut: { $gt: checkIn }
      }
    ]
  });

  return overlappingBookings.length === 0;
};

// Static method to get booking statistics for a property
bookingSchema.statics.getPropertyStats = async function(propertyId, startDate, endDate) {
  const bookings = await this.find({
    property: propertyId,
    checkIn: { $gte: startDate },
    checkOut: { $lte: endDate }
  });

  const stats = {
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
    totalRevenue: bookings.filter(b => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, b) => sum + b.totalPrice, 0),
    averageBookingValue: 0,
    totalNights: 0,
    occupancyRate: 0
  };

  if (stats.confirmedBookings > 0) {
    stats.averageBookingValue = stats.totalRevenue / stats.confirmedBookings;
    
    stats.totalNights = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, booking) => {
        const nights = Math.ceil((booking.checkOut - booking.checkIn) / (1000 * 60 * 60 * 24));
        return sum + nights;
      }, 0);

    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    stats.occupancyRate = (stats.totalNights / totalDays) * 100;
  }

  return stats;
};

// Static method to get monthly revenue for host analytics
bookingSchema.statics.getMonthlyRevenue = async function(hostId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const bookings = await this.find({
    host: hostId,
    status: { $in: ['confirmed', 'completed'] },
    checkIn: { $gte: startDate, $lte: endDate }
  });

  return bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
};

module.exports = mongoose.model('Booking', bookingSchema); 