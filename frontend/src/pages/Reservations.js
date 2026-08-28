import React, { useState, useEffect } from 'react';
import api from '../services/api';
import styles from './Reservations.module.css';

export default function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [emailSending, setEmailSending] = useState({});

  const fetchReservations = async () => {
    try {
      const res = await api.get('/reservations');
      setReservations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const res = await api.put(`/reservations/${id}`, { status });
      setReservations(prev => prev.map(r => r._id === id ? { ...r, status } : r));
      if (status === 'confirmed') {
        alert('✅ Reservation confirmed! Confirmation email has been sent to the customer.');
      }
    } catch (err) {
      alert('Failed to update reservation');
    }
  };

  const resendEmail = async (id) => {
    setEmailSending(prev => ({ ...prev, [id]: true }));
    try {
      const res = await api.post(`/reservations/${id}/resend-email`);
      alert(res.data.message || 'Confirmation email sent!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send email');
    } finally {
      setEmailSending(prev => ({ ...prev, [id]: false }));
    }
  };

  const filtered = reservations.filter(r => filter === 'all' || r.status === filter);

  if (loading) return <div className={styles.page}>Loading...</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Table <span>Reservations</span></h1>
      </header>

      <div className={styles.tabs}>
        {['pending', 'confirmed', 'completed', 'cancelled', 'all'].map(t => (
          <button 
            key={t}
            className={`${styles.tab} ${filter === t ? styles.tabActive : ''}`}
            onClick={() => setFilter(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t !== 'all' && ` (${reservations.filter(r => r.status === t).length})`}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        {filtered.length === 0 ? (
          <p style={{ color: '#888' }}>No reservations found for this status.</p>
        ) : (
          filtered.map(res => (
            <div key={res._id} className={`${styles.card} ${
              res.status === 'pending' ? styles.cardPending :
              res.status === 'confirmed' ? styles.cardConfirmed :
              res.status === 'cancelled' ? styles.cardCancelled :
              styles.cardCompleted
            }`}>
              <div className={styles.cardHeader}>
                <div>
                  <div className={styles.customerName}>{res.customerName}</div>
                  <div className={styles.customerContact}>📞 {res.customerPhone}</div>
                  {res.customerEmail && (
                    <div className={styles.customerContact}>📧 {res.customerEmail}</div>
                  )}
                  {res.bookingCode && (
                    <div className={styles.bookingCodeTag}>🎫 {res.bookingCode}</div>
                  )}
                </div>
                <span className={`${styles.badge} ${
                  res.status === 'pending' ? styles.badgePending :
                  res.status === 'confirmed' ? styles.badgeConfirmed :
                  res.status === 'cancelled' ? styles.badgeCancelled :
                  styles.badgeCompleted
                }`}>
                  {res.status}
                </span>
              </div>

              <div className={styles.details}>
                <div className={styles.detailRow}>
                  <span className={styles.detailIcon}>📅</span> {res.date} at {res.time}
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailIcon}>👥</span> Party of {res.partySize}
                </div>
                {res.tableNumber && (
                  <div className={`${styles.detailRow} ${styles.tableNumberRow}`}>
                    <span className={styles.detailIcon}>🪑</span>
                    <strong>Table:</strong>&nbsp;{res.tableNumber}
                  </div>
                )}
                {res.occasion && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailIcon}>✨</span> {res.occasion}
                  </div>
                )}
              </div>

              {res.notes && <div className={styles.notes}>"{res.notes}"</div>}

              {res.status === 'pending' && (
                <div className={styles.actions}>
                  <button className={`${styles.btn} ${styles.btnConfirm}`} onClick={() => updateStatus(res._id, 'confirmed')}>✅ Confirm</button>
                  <button className={`${styles.btn} ${styles.btnCancel}`} onClick={() => updateStatus(res._id, 'cancelled')}>❌ Reject</button>
                </div>
              )}
              {res.status === 'confirmed' && (
                <div className={styles.actions}>
                  <button
                    className={`${styles.btn} ${styles.btnConfirm}`}
                    style={{ background: '#3b82f6', borderColor: '#3b82f6', color: '#fff' }}
                    onClick={() => resendEmail(res._id)}
                    disabled={emailSending[res._id]}
                  >
                    {emailSending[res._id] ? '⏳ Sending...' : '📧 Resend Confirmation Email'}
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnCancel}`}
                    style={{ background: 'transparent', color: '#ccc', borderColor: '#555' }}
                    onClick={() => updateStatus(res._id, 'completed')}
                  >
                    Mark Completed
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

