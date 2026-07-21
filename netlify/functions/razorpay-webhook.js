/**
 * razorpay-webhook.js
 *
 * Netlify Function — Razorpay Payment Page Webhook Handler
 *
 * Responsibilities:
 *   1. Verify Razorpay webhook signature (RAZORPAY_WEBHOOK_SECRET).
 *   2. Accept only `payment.captured` events.
 *   3. Match customer email → Supabase profiles row.
 *   4. Guard against duplicate upgrades (idempotency via payment_id).
 *   5. Upgrade matched profile to Explorer Lifetime tier.
 *
 * Does NOT modify:
 *   - verify-payment.js
 *   - create-subscription.js
 *   - Any existing subscription, auth, or community logic.
 *
 * Environment Variables Required:
 *   RAZORPAY_WEBHOOK_SECRET   — Webhook secret set in Razorpay Dashboard
 *   SUPABASE_PROJECT_URL      — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key (bypasses RLS)
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {

  // ── 1. Only accept POST ───────────────────────────────────────────────────
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // ── 2. Read environment variables ─────────────────────────────────────────
  const webhookSecret    = process.env.RAZORPAY_WEBHOOK_SECRET;
  const supabaseUrl      = process.env.SUPABASE_PROJECT_URL;
  const supabaseService  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!webhookSecret || !supabaseUrl || !supabaseService) {
    console.error('[razorpay-webhook] Missing required environment variables.');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration.' }) };
  }

  // ── 3. Verify Razorpay webhook signature ──────────────────────────────────
  const receivedSignature = event.headers['x-razorpay-signature'];
  if (!receivedSignature) {
    console.warn('[razorpay-webhook] Missing x-razorpay-signature header.');
    return { statusCode: 401, body: JSON.stringify({ error: 'Missing webhook signature.' }) };
  }

  const rawBody = event.body || '';

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (expectedSignature !== receivedSignature) {
    console.warn('[razorpay-webhook] Signature mismatch — rejecting request.');
    return { statusCode: 401, body: JSON.stringify({ error: 'Webhook signature verification failed.' }) };
  }

  // ── 4. Parse payload ──────────────────────────────────────────────────────
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON payload.' }) };
  }

  const event_type = payload.event;

  // ── 5. Only process payment.captured ─────────────────────────────────────
  if (event_type !== 'payment.captured') {
    console.log(`[razorpay-webhook] Ignoring event: ${event_type}`);
    return { statusCode: 200, body: JSON.stringify({ received: true, processed: false }) };
  }

  // ── 6. Extract payment details ────────────────────────────────────────────
  const payment = payload?.payload?.payment?.entity;
  if (!payment) {
    console.warn('[razorpay-webhook] No payment entity found in payload.');
    return { statusCode: 200, body: JSON.stringify({ received: true, processed: false }) };
  }

  const paymentId      = payment.id          || null;
  const orderId        = payment.order_id    || null;
  const customerPhone  = payment.contact     || null;
  const amount         = payment.amount      || 0;   // in paise
  const method         = payment.method      || null;

  // Payment Page details (present on Payment Page payments)
  const paymentPageId    = payment.invoice_id      || null;
  const paymentPageTitle = payment.description     || null;

  // ── Email extraction: fallback chain across all known payload locations ──
  // Razorpay Payment Pages can surface the customer email in several places
  // depending on the payment method, SDK version, and checkout configuration.
  const customerEmail = (
    payment.email                                                   // standard
    || payment?.customer_details?.email                             // Payment Page customer_details block
    || payload?.payload?.payment?.entity?.email                     // explicit full path (redundant safety)
    || payload?.payload?.payment?.entity?.customer_details?.email   // explicit full path + customer_details
    || payload?.payload?.order?.entity?.customer_details?.email     // order-level customer_details
    || null
  );

  // Sanitized entity snapshot for debugging (strip card / UPI / bank fields)
  if (!customerEmail) {
    const { card, upi, bank, wallet, ...safePayment } = payment;
    console.warn('[razorpay-webhook] Could not extract customer email. Sanitized payment entity:', JSON.stringify(safePayment, null, 2));
  }

  console.log('[razorpay-webhook] payment.captured received:', {
    paymentId,
    orderId,
    customerEmail,
    amount: `₹${amount / 100}`,
    method,
    paymentPageId
  });

  if (!customerEmail) {
    console.warn('[razorpay-webhook] No customer email in payment payload.');
    return { statusCode: 200, body: JSON.stringify({ received: true, processed: false, reason: 'No email.' }) };
  }

  // ── 7. Connect to Supabase ────────────────────────────────────────────────
  const supabase = createClient(supabaseUrl, supabaseService);

  // ── 8. Find matching Krishnaite profile by email ──────────────────────────
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, tier, payment_id')
    .eq('email', customerEmail.toLowerCase().trim())
    .maybeSingle();

  if (profileErr) {
    console.error('[razorpay-webhook] Supabase profile lookup error:', profileErr.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Database error during profile lookup.' }) };
  }

  if (!profile) {
    console.log(`[razorpay-webhook] Profile not found for email: ${customerEmail}`);
    // Return 200 — not our user, but we must not reject Razorpay's webhook delivery.
    return { statusCode: 200, body: JSON.stringify({ received: true, processed: false, reason: 'Profile not found.' }) };
  }

  // ── 9. Idempotency guard — prevent duplicate upgrades ────────────────────
  if (profile.payment_id && profile.payment_id === paymentId) {
    console.log(`[razorpay-webhook] Duplicate delivery for payment_id ${paymentId} — skipping.`);
    return { statusCode: 200, body: JSON.stringify({ received: true, processed: false, reason: 'Already processed.' }) };
  }

  // ── 10. Upgrade profile to Explorer Lifetime ──────────────────────────────
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      tier:                'explorer',
      payment_provider:    'razorpay',
      subscription_status: 'lifetime',
      payment_id:          paymentId,
      payment_page:        paymentPageId,
      payment_date:        new Date().toISOString(),
      subscription_id:     null          // lifetime purchase — no subscription
    })
    .eq('id', profile.id);

  if (updateErr) {
    console.error('[razorpay-webhook] Failed to upgrade profile:', updateErr.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to upgrade profile.' }) };
  }

  // ── 11. Log success ───────────────────────────────────────────────────────
  console.log('[razorpay-webhook] Explorer Lifetime Activated:', {
    email:     customerEmail,
    paymentId: paymentId,
    amount:    `₹${amount / 100}`
  });

  // ── 12. Return 200 OK ─────────────────────────────────────────────────────
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      received:  true,
      processed: true,
      tier:      'explorer',
      status:    'lifetime'
    })
  };
};
