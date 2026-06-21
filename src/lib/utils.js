import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Helper to get the current session and check auth
 */
export async function getAuthSession() {
  const session = await getServerSession(authOptions);
  return session;
}

/**
 * Check if user is admin
 */
export function isAdmin(session) {
  return session?.user?.email === process.env.ADMIN_EMAIL || session?.user?.role === 'admin';
}

/**
 * Format currency to VNĐ
 */
export function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

/**
 * Format date to Vietnamese locale
 */
export function formatDate(date) {
  return new Date(date).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
