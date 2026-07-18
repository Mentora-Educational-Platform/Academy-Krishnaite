const Razorpay = require('razorpay');

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { plan } = body;

    if (!plan || (plan !== "explorer" && plan !== "pro")) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid plan. Must be 'explorer' or 'pro'." })
      };
    }

    const planMapping = {
      explorer: "plan_TEyQLwALGxwmId",
      pro: "plan_TEyR70F9KxvTRx"
    };

    const planId = planMapping[plan];

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Razorpay credentials are not configured in environment variables." })
      };
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 120,
      customer_notify: 1
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        subscriptionId: subscription.id,
        planId: planId,
        status: subscription.status || "created"
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: error.message || error })
    };
  }
};
