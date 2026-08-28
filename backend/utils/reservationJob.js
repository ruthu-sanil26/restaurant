const cron = require('node-cron');
const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const { sendSMSCancellation } = require('./smsHelper');
const { sendReservationCancellationEmail } = require('./emailHelper');

/** Grace period in minutes before auto-cancelling a no-show reservation */
const GRACE_MINUTES =-5;

/**
 * Parses a reservation's date (YYYY-MM-DD) and time (HH:MM) into a JS Date object.
 */
function getReservationDateTime(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  // timeStr looks like "07:30 PM"
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) {
    // Fallback if no AM/PM
    const [hour, minute] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }
  
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const modifier = match[3].toUpperCase();

  if (hour === 12) {
    hour = modifier === 'AM' ? 0 : 12;
  } else {
    hour = modifier === 'PM' ? hour + 12 : hour;
  }

  // Construct in local time
  const dt = new Date(year, month - 1, day, hour, minute, 0, 0);
  return dt;
}

/**
 * Runs the auto-cancel check.
 * Any pending/confirmed reservation whose booking time + grace period is in the past
 * gets cancelled and the customer is notified via SMS.
 */
async function cancelOverdueReservations() {
  try {
    const now = new Date();

    // Fetch all pending or confirmed reservations
    const active = await Reservation.find({
      status: { $in: ['pending', 'confirmed'] },
    });

    for (const reservation of active) {
      const bookedAt = getReservationDateTime(reservation.date, reservation.time);
      const deadlineMs = bookedAt.getTime() + GRACE_MINUTES * 60 * 1000;

      if (now.getTime() > deadlineMs) {
        // Mark as cancelled
        reservation.status = 'cancelled';
        await reservation.save();

        console.log(
          `[Reservation Job] Auto-cancelled reservation #${reservation._id} ` +
          `for ${reservation.customerName} (${reservation.date} ${reservation.time})`
        );

        // Free up the associated table if one was linked
        if (reservation.tableNumber) {
          const match = reservation.tableNumber.match(/\d+/);
          if (match) {
            const tableNum = parseInt(match[0], 10);
            await Table.findOneAndUpdate(
              { number: tableNum },
              { status: 'available' }
            );
          }
        }

        // Notify the customer via SMS
        await sendSMSCancellation(reservation);

        // Notify the customer via Email
        try {
          await sendReservationCancellationEmail(reservation);
        } catch (emailErr) {
          console.error('[Reservation Job] Error sending cancellation email:', emailErr.message);
        }
      }
    }
  } catch (err) {
    console.error('[Reservation Job] Error during auto-cancel check:', err.message);
  }
}

/**
 * Starts the cron job. Runs every minute.
 * Call this once after the database is connected.
 */
function startReservationJob() {
  // '* * * * *' → every minute
  cron.schedule('* * * * *', () => {
    cancelOverdueReservations();
  });
  console.log('[Reservation Job] Auto-cancel cron started (runs every minute, grace period: 30 min)');
}

module.exports = { startReservationJob };
