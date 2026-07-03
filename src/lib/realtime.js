import { EventEmitter } from 'events';

// In-process pub/sub bridge between the SePay webhook handler and the SSE stream.
// Stored on globalThis so it survives Next.js hot-reload / module re-evaluation and
// is shared across route handlers within the same Node process.
//
// NOTE: This works for a single-process deployment (typical `next start` on a VPS).
// If you scale to multiple processes (PM2 cluster), the webhook and the SSE stream
// may land on different workers — the SSE push would be missed. The payment page
// also polls the status endpoint as a fallback, so payment is still detected either
// way; only the "instant" push depends on same-process delivery. For multi-process
// instant delivery, back this bus with Redis pub/sub.
const g = globalThis;

if (!g.__studychillPaymentBus) {
  const bus = new EventEmitter();
  bus.setMaxListeners(0); // many concurrent SSE listeners
  g.__studychillPaymentBus = bus;
}

/** @type {import('events').EventEmitter} */
export const paymentBus = g.__studychillPaymentBus;

function eventName(registrationId) {
  return `paid:${registrationId}`;
}

// Called by the webhook once a payment is confirmed.
export function emitPaid(registrationId, payload = {}) {
  paymentBus.emit(eventName(registrationId), payload);
}

// Subscribe an SSE stream to a registration's payment event.
// Returns an unsubscribe function.
export function onPaid(registrationId, handler) {
  const evt = eventName(registrationId);
  paymentBus.on(evt, handler);
  return () => paymentBus.off(evt, handler);
}
