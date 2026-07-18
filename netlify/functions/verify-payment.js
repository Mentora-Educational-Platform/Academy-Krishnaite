const crypto = require('crypto');
const Razorpay = require('razorpay');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { userId, razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = body;

    if (!userId || !razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required parameters." })
      };
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!keyId || !keySecret || !supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server credentials are not configured in environment variables." })
      };
    }

    // Verify Razorpay Subscription Signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Signature verification failed." })
      };
    }

    // Fetch subscription details from Razorpay to verify the plan securely
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    const subscriptionDetails = await razorpay.subscriptions.fetch(razorpay_subscription_id);
    if (!subscriptionDetails || !subscriptionDetails.plan_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Could not retrieve subscription details from Razorpay." })
      };
    }

    // 1. Verify the subscription status
    if (!["authenticated", "active"].includes(subscriptionDetails.status)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `Subscription is not active. Current status: ${subscriptionDetails.status}`
        })
      };
    }

    // Map Razorpay plan ID to profile tier value
    const planMapping = {
      "plan_TEyQLwALGxwmId": "explorer",
      "plan_TEyR70F9KxvTRx": "pro"
    };

    const verifiedPlan = planMapping[subscriptionDetails.plan_id];
    if (!verifiedPlan) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Unauthorized or unrecognized Razorpay plan ID: ${subscriptionDetails.plan_id}` })
      };
    }

    // Initialize Supabase Client with service role key to bypass RLS policies
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('profiles')
      .update({
        tier: verifiedPlan,
        subscription_id: razorpay_subscription_id,
        subscription_status: subscriptionDetails.status, // 2. Store the actual subscription status
        payment_provider: 'razorpay'
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        success: true,
        tier: verifiedPlan,
        subscriptionId: razorpay_subscription_id
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
