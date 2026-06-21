import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // false for TLS (587), true for SSL (465)
  auth: {
    user: process.env.SMTP_USER || 'tailieusv.desstar1@gmail.com',
    pass: process.env.SMTP_PASS || 'ibwm phji luad niew',
  },
});

/**
 * Send an approval confirmation email to the customer with their course folders.
 * @param {string} toEmail - Customer's email.
 * @param {string} courseDescription - Details of the courses.
 * @param {Array} selectedFolders - The folders shared with the customer.
 */
export async function sendApprovalEmail(toEmail, courseDescription, selectedFolders) {
  const foldersListHtml = selectedFolders && selectedFolders.length > 0
    ? `<ul>${selectedFolders.map(f => `
        <li>
          <strong>${f.folderName}</strong>: 
          <a href="https://drive.google.com/drive/folders/${f.folderId}" target="_blank" style="color: #6a8042; font-weight: bold; text-decoration: underline;">
            Nhấn vào đây để truy cập thư mục
          </a>
        </li>
      `).join('')}</ul>`
    : '<p>Vui lòng kiểm tra email của bạn hoặc liên hệ hỗ trợ để nhận liên kết học tập.</p>';

  const mailOptions = {
    from: `"STUDYCHILL" <${process.env.SMTP_USER || 'tailieusv.desstar1@gmail.com'}>`,
    to: toEmail,
    subject: '[STUDYCHILL] Kích Hoạt Khóa Học/Tài Liệu Thành Công 🎉',
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #2a3114; border-radius: 12px; background-color: #fff8eb; box-shadow: 4px 4px 0px #2a3114;">
        <div style="text-align: center; border-bottom: 2px solid #2a3114; padding-bottom: 15px; margin-bottom: 20px;">
          <h1 style="color: #2a3114; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">STUDYCHILL</h1>
          <p style="color: #5a6340; margin: 5px 0 0 0; font-size: 14px;">Hệ thống học tập và cung cấp tài liệu tự động</p>
        </div>
        
        <div style="font-size: 16px; color: #2a3114; line-height: 1.6;">
          <p>Xin chào <strong>${toEmail}</strong>,</p>
          <p>Chúc mừng bạn! Đơn hàng đăng ký tài liệu của bạn đã được duyệt và kích hoạt thành công trên hệ thống của chúng tôi.</p>
          
          <div style="background-color: #ffffff; padding: 15px; border: 2px solid #d4ceb8; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #6a8042; font-size: 16px; border-bottom: 1px solid #efead8; padding-bottom: 5px;">Thông tin khóa học:</h3>
            <p style="margin: 8px 0; font-weight: 600;">${courseDescription}</p>
          </div>

          <p>Thư mục học tập của bạn trên <strong>Google Drive</strong> đã được cấp quyền truy cập. Bạn có thể mở trực tiếp bằng các liên kết dưới đây:</p>
          
          <div style="background-color: #f9f3e3; padding: 15px; border: 1px solid #d4ceb8; border-radius: 8px; margin: 20px 0;">
            ${foldersListHtml}
          </div>

          <div style="background-color: #fffadd; border-left: 4px solid #ed7a13; padding: 12px; margin: 20px 0; font-size: 14px; color: #5a6340;">
            <strong>Lưu ý quan trọng:</strong> Vui lòng đăng nhập Google Drive bằng chính địa chỉ email <strong>${toEmail}</strong> để truy cập các thư mục trên. Nếu gặp bất kỳ khó khăn nào, vui lòng liên hệ Admin để được hỗ trợ.
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #d4ceb8; font-size: 12px; color: #8a9170;">
          <p>Cảm ơn bạn đã lựa chọn học tập cùng STUDYCHILL!</p>
          <p style="margin-top: 5px;">&copy; ${new Date().getFullYear()} STUDYCHILL. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}
