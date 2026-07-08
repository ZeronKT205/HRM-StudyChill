import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Registration from '@/lib/models/Registration';

export const dynamic = 'force-dynamic';

function page(title, message) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
  <style>
    body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f6f1e3;color:#2a3114;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:20px}
    .card{background:#fff8eb;border:2px solid #2a3114;border-radius:16px;box-shadow:6px 6px 0 #2a3114;max-width:420px;padding:32px;text-align:center}
    h1{font-size:20px;margin:0 0 8px}
    p{color:#5a6340;font-size:14px;line-height:1.6;margin:0}
  </style></head>
  <body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`;
}

// GET /api/registrations/[id]/unsubscribe — public link from reminder emails.
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (mongoose.Types.ObjectId.isValid(id)) {
      await connectDB();
      await Registration.findByIdAndUpdate(id, { $set: { unsubscribed: true } });
    }
    return new Response(
      page('Đã hủy nhận email nhắc', 'Bạn sẽ không nhận thêm email nhắc thanh toán từ STUDYCHILL nữa. Cảm ơn bạn!'),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (error) {
    console.error('unsubscribe error:', error);
    return new Response(
      page('Có lỗi xảy ra', 'Không thể xử lý yêu cầu lúc này. Vui lòng thử lại sau.'),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
