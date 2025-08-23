const mongoose = require('mongoose');

const propertyCalendarSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedReason: {
    type: String,
    enum: ['maintenance', 'personal_use', 'other'],
    default: 'other'
  },
  customPrice: {
    type: Number,
    min: 0
  },
  minimumStay: {
    type: Number,
    min: 1,
    default: 1
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
propertyCalendarSchema.index({ property: 1, date: 1 }, { unique: true });

// Index for date range queries
propertyCalendarSchema.index({ property: 1, date: 1, isAvailable: 1 });

// Static method to check availability for date range
propertyCalendarSchema.statics.checkDateRangeAvailability = async function(propertyId, startDate, endDate) {
  const blockedDates = await this.find({
    property: propertyId,
    date: {
      $gte: startDate,
      $lt: endDate
    },
    $or: [
      { isAvailable: false },
      { isBlocked: true }
    ]
  });
  
  return blockedDates.length === 0;
};

// Static method to get pricing for date range
propertyCalendarSchema.statics.getPricingForRange = async function(propertyId, startDate, endDate) {
  const Property = mongoose.model('Property');
  const property = await Property.findById(propertyId);
  
  if (!property) {
    throw new Error('Property not found');
  }
  
  const calendar = await this.find({
    property: propertyId,
    date: {
      $gte: startDate,
      $lt: endDate
    }
  });
  
  const pricing = [];
  const currentDate = new Date(startDate);
  
  while (currentDate < endDate) {
    const calendarEntry = calendar.find(entry => 
      entry.date.toDateString() === currentDate.toDateString()
    );
    
    pricing.push({
      date: new Date(currentDate),
      price: calendarEntry?.customPrice || property.price,
      isAvailable: calendarEntry?.isAvailable !== false && calendarEntry?.isBlocked !== true,
      minimumStay: calendarEntry?.minimumStay || 1
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return pricing;
};

module.exports = mongoose.model('PropertyCalendar', propertyCalendarSchema); 