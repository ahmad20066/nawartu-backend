const mongoose = require('mongoose');
const Category = require('./category');
const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Property title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Property description is required']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  location: {
    address: {
      type: String,
      required: [true, 'Address is required']
    },
    neighborhood: {
      type: String,
      required: [true, 'Neighborhood is required']
    },
    city: {
      type: String,
      default: 'Damascus'
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },
  images: [{
    type: String,
    required: [true, 'At least one image is required']
  }],
  amenities: [{
    type: String,
    enum: [
      'Wi-Fi', 'Kitchen', 'Air Conditioning', 'Heating', 'TV',
      'Washing Machine', 'Free Parking', 'Balcony', 'Garden',
      'Pool', 'Gym', 'Security', 'Elevator', 'Pet Friendly'
    ]
  }],
  capacity: {
    guests: {
      type: Number,
      required: [true, 'Guest capacity is required'],
      min: 1
    },
    bedrooms: {
      type: Number,
      required: [true, 'Number of bedrooms is required'],
      min: 1
    },
    bathrooms: {
      type: Number,
      required: [true, 'Number of bathrooms is required'],
      min: 1
    }
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Host is required']
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    },
    breakdown: {
      cleanliness: { type: Number, default: 0, min: 0, max: 5 },
      communication: { type: Number, default: 0, min: 0, max: 5 },
      checkIn: { type: Number, default: 0, min: 0, max: 5 },
      accuracy: { type: Number, default: 0, min: 0, max: 5 },
      location: { type: Number, default: 0, min: 0, max: 5 },
      value: { type: Number, default: 0, min: 0, max: 5 }
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  propertyType: {
    type: String,
    enum: ['Apartment', 'House', 'Villa', 'Studio', 'Loft', 'Traditional'],
    required: [true, 'Property type is required']
  },
  instantBookable: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for search functionality
propertySchema.index({
  title: 'text',
  description: 'text',
  'location.neighborhood': 'text'
});

// Virtual for average rating calculation
propertySchema.virtual('averageRating').get(function () {
  if (this.reviews.length === 0) return 0;
  const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  return (sum / this.reviews.length).toFixed(1);
});

module.exports = mongoose.model('Property', propertySchema); 