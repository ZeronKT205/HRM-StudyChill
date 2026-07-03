import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Registration from '@/lib/models/Registration';
import { onPaid } from '@/lib/realtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/registrations/[id]/stream
// Server-Sent Events: pushes { type: 'paid' } the instant the SePay webhook
// confirms this registration's payment. Also emits an initial snapshot and a
// periodic heartbeat to keep the connection alive.
export async function GET(request, { params }) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return new Response('Not found', { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let heartbeat = null;
      let unsubscribe = () => {};

      const send = (obj) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          /* controller already closed */
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // Push instantly when the webhook confirms payment.
      unsubscribe = onPaid(id, () => {
        send({ type: 'paid' });
        close();
      });

      // Initial snapshot: if already paid (webhook arrived before this connected),
      // notify immediately; otherwise confirm we're listening.
      try {
        await connectDB();
        const reg = await Registration.findById(id).select('paymentStatus').lean();
        if (!reg) {
          send({ type: 'error', message: 'not_found' });
          return close();
        }
        if (reg.paymentStatus === 'paid') {
          send({ type: 'paid' });
          return close();
        }
        send({ type: 'pending' });
      } catch {
        send({ type: 'pending' });
      }

      // Heartbeat (comment line) every 20s to keep proxies from timing out.
      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          close();
        }
      }, 20000);

      // Clean up when the client disconnects.
      request.signal.addEventListener('abort', close);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering so events flush immediately
    },
  });
}
