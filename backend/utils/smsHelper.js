const twilio = require('twilio');

/**
 * Robust E.164 phone number formatting helper
 * @param {String} phone 
 * @returns {String} formatted E.164 number (e.g. +916363230940)
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  // Remove spaces, hyphens, brackets
  let cleaned = String(phone).trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }

  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  return `+${cleaned}`;
};

/**
 * Fast2SMS API Dispatch Helper
 */
const sendFast2SMS = async (phone, message) => {
  if (!process.env.FAST2SMS_API_KEY) return false;
  try {
    const rawNumber = String(phone).replace(/[^\d]/g, '');
    const cleanNum = rawNumber.length > 10 ? rawNumber.slice(-10) : rawNumber;

    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': process.env.FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'q',
        message: message,
        language: 'english',
        flash: 0,
        numbers: cleanNum
      })
    });
    const data = await res.json();
    console.log(`[Fast2SMS Dispatch] Sent to ${cleanNum}:`, data.message || data);
    return data;
  } catch (e) {
    console.error('[Fast2SMS Error]:', e.message);
    return false;
  }
};

/**
 * Sends a detailed paid receipt summary to the customer's phone number via Twilio / Fast2SMS.
 * @param {Object} order - The populated Mongoose Order document.
 */
const sendSMSBill = async (order) => {
  try {
    const phone = order.customerPhone;
    if (!phone) return;

    const formattedPhone = formatPhoneNumber(phone);

    // Calculate billing amounts
    const subTotal = Number(order.totalAmount || 0);
    const gst = subTotal * 0.05;
    const grandTotal = (subTotal + gst).toFixed(2);

    // Format items summary
    const itemsList = order.items
      .map(item => `${item.name || item.menuItem?.name || 'Item'} (x${item.quantity})`)
      .join(', ');

    const tableNum = order.table?.number || order.table?.name || 'N/A';
    
    // SMS Message body
    const messageBody = `🧾 Royal Rasoi - Paid Receipt\nTable: ${tableNum}\nItems: ${itemsList}\nTotal: ₹${grandTotal} (PAID)\nView your digital bill: http://192.168.31.106:3000/bill\nThank you! Visit again 😊`;

    // Attempt Fast2SMS
    await sendFast2SMS(phone, messageBody);

    // Attempt Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const res = await twilioClient.messages.create({
        body: messageBody,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone,
      });
      console.log(`[Twilio SMS Bill] Paid receipt sent to ${formattedPhone} (SID: ${res.sid})`);
    }
  } catch (err) {
    console.error("Failed to transmit SMS paid receipt:", err.message);
  }
};


/**
 * Sends an SMS to a customer when their reservation is auto-cancelled due to no-show.
 * @param {Object} reservation - The Mongoose Reservation document.
 */
const sendSMSCancellation = async (reservation) => {
  try {
    const phone = reservation.customerPhone;
    if (!phone) return;

    const formattedPhone = formatPhoneNumber(phone);

    const messageBody =
      `❌ Royal Rasoi – Reservation Cancelled\n` +
      `Dear ${reservation.customerName},\n` +
      `Your table reservation for ${reservation.date} at ${reservation.time} has been automatically cancelled as we did not see you arrive within 30 minutes of your booking.\n` +
      `We hope to see you soon! Please call or rebook at your convenience. 🙏`;

    // Attempt Fast2SMS
    await sendFast2SMS(phone, messageBody);

    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    ) {
      const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const res = await twilioClient.messages.create({
        body: messageBody,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone,
      });
      console.log(`[Twilio SMS] Cancellation sent to ${formattedPhone} (SID: ${res.sid})`);
    }
  } catch (err) {
    console.error('[SMS Cancellation] Failed to send:', err.message);
  }
};

/**
 * Sends an SMS to a customer when their reservation is created or confirmed by admin.
 * @param {Object} reservation - The Mongoose Reservation document.
 * @param {Boolean} isConfirmed - Whether status is confirmed or pending request.
 */
const sendSMSReservationConfirmation = async (reservation, isConfirmed = true) => {
  try {
    const phone = reservation.customerPhone;
    if (!phone) return;

    const formattedPhone = formatPhoneNumber(phone);

    const code = reservation.bookingCode || 'RR-BOOKED';
    const statusText = isConfirmed ? '✅ CONFIRMED' : '📩 REQUESTED';

    const messageBody =
      `🎉 Royal Rasoi – Table Reservation ${statusText}\n` +
      `Dear ${reservation.customerName},\n` +
      `Booking Ref: ${code}\n` +
      `Date & Time: ${reservation.date} at ${reservation.time}\n` +
      `Guests: ${reservation.partySize}\n` +
      `Seating: ${reservation.tableNumber || 'Main Hall'}\n` +
      `Occasion: ${reservation.occasion || 'Dining'}\n` +
      (isConfirmed ? `We look forward to hosting you! 😊` : `Our team is processing your request. Thank you!`);

    // Attempt Fast2SMS dispatch
    await sendFast2SMS(phone, messageBody);

    // Attempt Twilio dispatch
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    ) {
      const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const res = await twilioClient.messages.create({
        body: messageBody,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone,
      });
      console.log(`[Twilio SMS] Reservation SMS sent to ${formattedPhone} (SID: ${res.sid})`);
    }
  } catch (err) {
    if (err.code === 21608) {
      console.warn(`\n⚠️ [Twilio Trial Restriction] Unable to send Twilio SMS to ${reservation.customerPhone} because it is not registered as a Verified Caller ID in your Twilio Trial console. Add this number at https://www.twilio.com/console/phone-numbers/verified to receive live SMS.\n`);
    } else {
      console.error('[SMS Reservation] Send error:', err.message);
    }
  }
};

module.exports = { sendSMSBill, sendSMSCancellation, sendSMSReservationConfirmation, formatPhoneNumber, sendFast2SMS };
