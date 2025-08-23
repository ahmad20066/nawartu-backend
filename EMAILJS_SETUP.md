# EmailJS Setup Guide

This guide explains how to set up and use EmailJS for sending emails in the Nawartu application.

## What is EmailJS?

EmailJS is a client-side email service that allows you to send emails directly from JavaScript without requiring a backend server. It's perfect for frontend applications that need to send emails.

## Setup Steps

### 1. Create an EmailJS Account

1. Go to [EmailJS.com](https://www.emailjs.com/)
2. Sign up for a free account
3. Verify your email address

### 2. Create an Email Service

1. In your EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the authentication steps
5. Note down your **Service ID**

### 3. Create Email Templates

1. Go to "Email Templates" in your dashboard
2. Click "Create New Template"
3. Design your email template using the variables:
   - `{{to_email}}` - Recipient's email
   - `{{to_name}}` - Recipient's name
   - `{{subject}}` - Email subject
   - `{{message}}` - Email message content
   - `{{booking_details}}` - JSON string with booking information
   - `{{user_details}}` - JSON string with user information
4. Note down your **Template ID**

### 4. Get Your User ID

1. In your dashboard, go to "Account" → "API Keys"
2. Copy your **User ID**

### 5. Environment Variables

Add these to your `.env` file:

```env
EMAILJS_SERVICE_ID=your_service_id_here
EMAILJS_TEMPLATE_ID=your_template_id_here
EMAILJS_USER_ID=your_user_id_here
```

### 6. Frontend Integration

In your frontend HTML, include the EmailJS SDK:

```html
<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>
```

Or install via npm:

```bash
npm install @emailjs/browser
```

Then import in your JavaScript:

```javascript
import emailjs from '@emailjs/browser';
```

## Usage Examples

### Sending a Welcome Email

```javascript
import { sendWelcomeEmail } from './services/email.js';

const user = {
  name: 'John Doe',
  email: 'john@example.com'
};

await sendWelcomeEmail(user);
```

### Sending a Booking Confirmation

```javascript
import { sendBookingConfirmationToGuest } from './services/email.js';

const booking = {
  checkIn: '2024-01-15',
  checkOut: '2024-01-18',
  guests: 2,
  totalPrice: 150,
  paymentMethod: 'Credit Card'
};

const guest = {
  name: 'Jane Smith',
  email: 'jane@example.com'
};

const property = {
  title: 'Cozy Damascus Apartment',
  location: {
    address: '123 Old City Street, Damascus'
  }
};

await sendBookingConfirmationToGuest(booking, guest, property);
```

## Template Variables

The email service sends these variables to your EmailJS templates:

### Common Variables
- `to_email` - Recipient's email address
- `to_name` - Recipient's name
- `subject` - Email subject line
- `message` - Formatted email message

### Booking-Specific Variables
- `booking_details` - JSON string containing:
  - `property_title`
  - `check_in`
  - `check_out`
  - `guests`
  - `total_price`
  - `payment_method`
  - `address`
  - `guest_name` (for host notifications)
  - `special_requests` (if applicable)
  - `status` (for status updates)

### User-Specific Variables
- `user_details` - JSON string containing:
  - `name`
  - `email`

## Error Handling

The service includes error handling and will:
- Log errors to the console
- Continue execution even if emails fail
- Warn if EmailJS is not available in the current environment

## Security Notes

- EmailJS credentials are stored in environment variables
- The service checks if EmailJS is available before attempting to send
- All email content is sanitized and formatted before sending

## Troubleshooting

### Common Issues

1. **"EmailJS not available" warning**
   - Make sure you've included the EmailJS SDK in your frontend
   - Check that you're running in a browser environment

2. **Emails not sending**
   - Verify your Service ID, Template ID, and User ID
   - Check that your email service is properly configured
   - Ensure your template variables match what the service sends

3. **Template not receiving variables**
   - Check the variable names in your EmailJS template
   - Verify the JSON structure of complex variables like `booking_details`

### Support

For EmailJS-specific issues, visit their [documentation](https://www.emailjs.com/docs/) or [support](https://www.emailjs.com/support/).
