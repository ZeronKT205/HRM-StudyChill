import nodemailer from 'nodemailer';

// Public "view full course" link (Google Sheet). Overridable via env.
const COURSE_VIEW_URL =
  process.env.COURSE_VIEW_URL ||
  'https://docs.google.com/spreadsheets/d/1ELtsqjpKLf3ICb116NAe6ACuIIKJmz2R/edit?gid=321020953#gid=321020953';

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

// Shared branded email shell.
function emailShell(innerHtml) {
  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #2a3114; border-radius: 12px; background-color: #fff8eb; box-shadow: 4px 4px 0px #2a3114;">
      <div style="text-align: center; border-bottom: 2px solid #2a3114; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="color: #2a3114; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">STUDYCHILL</h1>
        <p style="color: #5a6340; margin: 5px 0 0 0; font-size: 14px;">Hệ thống học tập và cung cấp tài liệu tự động</p>
      </div>
      <div style="font-size: 16px; color: #2a3114; line-height: 1.6;">
        ${innerHtml}
      </div>
      <div style="text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #d4ceb8; font-size: 12px; color: #8a9170;">
        <p>Cảm ơn bạn đã lựa chọn học tập cùng STUDYCHILL!</p>
        <p style="margin-top: 5px;">&copy; ${new Date().getFullYear()} STUDYCHILL. All rights reserved.</p>
      </div>
    </div>
  `;
}

/**
 * Step 1 email — sent right after a student submits the registration form, to
 * confirm the email address is correct before showing the QR payment screen.
 */
export async function sendRegistrationReceivedEmail(toEmail, comboName) {
  const mailOptions = {
    from: `"STUDYCHILL" <${process.env.SMTP_USER || 'tailieusv.desstar1@gmail.com'}>`,
    to: toEmail,
    subject: '[STUDYCHILL] Đã tiếp nhận đăng ký của bạn 📩',
    html: emailShell(`
      <p>Xin chào <strong>${toEmail}</strong>,</p>
      <p>Chúng tôi vừa tiếp nhận đơn hàng của bạn. Cảm ơn bạn đã tham khảo khóa học <strong>STUDYCHILL</strong>, chúc bạn học tốt!</p>
      ${comboName ? `<div style="background-color: #ffffff; padding: 15px; border: 2px solid #d4ceb8; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #5a6340; font-size: 13px; text-transform: uppercase; letter-spacing: .5px; font-weight: 700;">Gói bạn đã chọn</p>
        <p style="margin: 6px 0 0 0; font-weight: 700; color: #6a8042;">${comboName}</p>
      </div>` : ''}
      <div style="background-color: #fffadd; border-left: 4px solid #ed7a13; padding: 12px; margin: 20px 0; font-size: 14px; color: #5a6340;">
        Vui lòng hoàn tất thanh toán trên màn hình QR để chúng tôi xử lý đăng ký của bạn.
      </div>
    `),
  };
  return transporter.sendMail(mailOptions);
}

/**
 * Step 2 email — sent after the SePay webhook confirms payment succeeded.
 */
export async function sendRegistrationConfirmedEmail(toEmail, comboName) {
  const mailOptions = {
    from: `"STUDYCHILL" <${process.env.SMTP_USER || 'tailieusv.desstar1@gmail.com'}>`,
    to: toEmail,
    subject: '[STUDYCHILL] Xác nhận đăng ký khóa học thành công 🎉',
    html: emailShell(`
      <p>Xin chào <strong>${toEmail}</strong>,</p>
      <p>Xác nhận đăng ký khóa học tại <strong>STUDYCHILL</strong> thành công! 🎉</p>
      ${comboName ? `<div style="background-color: #ffffff; padding: 15px; border: 2px solid #d4ceb8; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #5a6340; font-size: 13px; text-transform: uppercase; letter-spacing: .5px; font-weight: 700;">Gói đã đăng ký</p>
        <p style="margin: 6px 0 0 0; font-weight: 700; color: #6a8042;">${comboName}</p>
      </div>` : ''}
      <div style="background-color: #fffadd; border-left: 4px solid #ed7a13; padding: 12px; margin: 20px 0; font-size: 14px; color: #5a6340;">
        Vui lòng chờ team duyệt và cấp quyền vào khóa học trong tối đa <strong>1 giờ</strong>. Chúng tôi sẽ gửi email khi khóa học được kích hoạt.
      </div>
    `),
  };
  return transporter.sendMail(mailOptions);
}

// Build the Drive folder links block used in activation emails.
function foldersLinksHtml(selectedFolders) {
  return selectedFolders && selectedFolders.length > 0
    ? `<div style="background-color: #f9f3e3; padding: 15px; border: 1px solid #d4ceb8; border-radius: 8px; margin: 20px 0;">
        <ul>${selectedFolders.map((f) => `
          <li>
            <strong>${f.folderName}</strong>:
            <a href="https://drive.google.com/drive/folders/${f.folderId}" target="_blank" style="color: #6a8042; font-weight: bold; text-decoration: underline;">
              Nhấn vào đây để truy cập thư mục
            </a>
          </li>`).join('')}</ul>
      </div>`
    : '';
}

/**
 * Sent to the customer the moment a CTV submits their order — confirms the order
 * was received (and that the email address is valid) while it awaits admin review.
 */
export async function sendOrderReceivedEmail(toEmail, courseDescription) {
  const mailOptions = {
    from: `"STUDYCHILL" <${process.env.SMTP_USER || 'tailieusv.desstar1@gmail.com'}>`,
    to: toEmail,
    subject: '[STUDYCHILL] Đã tiếp nhận đơn hàng của bạn 📩',
    html: emailShell(`
      <p>Xin chào <strong>${toEmail}</strong>,</p>
      <p>STUDYCHILL đã nhận được đơn hàng đăng ký của bạn. Bạn vui lòng chờ Admin duyệt, chúng tôi sẽ thông báo lại qua email khi khóa học được kích hoạt.</p>
      ${courseDescription ? `<div style="background-color: #ffffff; padding: 15px; border: 2px solid #d4ceb8; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #5a6340; font-size: 13px; text-transform: uppercase; letter-spacing: .5px; font-weight: 700;">Khóa học / sản phẩm</p>
        <p style="margin: 6px 0 0 0; font-weight: 700; color: #6a8042;">${courseDescription}</p>
      </div>` : ''}
      <div style="background-color: #fffadd; border-left: 4px solid #ed7a13; padding: 12px; margin: 20px 0; font-size: 14px; color: #5a6340;">
        Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email. Nếu cần hỗ trợ, hãy liên hệ với chúng tôi.
      </div>
    `),
  };
  return transporter.sendMail(mailOptions);
}

/**
 * Sent when a student submits the "Đăng ký học thử" (free trial) form.
 */
export async function sendTrialReceivedEmail(toEmail) {
  const mailOptions = {
    from: `"STUDYCHILL" <${process.env.SMTP_USER || 'tailieusv.desstar1@gmail.com'}>`,
    to: toEmail,
    subject: '[STUDYCHILL] Đã tiếp nhận đăng ký học thử 📩',
    html: emailShell(`
      <p>Xin chào <strong>${toEmail}</strong>,</p>
      <p>STUDYCHILL đã nhận được đăng ký <strong>học thử</strong> của bạn. Cảm ơn bạn đã quan tâm tới khóa học!</p>
      <div style="background-color: #fffadd; border-left: 4px solid #ed7a13; padding: 12px; margin: 20px 0; font-size: 14px; color: #5a6340;">
        Vui lòng chờ Admin duyệt, chúng tôi sẽ gửi email thông báo khi tài khoản học thử của bạn được kích hoạt.
      </div>
    `),
  };
  return transporter.sendMail(mailOptions);
}

/**
 * Sent when admin approves a trial registration.
 */
export async function sendTrialApprovedEmail(toEmail, selectedFolders) {
  const mailOptions = {
    from: `"STUDYCHILL" <${process.env.SMTP_USER || 'tailieusv.desstar1@gmail.com'}>`,
    to: toEmail,
    subject: '[STUDYCHILL] Đăng ký học thử đã được duyệt 🎉',
    html: emailShell(`
      <p>Xin chào <strong>${toEmail}</strong>,</p>
      <p>Đăng ký <strong>học thử</strong> của bạn tại STUDYCHILL đã được duyệt! 🎉</p>
      ${selectedFolders && selectedFolders.length > 0
        ? `<p>Bạn có thể truy cập tài liệu học thử qua các liên kết Google Drive dưới đây (đăng nhập bằng chính email <strong>${toEmail}</strong>):</p>${foldersLinksHtml(selectedFolders)}`
        : `<p>Tài khoản học thử của bạn đã được kích hoạt. Vui lòng dùng chính địa chỉ email <strong>${toEmail}</strong> này để truy cập tài liệu học tập (email của bạn đã được thêm vào nhóm học tập).</p>`}
      <div style="background-color: #fffadd; border-left: 4px solid #ed7a13; padding: 12px; margin: 20px 0; font-size: 14px; color: #5a6340;">
        Chúc bạn có trải nghiệm học thử thật hiệu quả. Nếu ưng ý, hãy đăng ký khóa học đầy đủ để không bỏ lỡ tài liệu nào nhé!
      </div>
    `),
  };
  return transporter.sendMail(mailOptions);
}

/**
 * Sent when someone tries to register a trial again with a phone/email that
 * already used the free trial. Nudges them to buy, and shares the full course view.
 */
export async function sendTrialAlreadyEmail(toEmail) {
  const mailOptions = {
    from: `"STUDYCHILL" <${process.env.SMTP_USER || 'tailieusv.desstar1@gmail.com'}>`,
    to: toEmail,
    subject: '[STUDYCHILL] Bạn đã dùng học thử — Xem toàn bộ khóa học 👀',
    html: emailShell(`
      <p>Xin chào <strong>${toEmail}</strong>,</p>
      <p>Bạn đã đăng ký <strong>học thử</strong> trước đó rồi. Để trải nghiệm trọn vẹn và đồng hành cùng STUDYCHILL <strong>đến hết kỳ thi THPT Quốc Gia</strong>, hãy đăng ký khóa học đầy đủ nhé!</p>
      <p>Trong lúc đó, bạn có thể xem <strong>toàn bộ khóa học</strong> tại đây:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${COURSE_VIEW_URL}" target="_blank" style="display: inline-block; background-color: #ed7a13; color: #ffffff; font-weight: 700; text-decoration: none; padding: 12px 24px; border: 2px solid #2a3114; border-radius: 10px; box-shadow: 3px 3px 0 #2a3114;">
          👀 VIEW FULL KHÓA HỌC
        </a>
      </div>
      <div style="background-color: #fffadd; border-left: 4px solid #ed7a13; padding: 12px; margin: 20px 0; font-size: 14px; color: #5a6340;">
        Đăng ký khóa học để được cấp quyền học đầy đủ tài liệu đến hết kỳ thi. Mọi thắc mắc vui lòng liên hệ đội ngũ STUDYCHILL.
      </div>
    `),
  };
  return transporter.sendMail(mailOptions);
}
