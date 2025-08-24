const express = require('express');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const { authenticateToken } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// Get user's bookings (as guest)
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ guest: req.user._id })
      .populate('property', 'title images location price')
      .populate('host', 'name avatar')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// Get host's bookings (as host)
router.get('/my-properties-bookings', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ host: req.user._id })
      .populate('property', 'title images location')
      .populate('guest', 'name avatar')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('Get property bookings error:', error);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// Get single booking
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('property', 'title images location price host')
      .populate('guest', 'name avatar phone')
      .populate('host', 'name avatar phone');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is authorized to view this booking
    if (booking.guest._id.toString() !== req.user._id.toString() &&
      booking.host._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ message: 'Failed to fetch booking' });
  }
});

// Create new booking
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { propertyId, checkIn, checkOut, guests, specialRequests, paymentintentid, paymentmethod } = req.body;

    // Get property details
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    if (paymentmethod === 'stripe') {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentintentid);
      console.log(paymentIntent);
      if (!paymentIntent) {
        return res.status(400).json({ message: 'Invalid payment' });
      }
    }
    // Check if property is available
    if (!property.isAvailable) {
      return res.status(400).json({ message: 'Property is not available' });
    }

    // Check availability for the dates
    const isAvailable = await Booking.checkAvailability(propertyId, new Date(checkIn), new Date(checkOut));
    if (!isAvailable) {
      return res.status(400).json({ message: 'Property is not available for these dates' });
    }

    // Calculate total price
    const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    const totalPrice = nights * property.price;

    // Set payment status based on payment method
    let paymentStatus = 'pending';
    if (paymentmethod === 'cash') {
      paymentStatus = 'pending'; // Cash payments are pending until confirmed by host
    }

    const booking = new Booking({
      property: propertyId,
      guest: req.user._id,
      host: property.host,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guests,
      totalPrice,
      specialRequests,
      paymentMethod: paymentmethod || 'credit_card',
      paymentStatus
    });

    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('property', 'title images location price')
      .populate('host', 'name avatar')
      .populate('guest', 'name email');

    // Send notification email to host
    const { sendBookingNotificationToHost } = require('../services/email');
    await sendBookingNotificationToHost(populatedBooking, populatedBooking.host, populatedBooking.property, populatedBooking.guest);

    res.status(201).json({
      message: 'Booking created successfully',
      booking: populatedBooking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Failed to create booking' });
  }
});

// Update booking status (host can confirm/cancel, guest can cancel)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, cancellationReason } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check authorization
    const isGuest = booking.guest.toString() === req.user._id.toString();
    const isHost = booking.host.toString() === req.user._id.toString();

    if (!isGuest && !isHost) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // // Validate status changes
    // if (status === 'cancelled') {
    //   if (!isGuest && !isHost) {
    //     return res.status(403).json({ message: 'Not authorized to cancel' });
    //   }
    // } else if (status === 'confirmed') {
    //   if (!isHost) {
    //     return res.status(403).json({ message: 'Only host can confirm booking' });
    //   }
    // }

    // Update booking
    booking.status = status;
    if (cancellationReason) {
      booking.cancellationReason = cancellationReason;
    }

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('property', 'title images location')
      .populate('guest', 'name avatar email')
      .populate('host', 'name avatar email');

    // Send status update emails
    const { sendBookingStatusUpdate, sendBookingConfirmationToGuest } = require('../services/email');

    if (status === 'confirmed') {
      await sendBookingConfirmationToGuest(updatedBooking, updatedBooking.guest, updatedBooking.property);
    } else if (status === 'cancelled' || status === 'completed') {
      await sendBookingStatusUpdate(updatedBooking, updatedBooking.guest, updatedBooking.property, status);
    }

    res.json({
      message: 'Booking status updated successfully',
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Failed to update booking status' });
  }
});

// Add review to booking
router.post('/:id/review', authenticateToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is the guest
    if (booking.guest.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only guest can review' });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Can only review completed bookings' });
    }

    // Check if already reviewed
    if (booking.review) {
      return res.status(400).json({ message: 'Booking already reviewed' });
    }

    booking.review = {
      rating,
      comment,
      date: new Date()
    };

    await booking.save();

    // Update property rating
    const property = await Property.findById(booking.property);
    property.reviews.push({
      user: req.user._id,
      rating,
      comment
    });

    const totalRating = property.reviews.reduce((sum, review) => sum + review.rating, 0);
    property.rating.average = totalRating / property.reviews.length;
    property.rating.count = property.reviews.length;

    await property.save();

    res.json({
      message: 'Review added successfully',
      booking
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ message: 'Failed to add review' });
  }
});

// Check property availability
router.get('/property/:propertyId/availability', async (req, res) => {
  try {
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({ message: 'Check-in and check-out dates are required' });
    }

    const isAvailable = await Booking.checkAvailability(
      req.params.propertyId,
      new Date(checkIn),
      new Date(checkOut)
    );

    res.json({ isAvailable });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({ message: 'Failed to check availability' });
  }
});
// Create PaymentIntent (called before frontend payment)
router.post("/create-payment-intent", async (req, res) => {
  const { amount, currency } = req.body;
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
  });

  res.send({
    clientSecret: paymentIntent.client_secret, // send to frontend
  });
});

module.exports = router; 