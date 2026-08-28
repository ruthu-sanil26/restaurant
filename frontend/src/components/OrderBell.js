import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import styles from './OrderBell.module.css';

const SOCKET_URL = 'http://localhost:5000';
const MAX_NOTIFICATIONS = 20;

export default function OrderBell() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const dropdownRef = useRef(null);
  const audioCtxRef = useRef(null);
  const socketRef = useRef(null);
  const navigate = useNavigate();

  /* ── Audio chime using Web Audio API (no file needed) ── */
  const playChime = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      const frequencies = [523.25, 659.25, 783.99]; // C5 E5 G5
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18);
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + i * 0.18 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.5);
        osc.start(ctx.currentTime + i * 0.18);
        osc.stop(ctx.currentTime + i * 0.18 + 0.5);
      });
    } catch (e) {
      // Audio blocked – silent fail
    }
  }, []);

  /* ── Socket connection ── */
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('newOrder', (order) => {
      const notification = {
        id: order._id,
        tableNumber: order.table?.number || 'N/A',
        itemCount: order.items?.length || 0,
        amount: order.totalAmount || 0,
        time: new Date(),
        read: false,
      };

      setNotifications((prev) => [notification, ...prev].slice(0, MAX_NOTIFICATIONS));
      setUnread((prev) => prev + 1);

      // Bell shake animation
      setRinging(true);
      setTimeout(() => setRinging(false), 1000);

      // Play chime
      playChime();
    });

    return () => socket.disconnect();
  }, [playChime]);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleOpen = () => {
    setOpen((o) => !o);
    if (!open) {
      // Mark all as read when opening
      setUnread(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const clearAll = (e) => {
    e.stopPropagation();
    setNotifications([]);
    setUnread(0);
  };

  const goToOrders = () => {
    setOpen(false);
    navigate('/admin/orders');
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.wrapper} ref={dropdownRef}>
      {/* Bell button */}
      <button
        className={`${styles.bellBtn} ${ringing ? styles.ringing : ''}`}
        onClick={toggleOpen}
        title="Order notifications"
        type="button"
      >
        <span className={styles.bellIcon}>🔔</span>
        {unread > 0 && (
          <span className={styles.badge}>{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>Order Notifications</span>
            {notifications.length > 0 && (
              <button className={styles.clearBtn} onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>

          <div className={styles.notifList}>
            {notifications.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>🔕</span>
                <span>No new orders yet</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={`${n.id}-${n.time}`}
                  className={`${styles.notifItem} ${!n.read ? styles.unread : ''}`}
                  onClick={goToOrders}
                >
                  <div className={styles.notifDot} />
                  <div className={styles.notifBody}>
                    <span className={styles.notifTitle}>
                      🆕 New Order — Table {n.tableNumber}
                    </span>
                    <span className={styles.notifSub}>
                      {n.itemCount} item{n.itemCount !== 1 ? 's' : ''} · ₹{Number(n.amount).toFixed(2)}
                    </span>
                  </div>
                  <span className={styles.notifTime}>{formatTime(n.time)}</span>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <button className={styles.viewAllBtn} onClick={goToOrders}>
              View all orders →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
