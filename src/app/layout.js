import './globals.css';
import AuthProvider from '@/components/AuthProvider';

export const metadata = {
  title: 'Tài Liệu Chill Chill - Hệ Thống Quản Lý Đơn Hàng CTV',
  description: 'Hệ thống tự động hóa quy trình nhập đơn hàng cho Cộng Tác Viên (CTV) của Tài Liệu Chill Chill. Quản lý đơn hàng, thống kê doanh thu, và tích hợp Google Drive.',
  keywords: 'CTV, cộng tác viên, quản lý đơn hàng, Google Drive, doanh thu, tài liệu chill chill',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
