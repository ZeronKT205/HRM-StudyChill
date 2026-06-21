import { NextResponse } from 'next/server';
import { getAuthSession, isAdmin } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';

// GET /api/stats - Get revenue statistics
export async function GET(request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const adminView = isAdmin(session);
    const matchQuery = adminView ? {} : { ctvEmail: session.user.email };

    // Total stats
    const [
      totalOrders,
      pendingOrders,
      approvedOrders,
      rejectedOrders,
      paidOrders,
      revenueAgg,
      monthlyAgg,
    ] = await Promise.all([
      Order.countDocuments(matchQuery),
      Order.countDocuments({ ...matchQuery, status: 'pending' }),
      Order.countDocuments({ ...matchQuery, status: 'approved' }),
      Order.countDocuments({ ...matchQuery, status: 'rejected' }),
      Order.countDocuments({ ...matchQuery, status: 'paid' }),
      Order.aggregate([
        { $match: { ...matchQuery, status: { $in: ['pending', 'approved', 'paid'] } } },
        { $group: { _id: null, total: { $sum: '$orderValue' } } },
      ]),
      Order.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            total: { $sum: '$orderValue' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 },
      ]),
    ]);

    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    // Format monthly data for charts
    const monthlyData = monthlyAgg.map(m => ({
      month: `${m._id.month}/${m._id.year}`,
      revenue: m.total,
      orders: m.count,
    }));

    // Top CTVs (admin only)
    let topCTVs = [];
    if (adminView) {
      topCTVs = await Order.aggregate([
        { $match: { status: { $in: ['pending', 'approved', 'paid'] } } },
        {
          $group: {
            _id: '$ctvEmail',
            ctvName: { $first: '$ctvName' },
            totalRevenue: { $sum: '$orderValue' },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
      ]);
    }

    return NextResponse.json({
      totalOrders,
      pendingOrders,
      approvedOrders,
      rejectedOrders,
      paidOrders,
      totalRevenue,
      monthlyData,
      topCTVs,
    });
  } catch (error) {
    console.error('GET /api/stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
