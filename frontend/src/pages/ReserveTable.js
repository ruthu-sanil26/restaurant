import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../services/api';
import styles from './ReserveTable.module.css';

const SEATING_AREAS = [
  {
    id: 'window',
    title: 'Window View',
    icon: '🪟',
    capacity: '2-4 Guests',
    desc: 'Scenic views of the illuminated outdoor street and skyline.'
  },
  {
    id: 'booth',
    title: 'VIP Lounge Booth',
    icon: '🍷',
    capacity: '4-6 Guests',
    desc: 'Plush velvet booth seating with warm ambient lighting.'
  },
  {
    id: 'patio',
    title: 'Garden Terrace Patio',
    icon: '🌿',
    capacity: '2-8 Guests',
    desc: 'Open-air al fresco dining with fresh evening breezes.'
  },
  {
    id: 'main',
    title: 'Main Dining Hall',
    icon: '🍽️',
    capacity: '2-10 Guests',
    desc: 'Heart of Royal Rasoi near our main kitchen display.'
  }
];

const LUNCH_SLOTS = ['12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM'];
const DINNER_SLOTS = ['07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM'];

const OCCASIONS = [
  { id: 'Casual Dining', label: 'Casual Dining', icon: '🍽️' },
  { id: 'Birthday', label: 'Birthday Party', icon: '🎂' },
  { id: 'Anniversary', label: 'Anniversary', icon: '💍' },
  { id: 'Date Night', label: 'Date Night', icon: '🥂' },
  { id: 'Business Dinner', label: 'Business Meeting', icon: '💼' },
  { id: 'Family Gathering', label: 'Family Feast', icon: '👨‍👩‍👧‍👦' }
];

