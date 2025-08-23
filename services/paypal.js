const paypal = require('@paypal/checkout-server-sdk');

function environment() {
    let clientId = process.env.PAYPAL_CLIENT_ID;
    let clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (process.env.NODE_ENV === 'production') {
        return new paypal.core.LiveEnvironment(clientId, clientSecret);
    }

    return new paypal.core.SandboxEnvironment(clientId, clientSecret);
}

function client() {
    return new paypal.core.PayPalHttpClient(environment());
}

async function createOrder(booking, debug = false) {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
            amount: {
                currency_code: 'USD',
                value: booking.totalPrice.toString()
            },
            description: `Booking for ${booking.property.title}`,
            custom_id: booking._id.toString()
        }],
        application_context: {
            return_url: `${process.env.FRONTEND_URL}/payment/success`,
            cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
            brand_name: 'Nawartu',
            user_action: 'PAY_NOW'
        }
    });

    try {
        const response = await client().execute(request);
        return response.result;
    } catch (err) {
        console.error("Error creating PayPal order:", err);
        throw new Error("Failed to create PayPal order.");
    }
}

async function captureOrder(orderId, debug = false) {
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    try {
        const response = await client().execute(request);
        return response.result;
    } catch (err) {
        console.error("Error capturing PayPal order:", err);
        throw new Error("Failed to capture PayPal order.");
    }
}

async function getOrder(orderId) {
    let request = new paypal.orders.OrdersGetRequest(orderId);
    let response = await client().execute(request);
    return response.result;
}

module.exports = {
    createOrder,
    captureOrder,
    getOrder
}; 