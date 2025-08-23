const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { createOrder, captureOrder, getOrder } = require('../services/paypal');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/User');
const { sendBookingConfirmationToGuest, sendBookingNotificationToHost } = require('../services/email');

const router = express.Router();

// Create PayPal order
router.post('/paypal/create-order', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('property')
      .populate('guest')
      .populate('host');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.guest._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const paypalOrder = await createOrder(booking);

    res.json({
      orderID: paypalOrder.id,
      booking
    });
  } catch (error) {
    console.error('Create PayPal order error:', error);
    res.status(500).json({ message: 'Failed to create PayPal order' });
  }
});

// Capture PayPal payment
router.post('/paypal/capture', authenticateToken, async (req, res) => {
  try {
    const { orderID, bookingId } = req.body;
    const capture = await captureOrder(orderID);

    if (capture.status === 'COMPLETED') {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      booking.paymentStatus = 'paid';
      booking.paymentMethod = 'paypal';
      booking.paymentDetails = {
        paypalOrderId: orderID,
        captureId: capture.purchase_units[0].payments.captures[0].id
      };
      await booking.save();

      const populatedBooking = await Booking.findById(bookingId)
        .populate('property')
        .populate('guest')
        .populate('host');

      await sendBookingConfirmationToGuest(populatedBooking, populatedBooking.guest, populatedBooking.property);
      await sendBookingNotificationToHost(populatedBooking, populatedBooking.host, populatedBooking.property, populatedBooking.guest);

      res.json({
        message: 'Payment captured successfully',
        booking: populatedBooking
      });
    } else {
      res.status(400).json({ message: 'Payment capture failed' });
    }
  } catch (error) {
    console.error('Capture PayPal payment error:', error);
    res.status(500).json({ message: 'Failed to capture payment' });
  }
});

// Process cash payment
router.post('/cash', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('property')
      .populate('guest')
      .populate('host');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.guest._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    booking.paymentStatus = 'pending';
    booking.paymentMethod = 'cash';
    await booking.save();

    await sendBookingNotificationToHost(booking, booking.host, booking.property, booking.guest);

    res.json({
      message: 'Cash payment processed successfully',
      booking
    });
  } catch (error) {
    console.error('Cash payment error:', error);
    res.status(500).json({ message: 'Failed to process cash payment' });
  }
});

// Confirm cash payment
router.post('/cash/confirm', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('property')
      .populate('guest')
      .populate('host');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.host._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only host can confirm cash payment' });
    }

    booking.paymentStatus = 'paid';
    await booking.save();

    await sendBookingConfirmationToGuest(booking, booking.guest, booking.property);

    res.json({
      message: 'Cash payment confirmed successfully',
      booking
    });
  } catch (error) {
    console.error('Confirm cash payment error:', error);
    res.status(500).json({ message: 'Failed to confirm cash payment' });
  }
});

// Get payment status
router.get('/status/:bookingId', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('property')
      .populate('guest')
      .populate('host');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const isGuest = booking.guest._id.toString() === req.user._id.toString();
    const isHost = booking.host._id.toString() === req.user._id.toString();

    if (!isGuest && !isHost) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      booking
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ message: 'Failed to get payment status' });
  }
});

module.exports = router; 