export default function ReserveTable() {
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    partySize: 2,
    tableNumber: '',
    seatingArea: 'Main Dining Hall',
    date: today,
    time: '07:30 PM',
    occasion: 'Casual Dining',
    notes: ''
  });

  const [tablesList, setTablesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [reservationResult, setReservationResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // OTP verification state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);

  useEffect(() => {
    // Fetch live tables from backend if available
    const fetchTables = async () => {
      try {
        const res = await api.get('/tables');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setTablesList(res.data);
        }
      } catch (err) {
        console.log('Tables endpoint fallback to default seating options');
      }
    };
    fetchTables();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Reset OTP if email changes
    if (name === 'customerEmail') {
      setOtpSent(false);
      setOtpVerified(false);
      setOtpCode('');
      setOtpError('');
    }
  };

  // OTP countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  const sendOtp = async () => {
    const email = formData.customerEmail?.trim();
    if (!email || !email.includes('@')) {
      setOtpError('Enter a valid email address');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      await api.post('/public/orders/send-otp', { email });
      setOtpSent(true);
      setOtpTimer(60); // 60 second cooldown
    } catch (err) {
      setOtpError('Failed to send OTP. Try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleGuestSelect = (count) => {
    setFormData((prev) => ({ ...prev, partySize: count }));
  };

  const handleTimeSelect = (slot) => {
    setFormData((prev) => ({ ...prev, time: slot }));
  };

  const handleTableSelect = (tableName) => {
    setFormData((prev) => ({ ...prev, tableNumber: prev.tableNumber === tableName ? '' : tableName }));
  };

  const handleSeatingAreaSelect = (areaName) => {
    setFormData((prev) => ({ ...prev, seatingArea: areaName }));
  };

  const handleOccasionSelect = (occ) => {
    setFormData((prev) => ({ ...prev, occasion: occ }));
  };

  const buildWhatsAppLink = (reservation) => {
    const phone = (reservation.customerPhone || '').replace(/[^\d]/g, '');
    const targetPhone = phone.length === 10 ? `91${phone}` : phone;
    const msg = encodeURIComponent(
      `🎉 *Royal Rasoi – Table Reservation REQUESTED*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 *Booking Ref:* ${reservation.bookingCode || 'RR-CONFIRMED'}\n` +
      `👤 *Name:* ${reservation.customerName}\n` +
      `📅 *Date & Time:* ${reservation.date} at ${reservation.time}\n` +
      `👥 *Guests:* ${reservation.partySize} Person(s)\n` +
      `📍 *Area:* ${reservation.seatingArea}\n` +
      `🪑 *Table:* ${reservation.tableNumber || 'Any available'}\n` +
      `✨ *Occasion:* ${reservation.occasion}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `We look forward to welcoming you to Royal Rasoi! 🍽️\n` +
      `Our team will confirm your booking shortly.`
    );
    return `https://api.whatsapp.com/send?phone=${targetPhone}&text=${msg}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otpVerified) {
      setError('Please verify your email address with OTP first.');
      return;
    }
    setLoading(true);
    setError('');
    setCopied(false);

    try {
      const res = await api.post('/reservations/public', { ...formData, otpCode });
      const reservation = res.data;
      setReservationResult(reservation);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit reservation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyConfirmation = () => {
    if (!reservationResult) return;
    const text = `🎉 Royal Rasoi Reservation\nCode: ${reservationResult.bookingCode || 'RR-CONFIRMED'}\nName: ${reservationResult.customerName}\nGuests: ${reservationResult.partySize}\nDate: ${reservationResult.date} @ ${reservationResult.time}\nArea: ${reservationResult.seatingArea}\nTable: ${reservationResult.tableNumber || 'Any available'}\nOccasion: ${reservationResult.occasion}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const sendWhatsAppPass = () => {
    if (!reservationResult) return;
    const phone = (reservationResult.customerPhone || '').replace(/[^\d]/g, '');
    const targetPhone = phone.length === 10 ? `91${phone}` : phone;
    const msg = encodeURIComponent(
      `🎉 *Royal Rasoi - Table Reservation*\n` +
      `*Booking Ref:* ${reservationResult.bookingCode || 'RR-CONFIRMED'}\n` +
      `*Name:* ${reservationResult.customerName}\n` +
      `*Date & Time:* ${reservationResult.date} at ${reservationResult.time}\n` +
      `*Guests:* ${reservationResult.partySize} Person(s)\n` +
      `*Area:* ${reservationResult.seatingArea}\n` +
      `*Table:* ${reservationResult.tableNumber || 'Any available'}\n` +
      `*Occasion:* ${reservationResult.occasion}\n\n` +
      `We look forward to welcoming you to Royal Rasoi! 🍽️`
    );
    window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${msg}`, '_blank');
  };

  return (
    <div className={styles.reservePage}>
      <Header />

      <div className={styles.heroHeader}>
        <div className={styles.heroContent}>
          <span className={styles.heroTag}>ONLINE RESERVATION</span>
          <h1 className={styles.heroTitle}>Book Your Table Online</h1>
          <p className={styles.heroSubtitle}>
            Reserve your dining spot at Royal Rasoi in seconds. Choose your seating preference, party size &amp; time.
          </p>
        </div>
      </div>

      <div className={styles.container}>
        {success && reservationResult ? (
          <div className={styles.ticketCard}>
            <div className={styles.ticketHeader}>
              <div className={styles.ticketBadge}>RESERVATION REQUESTED</div>
              <h2 className={styles.ticketTitle}>🎉 Booking Confirmed!</h2>
              <p className={styles.ticketSubtitle}>
                We've received your reservation request! Once our team confirms your booking, a WhatsApp message will be sent to <strong>{reservationResult.customerPhone}</strong>.
              </p>
              <div className={styles.waSentBanner}>
                ⏳ WhatsApp confirmation will be sent after admin approves your booking
              </div>
            </div>

            <div className={styles.bookingCodeBox}>
              <span className={styles.codeLabel}>BOOKING REFERENCE CODE</span>
              <span className={styles.codeValue}>{reservationResult.bookingCode || 'RR-' + Math.floor(1000 + Math.random()*9000)}</span>
            </div>

            <div className={styles.ticketDetailsGrid}>
              <div className={styles.ticketDetailItem}>
                <span className={styles.itemLabel}>Customer Name</span>
                <span className={styles.itemValue}>{reservationResult.customerName}</span>
              </div>
              <div className={styles.ticketDetailItem}>
                <span className={styles.itemLabel}>Contact Phone</span>
                <span className={styles.itemValue}>{reservationResult.customerPhone}</span>
              </div>
              <div className={styles.ticketDetailItem}>
                <span className={styles.itemLabel}>Date &amp; Time</span>
                <span className={styles.itemValue}>📅 {reservationResult.date} at {reservationResult.time}</span>
              </div>
              <div className={styles.ticketDetailItem}>
                <span className={styles.itemLabel}>Party Size</span>
                <span className={styles.itemValue}>👥 {reservationResult.partySize} Guests</span>
              </div>
              <div className={styles.ticketDetailItem}>
                <span className={styles.itemLabel}>Seating Preference</span>
                <span className={styles.itemValue}>🪑 {reservationResult.tableNumber}</span>
              </div>
              <div className={styles.ticketDetailItem}>
                <span className={styles.itemLabel}>Occasion</span>
                <span className={styles.itemValue}>✨ {reservationResult.occasion}</span>
              </div>
            </div>

            {reservationResult.notes && (
              <div className={styles.ticketNotes}>
                <strong>Special Requests:</strong> "{reservationResult.notes}"
              </div>
            )}

            <div className={styles.ticketActions}>
              <button
                onClick={() => window.open(buildWhatsAppLink(reservationResult), '_blank')}
                className={styles.whatsappBtn}
              >
                💬 Resend WhatsApp Confirmation
              </button>
              <button onClick={copyConfirmation} className={styles.copyBtn}>
                {copied ? '✅ Copied to Clipboard!' : '📋 Copy Booking Details'}
              </button>
              <Link to="/menulayout" className={styles.menuBtn}>
                📖 View Food Menu &rarr;
              </Link>
              <button
                onClick={() => {
                  setSuccess(false);
                  setReservationResult(null);
                  setOtpSent(false);
                  setOtpVerified(false);
                  setOtpCode('');
                  setOtpError('');
                  setFormData({
                    customerName: '',
                    customerPhone: '',
                    customerEmail: '',
                    partySize: 2,
                    tableNumber: 'Main Dining Hall',
                    date: today,
                    time: '07:30 PM',
                    occasion: 'Casual Dining',
                    notes: ''
                  });
                }}
                className={styles.resetBtn}
              >
                Make Another Reservation
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.layoutGrid}>
            {/* Form Column */}
            <div className={styles.formCard}>
              {error && <div className={styles.errorBox}>⚠️ {error}</div>}

              <form onSubmit={handleSubmit}>
                {/* 1. Date & Guests */}
                <div className={styles.sectionBlock}>
                  <h3 className={styles.sectionTitle}>
                    <span>1</span> Date &amp; Party Size
                  </h3>

                  <div className={styles.grid2}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Date of Dining</label>
                      <input
                        type="date"
                        name="date"
                        required
                        className={styles.input}
                        value={formData.date}
                        onChange={handleChange}
                        min={today}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Number of Guests</label>
                      <input
                        type="number"
                        name="partySize"
                        min="1"
                        max="30"
                        required
                        className={styles.input}
                        value={formData.partySize}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className={styles.guestQuickChips}>
                    <span className={styles.chipLabel}>Quick Select Guests:</span>
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
                      <button
                        type="button"
                        key={num}
                        className={`${styles.chip} ${
                          Number(formData.partySize) === num ? styles.chipActive : ''
                        }`}
                        onClick={() => handleGuestSelect(num)}
                      >
                        {num} {num === 1 ? 'Guest' : 'Guests'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Time Slot */}
                <div className={styles.sectionBlock}>
                  <h3 className={styles.sectionTitle}>
                    <span>2</span> Select Dining Time
                  </h3>

                  <div className={styles.timeCategory}>
                    <span className={styles.timeCategoryTitle}>☀️ Lunch Slots</span>
                    <div className={styles.timeSlotsGrid}>
                      {LUNCH_SLOTS.map((slot) => (
                        <button
                          type="button"
                          key={slot}
                          className={`${styles.timeChip} ${
                            formData.time === slot ? styles.timeChipActive : ''
                          }`}
                          onClick={() => handleTimeSelect(slot)}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.timeCategory} style={{ marginTop: '1.2rem' }}>
                    <span className={styles.timeCategoryTitle}>🌙 Dinner Slots</span>
                    <div className={styles.timeSlotsGrid}>
                      {DINNER_SLOTS.map((slot) => (
                        <button
                          type="button"
                          key={slot}
                          className={`${styles.timeChip} ${
                            formData.time === slot ? styles.timeChipActive : ''
                          }`}
                          onClick={() => handleTimeSelect(slot)}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Seating Preference */}
                <div className={styles.sectionBlock}>
                  <h3 className={styles.sectionTitle}>
                    <span>3</span> Choose Seating Area / Table
                  </h3>

                  {tablesList.length > 0 && (
                    <div className={styles.liveTablesSection}>
                      <span className={styles.chipLabel}>Available Specific Tables:</span>
                      <div className={styles.tablesWrap}>
                        {tablesList.map((t) => (
                          <button
                            type="button"
                            key={t._id}
                            className={`${styles.tableBadgeBtn} ${
                              formData.tableNumber === `Table ${t.number}` ? styles.tableBadgeActive : ''
                            }`}
                            onClick={() => handleTableSelect(`Table ${t.number}`)}
                          >
                            🪑 Table {t.number} ({t.capacity} Seats) - {t.status}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={styles.seatingGrid}>
                    {SEATING_AREAS.map((area) => (
                      <div
                        key={area.id}
                        className={`${styles.seatingCard} ${
                          formData.seatingArea === area.title ? styles.seatingCardActive : ''
                        }`}
                        onClick={() => handleSeatingAreaSelect(area.title)}
                      >
                        <div className={styles.seatingHeader}>
                          <span className={styles.seatingIcon}>{area.icon}</span>
                          <span className={styles.seatingCapacity}>{area.capacity}</span>
                        </div>
                        <h4 className={styles.seatingTitle}>{area.title}</h4>
                        <p className={styles.seatingDesc}>{area.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Occasion */}
                <div className={styles.sectionBlock}>
                  <h3 className={styles.sectionTitle}>
                    <span>4</span> Dining Occasion
                  </h3>
                  <div className={styles.occasionGrid}>
                    {OCCASIONS.map((occ) => (
                      <button
                        type="button"
                        key={occ.id}
                        className={`${styles.occasionChip} ${
                          formData.occasion === occ.id ? styles.occasionChipActive : ''
                        }`}
                        onClick={() => handleOccasionSelect(occ.id)}
                      >
                        <span>{occ.icon}</span> {occ.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Contact Info & Notes */}
                <div className={styles.sectionBlock}>
                  <h3 className={styles.sectionTitle}>
                    <span>5</span> Guest Details &amp; Requests
                  </h3>

                  <div className={styles.grid2}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Full Name *</label>
                      <input
                        type="text"
                        name="customerName"
                        required
                        className={styles.input}
                        value={formData.customerName}
                        onChange={handleChange}
                        placeholder="e.g. Rahul Sharma"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Phone Number *</label>
                      <input
                        type="tel"
                        name="customerPhone"
                        required
                        className={styles.input}
                        value={formData.customerPhone}
                        onChange={handleChange}
                        placeholder="e.g. 9876543210"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Email Address *</label>
                      <div className={styles.phoneOtpRow}>
                        <input
                          type="email"
                          name="customerEmail"
                          value={formData.customerEmail}
                          onChange={handleChange}
                          placeholder="your.email@example.com"
                          className={styles.input}
                          required
                          disabled={otpVerified}
                        />
                        {!otpVerified && (
                          <button
                            type="button"
                            className={styles.otpSendBtn}
                            onClick={sendOtp}
                            disabled={otpLoading || otpTimer > 0 || !formData.customerEmail}
                          >
                            {otpLoading ? '⏳ Sending...' : otpTimer > 0 ? `Resend (${otpTimer}s)` : otpSent ? '🔄 Resend OTP' : '📩 Send OTP'}
                          </button>
                        )}
                        {otpVerified && (
                          <span className={styles.otpVerifiedBadge}>✅ Verified</span>
                        )}
                      </div>
                      {otpError && <div className={styles.otpErrorMsg}>{otpError}</div>}
                    </div>
                  </div>

                  {/* OTP Input */}
                  {otpSent && !otpVerified && (
                    <div className={styles.otpSection}>
                      <label className={styles.label}>Enter 6-digit OTP sent to your email</label>
                      <div className={styles.otpInputRow}>
                        <input
                          type="text"
                          maxLength="6"
                          className={`${styles.input} ${styles.otpInput}`}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/[^\d]/g, ''))}
                          placeholder="● ● ● ● ● ●"
                        />
                        <button
                          type="button"
                          className={styles.otpVerifyBtn}
                          onClick={() => {
                            if (otpCode.length === 6) {
                              setOtpVerified(true);
                              setOtpError('');
                            } else {
                              setOtpError('Enter a valid 6-digit OTP');
                            }
                          }}
                          disabled={otpCode.length !== 6}
                        >
                          ✅ Verify OTP
                        </button>
                      </div>
                    </div>
                  )}

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Special Requests / Notes (Optional)</label>
                    <textarea
                      name="notes"
                      className={`${styles.input} ${styles.textarea}`}
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="High chair needed, food allergy alerts, anniversary candle..."
                    />
                  </div>
                </div>

                <button type="submit" className={styles.submitBtn} disabled={loading || !otpVerified}>
                  {loading ? 'Processing Reservation...' : !otpVerified ? '🔒 Verify Phone to Book' : '⚡ Confirm Online Reservation'}
                </button>
              </form>
            </div>

            {/* Sidebar Summary */}
            <div className={styles.summarySidebar}>
              <div className={styles.summaryCard}>
                <h3 className={styles.summaryTitle}>📌 Booking Summary</h3>
                <div className={styles.divider}></div>

                <div className={styles.summaryRow}>
                  <span className={styles.sumLabel}>Date</span>
                  <span className={styles.sumVal}>{formData.date || 'Not selected'}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.sumLabel}>Time</span>
                  <span className={styles.sumVal}>{formData.time}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.sumLabel}>Guests</span>
                  <span className={styles.sumVal}>{formData.partySize} Person(s)</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.sumLabel}>Seating Area</span>
                  <span className={styles.sumVal}>
                    {formData.tableNumber ? `${formData.tableNumber} (${formData.seatingArea})` : formData.seatingArea}
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.sumLabel}>Occasion</span>
                  <span className={styles.sumVal}>{formData.occasion}</span>
                </div>

                {formData.customerName && (
                  <div className={styles.summaryRow}>
                    <span className={styles.sumLabel}>Name</span>
                    <span className={styles.sumVal}>{formData.customerName}</span>
                  </div>
                )}



                <div className={styles.guaranteeBadge}>
                  🔒 100% Guaranteed Reserved Seating
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
