const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'host', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  }],
  // Host-specific fields
  hostProfile: {
    bio: {
      type: String,
      trim: true
    },
    languages: [{
      type: String,
      enum: ['English', 'Arabic', 'French', 'Spanish', 'German', 'Italian', 'Russian', 'Other']
    }],
    responseTime: {
      type: String,
      enum: ['within_an_hour', 'few_hours', 'day', 'few_days'],
      default: 'day'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    superhost: {
      type: Boolean,
      default: false
    },
    superhostSince: {
      type: Date
    }
  },
  verification: {
    email: {
      verified: { type: Boolean, default: false },
      token: String,
      verifiedAt: Date
    },
    phone: {
      verified: { type: Boolean, default: false },
      code: String,
      verifiedAt: Date
    },
    identity: {
      verified: { type: Boolean, default: false },
      documentType: {
        type: String,
        enum: ['passport', 'drivers_license', 'national_id']
      },
      documentNumber: String,
      verifiedAt: Date
    },
    level: {
      type: String,
      enum: ['none', 'basic', 'intermediate', 'advanced'],
      default: 'none'
    }
  },
  hostSettings: {
    instantBook: {
      type: Boolean,
      default: false
    },
    advanceNotice: {
      type: String,
      enum: ['same_day', '1_day', '2_days', '3_days', '7_days'],
      default: '1_day'
    },
    bookingWindow: {
      type: String,
      enum: ['3_months', '6_months', '9_months', '12_months', 'unavailable'],
      default: '12_months'
    },
    minStay: {
      type: Number,
      default: 1,
      min: 1
    },
    maxStay: {
      type: Number,
      default: 30,
      min: 1
    }
  },
  // Host statistics (updated periodically)
  hostStats: {
    totalProperties: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    responseRate: { type: Number, default: 100, min: 0, max: 100 },
    acceptanceRate: { type: Number, default: 100, min: 0, max: 100 },
    lastCalculated: { type: Date, default: Date.now }
  },
  resetPassword: {
    code: String,
    expiresAt: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for host verification status
userSchema.virtual('verificationStatus').get(function () {
  const emailVerified = this.verification.email.verified;
  const phoneVerified = this.verification.phone.verified;
  const identityVerified = this.verification.identity.verified;

  if (emailVerified && phoneVerified && identityVerified) {
    return 'verified';
  } else if (emailVerified && phoneVerified) {
    return 'partially_verified';
  } else if (emailVerified) {
    return 'email_verified';
  } else {
    return 'unverified';
  }
});

// Method to update host statistics
userSchema.methods.updateHostStats = async function () {
  const Property = mongoose.model('Property');
  const Booking = mongoose.model('Booking');

  if (this.role !== 'host') return;

  // Get all properties for this host
  const properties = await Property.find({ host: this._id });

  // Get all bookings for this host
  const bookings = await Booking.find({ host: this._id });
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed');

  // Calculate statistics
  const totalRevenue = confirmedBookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
  const totalRating = properties.reduce((sum, prop) => sum + prop.rating.average, 0);
  const averageRating = properties.length > 0 ? totalRating / properties.length : 0;

  // Update stats
  this.hostStats = {
    totalProperties: properties.length,
    totalBookings: bookings.length,
    totalRevenue,
    averageRating: Math.round(averageRating * 100) / 100,
    responseRate: 100, // This would be calculated based on message response times
    acceptanceRate: bookings.length > 0 ? (confirmedBookings.length / bookings.length) * 100 : 100,
    lastCalculated: new Date()
  };

  await this.save();
};

// Static method to get hosts with statistics
userSchema.statics.getHostLeaderboard = async function (limit = 10) {
  return this.find({
    role: 'host',
    'hostStats.totalBookings': { $gt: 0 }
  })
    .sort({
      'hostProfile.superhost': -1,
      'hostStats.averageRating': -1,
      'hostStats.totalBookings': -1
    })
    .limit(limit)
    .select('name avatar hostProfile hostStats verification');
};

module.exports = mongoose.model('User', userSchema); 