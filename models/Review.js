const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
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
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking is required']
  },
  rating: {
    overall: {
      type: Number,
      required: [true, 'Overall rating is required'],
      min: 1,
      max: 5
    },
    cleanliness: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    checkIn: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    accuracy: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    location: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    value: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    }
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    maxlength: 1000
  },
  privateComment: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  helpful: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    helpful: {
      type: Boolean,
      default: true
    }
  }],
  response: {
    comment: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    date: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Ensure one review per booking
reviewSchema.index({ booking: 1 }, { unique: true });

// Calculate average rating for property
reviewSchema.statics.calculateAverageRating = async function(propertyId) {
  const result = await this.aggregate([
    { $match: { property: propertyId, isPublic: true } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating.overall' },
        totalReviews: { $sum: 1 },
        cleanliness: { $avg: '$rating.cleanliness' },
        communication: { $avg: '$rating.communication' },
        checkIn: { $avg: '$rating.checkIn' },
        accuracy: { $avg: '$rating.accuracy' },
        location: { $avg: '$rating.location' },
        value: { $avg: '$rating.value' }
      }
    }
  ]);

  if (result.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      cleanliness: 0,
      communication: 0,
      checkIn: 0,
      accuracy: 0,
      location: 0,
      value: 0
    };
  }

  return result[0];
};

// Update property rating when review is saved/updated
reviewSchema.post('save', async function() {
  const Property = require('./Property');
  const stats = await this.constructor.calculateAverageRating(this.property);
  
  await Property.findByIdAndUpdate(this.property, {
    'rating.average': Math.round(stats.averageRating * 10) / 10,
    'rating.count': stats.totalReviews,
    'rating.breakdown': {
      cleanliness: Math.round(stats.cleanliness * 10) / 10,
      communication: Math.round(stats.communication * 10) / 10,
      checkIn: Math.round(stats.checkIn * 10) / 10,
      accuracy: Math.round(stats.accuracy * 10) / 10,
      location: Math.round(stats.location * 10) / 10,
      value: Math.round(stats.value * 10) / 10
    }
  });
});

reviewSchema.post('remove', async function() {
  const Property = require('./Property');
  const stats = await this.constructor.calculateAverageRating(this.property);
  
  await Property.findByIdAndUpdate(this.property, {
    'rating.average': Math.round(stats.averageRating * 10) / 10,
    'rating.count': stats.totalReviews,
    'rating.breakdown': {
      cleanliness: Math.round(stats.cleanliness * 10) / 10,
      communication: Math.round(stats.communication * 10) / 10,
      checkIn: Math.round(stats.checkIn * 10) / 10,
      accuracy: Math.round(stats.accuracy * 10) / 10,
      location: Math.round(stats.location * 10) / 10,
      value: Math.round(stats.value * 10) / 10
    }
  });
});

module.exports = mongoose.model('Review', reviewSchema); 