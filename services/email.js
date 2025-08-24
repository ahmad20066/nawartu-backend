// EmailJS configuration
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'your_service_id';
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'your_template_id';
const EMAILJS_USER_ID = process.env.EMAILJS_USER_ID || 'your_user_id';

// Initialize EmailJS
const initEmailJS = () => {
  if (typeof window !== 'undefined' && window.emailjs) {
    window.emailjs.init(EMAILJS_USER_ID);
  }
};

// Send booking confirmation to guest
const sendBookingConfirmationToGuest = async (booking, guest, property) => {
  try {
    initEmailJS();

    const templateParams = {
      to_email: guest.email,
      to_name: guest.name,
      subject: `Booking Confirmed - ${property.title}`,
      message: `
        Your booking has been confirmed. Here are the details:
        
        Property: ${property.title}
        Check-in: ${new Date(booking.checkIn).toLocaleDateString()}
        Check-out: ${new Date(booking.checkOut).toLocaleDateString()}
        Guests: ${booking.guests}
        Total Price: $${booking.totalPrice}
        Payment Method: ${booking.paymentMethod}
        Address: ${property.location.address}
        
        Your host will contact you with check-in instructions closer to your arrival date.
        If you have any questions, please don't hesitate to contact us.
        
        Best regards,
        The Nawartu Team
      `,
      booking_details: JSON.stringify({
        property_title: property.title,
        check_in: new Date(booking.checkIn).toLocaleDateString(),
        check_out: new Date(booking.checkOut).toLocaleDateString(),
        guests: booking.guests,
        total_price: booking.totalPrice,
        payment_method: booking.paymentMethod,
        address: property.location.address
      })
    };

    if (typeof window !== 'undefined' && window.emailjs) {
      await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
      console.log('Booking confirmation email sent to guest');
    } else {
      console.warn('EmailJS not available in this environment');
    }
  } catch (error) {
    console.error('Error sending booking confirmation email to guest:', error);
  }
};

// Send booking notification to host
const sendBookingNotificationToHost = async (booking, host, property, guest) => {
  try {
    initEmailJS();

    const templateParams = {
      to_email: host.email,
      to_name: host.name,
      subject: `New Booking Request - ${property.title}`,
      message: `
        You have received a new booking request for your property. Here are the details:
        
        Property: ${property.title}
        Guest: ${guest.name}
        Check-in: ${new Date(booking.checkIn).toLocaleDateString()}
        Check-out: ${new Date(booking.checkOut).toLocaleDateString()}
        Guests: ${booking.guests}
        Total Price: $${booking.totalPrice}
        Payment Method: ${booking.paymentMethod}
        ${booking.specialRequests ? `Special Requests: ${booking.specialRequests}` : ''}
        
        Please log in to your dashboard to confirm or decline this booking.
        
        Best regards,
        The Nawartu Team
      `,
      booking_details: JSON.stringify({
        property_title: property.title,
        guest_name: guest.name,
        check_in: new Date(booking.checkIn).toLocaleDateString(),
        check_out: new Date(booking.checkOut).toLocaleDateString(),
        guests: booking.guests,
        total_price: booking.totalPrice,
        payment_method: booking.paymentMethod,
        special_requests: booking.specialRequests || ''
      })
    };

    if (typeof window !== 'undefined' && window.emailjs) {
      await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
      console.log('Booking notification email sent to host');
    } else {
      console.warn('EmailJS not available in this environment');
    }
  } catch (error) {
    console.error('Error sending booking notification email to host:', error);
  }
};

// Send booking status update
const sendBookingStatusUpdate = async (booking, user, property, status) => {
  try {
    initEmailJS();

    const statusMessages = {
      confirmed: 'Your booking has been confirmed by the host!',
      cancelled: 'Your booking has been cancelled.',
      completed: 'Your stay has been completed. We hope you enjoyed it!'
    };

    const templateParams = {
      to_email: user.email,
      to_name: user.name,
      subject: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)} - ${property.title}`,
      message: `
        ${statusMessages[status]}
        
        Property: ${property.title}
        Check-in: ${new Date(booking.checkIn).toLocaleDateString()}
        Check-out: ${new Date(booking.checkOut).toLocaleDateString()}
        Total Price: $${booking.totalPrice}
        
        Best regards,
        The Nawartu Team
      `,
      booking_details: JSON.stringify({
        status: status,
        property_title: property.title,
        check_in: new Date(booking.checkIn).toLocaleDateString(),
        check_out: new Date(booking.checkOut).toLocaleDateString(),
        total_price: booking.totalPrice
      })
    };

    if (typeof window !== 'undefined' && window.emailjs) {
      await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
      console.log(`Booking status update email sent to ${user.email}`);
    } else {
      console.warn('EmailJS not available in this environment');
    }
  } catch (error) {
    console.error('Error sending booking status update email:', error);
  }
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  try {
    initEmailJS();

    const templateParams = {
      to_email: user.email,
      to_name: user.name,
      subject: 'Welcome to Nawartu! 🏠',
      message: `
        Welcome to Nawartu, your premier destination for discovering unique homes in Damascus!
        
        We're excited to have you join our community. Here's what you can do:
        • Browse and book amazing properties
        • List your own property to host guests
        • Connect with local hosts
        • Experience authentic Syrian hospitality
        
        If you have any questions or need assistance, feel free to reach out to our support team.
        
        Happy exploring!
        The Nawartu Team
      `,
      user_details: JSON.stringify({
        name: user.name,
        email: user.email
      })
    };

    if (typeof window !== 'undefined' && window.emailjs) {
      await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
      console.log('Welcome email sent to new user');
    } else {
      console.warn('EmailJS not available in this environment');
    }
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};

// Send reset password email

const sendResetPasswordEmail = async (user, code) => {
  try {
    initEmailJS();
    const templateParams = {
      to_email: user.email,
      to_name: user.name,
      subject: 'Reset Your Nawartu Password',
      message: `
        Hello ${user.name},

        You have requested to reset your password. Here is your reset code:

        ${code}

        This code will expire in 15 minutes.

        If you did not request this password reset, please ignore this email or contact support if you have concerns.

        Best regards,
        The Nawartu Team
      `
    };

    console.log("1");
    if (typeof window !== 'undefined' && window.emailjs) {
      console.log("2");
      await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
      console.log('Reset password email sent to user');
    } else {
      console.warn('EmailJS not available in this environment');
    }
    return true;
  } catch (error) {
    console.error('Error sending reset password email:', error);
    return false;
  }
};

module.exports = {
  sendBookingConfirmationToGuest,
  sendBookingNotificationToHost,
  sendBookingStatusUpdate,
  sendWelcomeEmail,
  sendResetPasswordEmail
}; 