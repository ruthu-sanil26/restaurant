const nodemailer = require('nodemailer');

/**
 * Creates a nodemailer transporter using Gmail SMTP (free).
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD in .env
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};

/**
 * Sends a reservation confirmation/request email to the customer.
 * @param {Object} reservation - The Mongoose Reservation document.
 * @param {Boolean} isConfirmed - true = confirmed by admin, false = pending request.
 */
const sendReservationEmail = async (reservation, isConfirmed = false) => {
  if (!reservation.customerEmail) return;
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('[Email] Gmail credentials not set in .env — skipping email.');
    return;
  }

  const statusLabel = isConfirmed ? '✅ CONFIRMED' : '📩 REQUESTED';
  const statusColor = isConfirmed ? '#16a34a' : '#d97706';
  const subject = isConfirmed
    ? `✅ Your Table is Confirmed! – Royal Rasoi (${reservation.bookingCode})`
    : `📩 Reservation Received – Royal Rasoi (${reservation.bookingCode})`;

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <style>
      body { margin: 0; padding: 0; background: #f8fafc; font-family: 'Segoe UI', Arial, sans-serif; }
      .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
      .header { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 36px 32px; text-align: center; }
      .header h1 { color: #f59e0b; font-size: 28px; margin: 0 0 6px; letter-spacing: 1px; }
      .header p { color: #94a3b8; margin: 0; font-size: 14px; }
      .status-badge { display: inline-block; margin: 24px auto 0; padding: 8px 24px; border-radius: 30px; font-weight: 700; font-size: 15px; background: ${statusColor}1a; color: ${statusColor}; border: 1.5px solid ${statusColor}; }
      .body { padding: 32px; }
      .greeting { font-size: 16px; color: #334155; margin-bottom: 20px; }
      .ticket { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
      .ticket-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid #e2e8f0; }
      .ticket-row:last-child { border-bottom: none; }
      .t-label { font-size: 13px; color: #64748b; font-weight: 600; }
      .t-value { font-size: 14px; color: #0f172a; font-weight: 700; text-align: right; }
      .ref-box { text-align: center; margin: 20px 0; padding: 16px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 10px; }
      .ref-label { font-size: 11px; font-weight: 700; color: #92400e; letter-spacing: 1px; text-transform: uppercase; }
      .ref-code { font-size: 26px; font-weight: 900; color: #78350f; letter-spacing: 3px; margin-top: 4px; }
      .footer { background: #0f172a; padding: 20px 32px; text-align: center; }
      .footer p { color: #64748b; font-size: 12px; margin: 0; }
      .footer a { color: #f59e0b; text-decoration: none; }
      .cta { display: block; text-align: center; margin: 20px 0 8px; }
      .cta a { background: #f59e0b; color: #0f172a; font-weight: 700; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="header">
        <h1>🍽️ Royal Rasoi</h1>
        <p>Fine Dining &amp; Reservations</p>
        <div class="status-badge">${statusLabel}</div>
      </div>
      <div class="body">
        <p class="greeting">Dear <strong>${reservation.customerName}</strong>,</p>
        <p style="color:#334155;font-size:15px;">
          ${isConfirmed
            ? 'Great news! Your table reservation has been <strong>confirmed</strong> by our team. We look forward to welcoming you!'
            : 'We have received your reservation request. Our team will review and confirm it shortly.'}
        </p>

        <div class="ref-box">
          <div class="ref-label">Booking Reference</div>
          <div class="ref-code">${reservation.bookingCode || 'RR-BOOKED'}</div>
        </div>

        <div class="ticket">
          <div class="ticket-row">
            <span class="t-label">📅 Date &amp; Time</span>
            <span class="t-value">${reservation.date} at ${reservation.time}</span>
          </div>
          <div class="ticket-row">
            <span class="t-label">👥 Party Size</span>
            <span class="t-value">${reservation.partySize} Guest(s)</span>
          </div>
          <div class="ticket-row">
            <span class="t-label">🪑 Seating Area</span>
            <span class="t-value">${reservation.tableNumber || 'Main Dining'}</span>
          </div>
          <div class="ticket-row">
            <span class="t-label">✨ Occasion</span>
            <span class="t-value">${reservation.occasion || 'Casual Dining'}</span>
          </div>
          <div class="ticket-row">
            <span class="t-label">📞 Phone</span>
            <span class="t-value">${reservation.customerPhone}</span>
          </div>
        </div>

        ${reservation.notes ? `<p style="background:#fef3c7;border-left:3px solid #f59e0b;padding:10px 14px;border-radius:0 8px 8px 0;font-size:13px;color:#78350f;"><strong>Special Request:</strong> "${reservation.notes}"</p>` : ''}

        <p style="font-size:13px;color:#64748b;margin-top:20px;">
          Please arrive 5 minutes before your reserved time. For changes or cancellations, 
          contact us at least 2 hours in advance.
        </p>
      </div>
      <div class="footer">
        <p>Royal Rasoi &bull; Fine Dining Restaurant &bull; <a href="#">View Online</a></p>
        <p style="margin-top:6px;">This is an automated message. Please do not reply.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Royal Rasoi 🍽️" <${process.env.GMAIL_USER}>`,
      to: reservation.customerEmail,
      subject,
      html
    });
    console.log(`[Email] Reservation email sent to ${reservation.customerEmail}`);
  } catch (err) {
    console.error('[Email] Failed to send reservation email:', err.message);
  }
};

/**
 * Sends a bill email with the attached PDF to the customer.
 * @param {Object} order - The Mongoose Order document.
 * @param {Buffer} pdfBuffer - The generated PDF buffer.
 */
const sendBillEmail = async (order, pdfBuffer) => {
  if (!order.customerEmail) return;
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('[Email] Gmail credentials not set in .env — skipping bill email.');
    return;
  }

  const subject = `🧾 Your Bill from Royal Rasoi`;

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <style>
      body { margin: 0; padding: 0; background: #f8fafc; font-family: 'Segoe UI', Arial, sans-serif; }
      .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
      .header { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 36px 32px; text-align: center; }
      .header h1 { color: #f59e0b; font-size: 28px; margin: 0 0 6px; letter-spacing: 1px; }
      .header p { color: #94a3b8; margin: 0; font-size: 14px; }
      .body { padding: 32px; }
      .greeting { font-size: 16px; color: #334155; margin-bottom: 20px; }
      .footer { background: #0f172a; padding: 20px 32px; text-align: center; }
      .footer p { color: #64748b; font-size: 12px; margin: 0; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="header">
        <h1>🍽️ Royal Rasoi</h1>
        <p>Thank You For Dining With Us</p>
      </div>
      <div class="body">
        <p class="greeting">Dear <strong>${order.customerName || 'Guest'}</strong>,</p>
        <p style="color:#334155;font-size:15px;">
          Thank you for dining at Royal Rasoi. We hope you enjoyed your meal!
        </p>
        <p style="color:#334155;font-size:15px;">
          Please find your bill attached to this email.
        </p>
      </div>
      <div class="footer">
        <p>Royal Rasoi &bull; Fine Dining Restaurant</p>
        <p style="margin-top:6px;">This is an automated message. Please do not reply.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Royal Rasoi 🍽️" <${process.env.GMAIL_USER}>`,
      to: order.customerEmail,
      subject,
      html,
      attachments: [
        {
          filename: `bill-${order._id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });
    console.log(`[Email] Bill email sent to ${order.customerEmail}`);
  } catch (err) {
    console.error('[Email] Failed to send bill email:', err.message);
  }
};

/**
 * Sends an OTP email to the customer.
 * @param {String} email - The customer's email address.
 * @param {String} code - The 6-digit OTP code.
 */
const sendOTPEmail = async (email, code) => {
  if (!email) return;
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('[Email] Gmail credentials not set in .env — skipping OTP email.');
    return;
  }

  const subject = `Your Verification Code – Royal Rasoi`;

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <style>
      body { margin: 0; padding: 0; background: #f8fafc; font-family: 'Segoe UI', Arial, sans-serif; }
      .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
      .header { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 36px 32px; text-align: center; }
      .header h1 { color: #f59e0b; font-size: 28px; margin: 0 0 6px; letter-spacing: 1px; }
      .body { padding: 32px; text-align: center; }
      .code-box { display: inline-block; padding: 12px 24px; background: #fef3c7; border: 2px dashed #f59e0b; border-radius: 8px; font-size: 32px; font-weight: bold; color: #92400e; letter-spacing: 4px; margin: 20px 0; }
      .footer { background: #0f172a; padding: 20px 32px; text-align: center; }
      .footer p { color: #64748b; font-size: 12px; margin: 0; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="header">
        <h1>🍽️ Royal Rasoi</h1>
      </div>
      <div class="body">
        <p style="color:#334155;font-size:16px;">Here is your verification code:</p>
        <div class="code-box">${code}</div>
        <p style="color:#64748b;font-size:14px;">This code is valid for 5 minutes. Please do not share it with anyone.</p>
      </div>
      <div class="footer">
        <p>Royal Rasoi &bull; Fine Dining Restaurant</p>
      </div>
    </div>
  </body>
  </html>
  `;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Royal Rasoi 🍽️" <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      html
    });
    console.log(`[Email] OTP email sent to ${email}`);
  } catch (err) {
    console.error('[Email] Failed to send OTP email:', err.message);
  }
};

/**
 * Sends a reservation cancellation email to the customer.
 * @param {Object} reservation - The Mongoose Reservation document.
 */
const sendReservationCancellationEmail = async (reservation) => {
  if (!reservation.customerEmail) return;
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('[Email] Gmail credentials not set in .env — skipping cancellation email.');
    return;
  }

  const subject = `❌ Reservation Cancelled – Royal Rasoi (${reservation.bookingCode})`;

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <style>
      body { margin: 0; padding: 0; background: #f8fafc; font-family: 'Segoe UI', Arial, sans-serif; }
      .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
      .header { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 36px 32px; text-align: center; }
      .header h1 { color: #f59e0b; font-size: 28px; margin: 0 0 6px; letter-spacing: 1px; }
      .header p { color: #94a3b8; margin: 0; font-size: 14px; }
      .status-badge { display: inline-block; margin: 24px auto 0; padding: 8px 24px; border-radius: 30px; font-weight: 700; font-size: 15px; background: #ef44441a; color: #ef4444; border: 1.5px solid #ef4444; }
      .body { padding: 32px; }
      .greeting { font-size: 16px; color: #334155; margin-bottom: 20px; }
      .footer { background: #0f172a; padding: 20px 32px; text-align: center; }
      .footer p { color: #64748b; font-size: 12px; margin: 0; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="header">
        <h1>🍽️ Royal Rasoi</h1>
        <p>Fine Dining &amp; Reservations</p>
        <div class="status-badge">❌ CANCELLED</div>
      </div>
      <div class="body">
        <p class="greeting">Dear <strong>${reservation.customerName}</strong>,</p>
        <p style="color:#334155;font-size:15px;">
          We regret to inform you that your table reservation (Reference: <strong>${reservation.bookingCode || 'RR-BOOKED'}</strong>) has been <strong>cancelled</strong>.
        </p>
        <p style="color:#334155;font-size:15px;">
          If you have any questions or would like to book a table for another time, please feel free to reach out to us.
        </p>
      </div>
      <div class="footer">
        <p>Royal Rasoi &bull; Fine Dining Restaurant</p>
        <p style="margin-top:6px;">This is an automated message. Please do not reply.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Royal Rasoi 🍽️" <${process.env.GMAIL_USER}>`,
      to: reservation.customerEmail,
      subject,
      html
    });
    console.log(`[Email] Reservation cancellation email sent to ${reservation.customerEmail}`);
  } catch (err) {
    console.error('[Email] Failed to send cancellation email:', err.message);
  }
};

module.exports = { sendReservationEmail, sendBillEmail, sendOTPEmail, sendReservationCancellationEmail };
