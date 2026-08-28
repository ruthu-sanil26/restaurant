import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from './Orders.module.css';

const STATUS_OPTIONS = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'];

const STATUS_META = {
  pending: { color: '#ea580c', bg: '#fff7ed', label: 'Pending' },
  confirmed: { color: '#0284c7', bg: '#f0f9ff', label: 'Confirmed' },
  preparing: { color: '#d97706', bg: '#fef3c7', label: 'Preparing' },
  ready: { color: '#16a34a', bg: '#f0fdf4', label: 'Ready' },
  served: { color: '#475569', bg: '#f8fafc', label: 'Served' },
  cancelled: { color: '#dc2626', bg: '#fef2f2', label: 'Cancelled' },
};

function PaymentDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isPaid = value === 'paid';

  return (
    <div className={`${styles.customDropdownContainer} ${open ? styles.customDropdownContainerOpen : ''}`} ref={dropdownRef}>
      <button
        type="button"
        className={styles.customDropdownBtn}
        onClick={() => setOpen(!open)}
        style={{
          background: isPaid ? '#f0fdf4' : '#fff7ed',
          color: isPaid ? '#16a34a' : '#ea580c',
          borderColor: isPaid ? '#bbf7d0' : '#fed7aa',
        }}
      >
        <span>{isPaid ? '✅ PAID' : '⏳ PENDING'}</span>
        <span className={`${styles.dropdownCaret} ${open ? styles.dropdownCaretOpen : ''}`}>▼</span>
      </button>

      {open && (
        <div className={styles.customDropdownMenu}>
          <button
            type="button"
            className={styles.customDropdownOption}
            style={{ color: '#ea580c', background: !isPaid ? '#fff7ed' : 'transparent' }}
            onClick={() => { onChange('pending'); setOpen(false); }}
          >
            <span>⏳ PENDING</span>
            {!isPaid && <span>✓</span>}
          </button>
          <button
            type="button"
            className={styles.customDropdownOption}
            style={{ color: '#16a34a', background: isPaid ? '#f0fdf4' : 'transparent' }}
            onClick={() => { onChange('paid'); setOpen(false); }}
          >
            <span>✅ PAID</span>
            {isPaid && <span>✓</span>}
          </button>
        </div>
      )}
    </div>
  );
}

function OrderStatusDropdown({ value, onChange, statusMeta }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statusIcons = {
    pending: '⏳',
    confirmed: '👍',
    preparing: '🍳',
    ready: '🔔',
    served: '🍽️',
    cancelled: '❌'
  };

  return (
    <div className={`${styles.customDropdownContainer} ${open ? styles.customDropdownContainerOpen : ''}`} ref={dropdownRef}>
      <button
        type="button"
        className={styles.customDropdownBtn}
        onClick={() => setOpen(!open)}
        style={{
          background: statusMeta.bg || '#f8fafc',
          color: statusMeta.color || '#0f172a',
          borderColor: (statusMeta.color || '#cbd5e1') + '66',
        }}
      >
        <span>{statusIcons[value] || ''} {value.toUpperCase()}</span>
        <span className={`${styles.dropdownCaret} ${open ? styles.dropdownCaretOpen : ''}`}>▼</span>
      </button>

      {open && (
        <div className={styles.customDropdownMenu}>
          {STATUS_OPTIONS.map(s => {
            const meta = STATUS_META[s] || {};
            const isSelected = s === value;
            return (
              <button
                key={s}
                type="button"
                className={styles.customDropdownOption}
                style={{
                  color: meta.color || '#334155',
                  background: isSelected ? (meta.bg || '#f1f5f9') : 'transparent',
                }}
                onClick={() => { onChange(s); setOpen(false); }}
              >
                <span>{statusIcons[s] || ''} {s.toUpperCase()}</span>
                {isSelected && <span>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Orders() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [newOrder, setNewOrder] = useState({ table: '', items: [], paymentStatus: 'pending', paymentMethod: 'pending' });
  const [deleteTarget, setDeleteTarget] = useState(null);

  /* ── Load ── */
  const load = async () => {
    try {
      const [ordersRes, tablesRes, menuRes] = await Promise.all([
        api.get('/orders'),
        api.get('/tables'),
        api.get('/menu?available=true'),
      ]);
      const sorted = ordersRes.data.sort((a, b) =>
        new Date(b.updatedAt || b.createdAt || b._id) - new Date(a.updatedAt || a.createdAt || a._id)
      );
      setOrders(sorted);
      setTables(tablesRes.data || []);
      setMenuItems(menuRes.data || []);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  /* ── Toast ── */
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  /* ── Manual order helpers ── */
  const addItemToNew = (itemId) => {
    const item = menuItems.find(m => m._id === itemId);
    if (!item) return;
    setNewOrder(prev => {
      const existing = prev.items.find(i => i.menuItem === itemId);
      if (existing) {
        return { ...prev, items: prev.items.map(i => i.menuItem === itemId ? { ...i, quantity: i.quantity + 1 } : i) };
      }
      return { ...prev, items: [...prev.items, { menuItem: item._id, name: item.name, quantity: 1, price: item.price }] };
    });
  };

  const updateQuantity = (itemId, delta) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.map(i => {
        if (i.menuItem === itemId) {
          const newQty = i.quantity + delta;
          return { ...i, quantity: newQty };
        }
        return i;
      }).filter(i => i.quantity > 0),
    }));
  };

  const submitManualOrder = async (e) => {
    e.preventDefault();
    if (!newOrder.table || newOrder.items.length === 0) return alert('Select table and items');
    try {
      await api.post('/orders', {
        table: newOrder.table,
        items: newOrder.items.map(i => ({ menuItem: i.menuItem, quantity: i.quantity })),
        paymentStatus: newOrder.paymentStatus,
        paymentMethod: newOrder.paymentMethod,
        orderType: 'manual',
      });
      setShowNew(false);
      setNewOrder({ table: '', items: [], paymentStatus: 'pending', paymentMethod: 'pending' });
      load();
      showToast('✓ Order placed successfully');
    } catch (err) {
      console.error("Manual order error:", err.response?.data || err);
      alert(`Failed to place manual order: ${err.response?.data?.message || err.message}`);
    }
  };

  const updateStatus = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      load();
    } catch (err) { console.error(err); }
  };

  const handleDeleteOrder = async (orderToDel) => {
    try {
      await api.delete(`/orders/${orderToDel._id}`);
      setDeleteTarget(null);
      load();
      showToast('Order deleted');
    } catch (err) {
      alert(`Failed to delete order: ${err.response?.data?.message || err.message}`);
      setDeleteTarget(null);
    }
  };

  const updatePaymentStatus = async (orderId, paymentStatus) => {
    try {
      await api.put(`/orders/${orderId}/payment-status`, { paymentStatus });
      load();
    } catch (err) { console.error(err); }
  };

  /* ── Filters ── */
  const filtered = orders.filter(o => {
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    const term = search.toLowerCase();
    const tableStr = `table ${o.table?.number || o.table?.name || o.table || ''}`.toLowerCase();
    const matchSearch = tableStr.includes(term) || (o.items || []).some(i => (i.menuItem?.name || i.name || '').toLowerCase().includes(term));
    return matchStatus && matchSearch;
  });

  const counts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    served: orders.filter(o => o.status === 'served').length,
  };

  if (loading) return <div className={styles.loading}>⏳ Loading orders…</div>;

  return (
    <>
      {deleteTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalIcon}>⚠️</div>
            <h3 className={styles.modalTitle}>Delete Order?</h3>
            <p className={styles.modalDesc}>
              <strong>Table {deleteTarget.table?.number || deleteTarget.table?.name || 'N/A'}</strong> — ₹{Number(deleteTarget.totalAmount || 0).toFixed(2)}<br />
              will be permanently deleted and cannot be reversed.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancel} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className={styles.modalConfirm} onClick={() => handleDeleteOrder(deleteTarget)}>Yes, Remove</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.page}>
        {toast ? <div className={styles.toast}>{toast}</div> : null}

        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Live <span>Orders</span></h1>
            <p className={styles.pageSubtitle}>{orders.length} order{orders.length !== 1 ? 's' : ''} </p>
          </div>
          <button type="button" className={styles.newBtn} onClick={() => setShowNew(!showNew)}>
            {showNew ? 'Close New Order' : '+ New Manual Order'}
          </button>
        </div>

        {showNew && (
          <div className={styles.inlineFormCard}>
            <form onSubmit={submitManualOrder} className={styles.inlineForm}>
              <h3 className={styles.inlineFormTitle}>➕ Create Manual Order</h3>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Table</label>
                  <select
                    required
                    className={styles.input}
                    value={newOrder.table}
                    onChange={e => setNewOrder({ ...newOrder, table: e.target.value })}
                  >
                    <option value="">Select Table…</option>
                    {tables?.map(t => {
                      if (!t) return null;
                      const occupied = t?.status === 'occupied';
                      return (
                        <option key={t?._id || Math.random()} value={t?._id} disabled={occupied} style={occupied ? { color: '#666', fontStyle: 'italic' } : {}}>
                          {occupied ? `Table ${t?.number || t?.name || 'N/A'}  🔴 Occupied` : `Table ${t?.number || t?.name || 'N/A'}  ✅ Available`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Add Menu Items</label>
                  <select
                    className={styles.input}
                    onChange={e => { if (e.target.value) addItemToNew(e.target.value); e.target.value = ''; }}
                  >
                    <option value="">Pick a menu item…</option>
                    {menuItems?.map(m => {
                      if (!m) return null;
                      return (
                        <option key={m?._id || Math.random()} value={m?._id}>{m?.name || 'Unnamed'} — ₹{m?.price || 0}</option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {newOrder.items.length > 0 && (
                <div className={styles.previewContainer}>
                  <ul className={styles.previewList}>
                    {newOrder.items.map(item => (
                      <li key={item.menuItem} className={styles.previewItem}>
                        <span className={styles.itemName}>{item.name}</span>
                        <div className={styles.qtyControls}>
                          <button type="button" onClick={() => updateQuantity(item.menuItem, -1)}>−</button>
                          <span className={styles.qtyNumber}>{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.menuItem, 1)}>+</button>
                        </div>
                        <span className={styles.itemTotal}>₹{(item.price * item.quantity).toFixed(0)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Payment Status</label>
                  <select className={styles.input} value={newOrder.paymentStatus} onChange={e => setNewOrder({ ...newOrder, paymentStatus: e.target.value })}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Payment Method</label>
                  <select className={styles.input} value={newOrder.paymentMethod} onChange={e => setNewOrder({ ...newOrder, paymentMethod: e.target.value })}>
                    <option value="pending">N/A</option>
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                  </select>
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.placeBtnLarge}>Submit Order</button>
              </div>
            </form>
          </div>
        )}

        <div className={styles.statsBar}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{counts.all}</span>
            <span className={styles.statLabel}>Total Orders</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue} style={{ color: STATUS_META.pending.color }}>{counts.pending}</span>
            <span className={styles.statLabel}>⏳ Pending</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue} style={{ color: STATUS_META.preparing.color }}>{counts.preparing}</span>
            <span className={styles.statLabel}>🍳 Preparing</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue} style={{ color: STATUS_META.ready.color }}>{counts.ready}</span>
            <span className={styles.statLabel}>✅ Ready</span>
          </div>
        </div>

        <div className={styles.filters}>
          {['all', 'pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'].map(s => {
            const meta = STATUS_META[s];
            const active = filterStatus === s;
            return (
              <button
                key={s}
                type="button"
                className={`${styles.filterTab} ${active ? styles.filterTabActive : ''}`}
                onClick={() => setFilterStatus(s)}
                style={active && s !== 'all' ? { color: meta.color, borderColor: meta.color, background: meta.bg } : {}}
              >
                {s === 'all' ? '📋' : ''}{s.charAt(0).toUpperCase() + s.slice(1)}
                {counts[s] !== undefined && (
                  <span className={styles.tabCount}>{counts[s]}</span>
                )}
              </button>
            );
          })}
          
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              placeholder="Search Table or Item…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <span>📭</span>
            <p>No orders match this filter.</p>
          </div>
        ) : (
          <div className={styles.orderGrid}>
            {filtered.map(order => {
              const statusMeta = STATUS_META[order.status] || STATUS_META.pending;
              return (
                <div key={order._id} className={styles.orderCard} style={{ '--card-accent': statusMeta.color }}>
                  <div className={styles.cardHead}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className={styles.tableLabel}>
                        <span className={styles.tableNumber}>
                          Table {order.table?.number || order.table?.name || 'N/A'}
                        </span>
                        <span className={styles.orderTypeIcon} title={order.orderType === 'ai' ? 'AI Order' : 'Manual Order'}>
                          {order.orderType === 'ai' ? '🤖' : '👨‍🍳'}
                        </span>
                      </div>
                      {/* Customer Details */}
                      {order.customerName && (
                        <div style={{ fontSize: '0.8rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          👤 <span>{order.customerName}</span>
                          {order.customerPhone && <span style={{ color: '#888' }}>(📞 {order.customerPhone})</span>}
                        </div>
                      )}
                    </div>
                    
                    <div className={styles.cardMeta}>
                      {order.paymentMethod && order.paymentMethod !== 'pending' && (
                        <span className={`${styles.payBadge} ${order.paymentMethod === 'cash' ? styles.cashBadge : styles.onlineBadge}`}>
                          {order.paymentMethod.toUpperCase()}
                        </span>
                      )}
                      <span className={styles.amount}>₹{Number(order.totalAmount || 0).toFixed(2)}</span>
                      {isAdmin && (
                        <button type="button" className={styles.deleteBtn} onClick={() => setDeleteTarget(order)} title="Delete order">
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  <ul className={styles.itemList}>
                    {order.items?.map((item, i) => (
                      <li key={i} className={styles.itemRow}>
                        <div className={styles.itemDetails}>
                          <span>{item.menuItem?.name || item.name}</span>
                          {/* Show customization choices */}
                          {item.customization && Object.keys(item.customization).length > 0 && (
                            <div className={styles.customizationTags}>
                              {Object.entries(item.customization).map(([label, val]) =>
                                val && (!Array.isArray(val) || val.length > 0) ? (
                                  <span key={label} className={styles.customTag}>
                                    {label}: {Array.isArray(val) ? val.join(', ') : val}
                                  </span>
                                ) : null
                              )}
                            </div>
                          )}
                        </div>
                        <span className={styles.itemQty}>×{item.quantity}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Special Cooking Instructions / Notes */}
                  {order.notes && (
                    <div style={{ padding: '8px 12px', background: '#fff7ed', borderLeft: '4px solid #f2994a', margin: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', color: '#c2410c', fontWeight: 600 }}>
                      📝 <strong>Special Cooking Instructions:</strong> {order.notes}
                    </div>
                  )}

                  {/* Customer Rating & Feedback */}
                  {(order.rating || order.feedback) && (
                    <div style={{ padding: '8px 12px', background: '#f0fdf4', borderLeft: '4px solid #16a34a', margin: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', color: '#15803d' }}>
                      {order.rating && <div>⭐ <strong>Rating:</strong> {'⭐'.repeat(order.rating)} ({order.rating}/5)</div>}
                      {order.feedback && <div style={{ marginTop: '2px' }}>💬 <strong>Feedback:</strong> "{order.feedback}"</div>}
                    </div>
                  )}

                  <div className={styles.cardFooter}>
                    <span className={styles.orderTime}>
                      🕐 {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className={styles.selectGroup}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: '120px' }}>
                        <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#64748b', fontWeight: '800', letterSpacing: '0.05em' }}>Order Status</span>
                        <OrderStatusDropdown
                          value={order.status}
                          onChange={newVal => updateStatus(order._id, newVal)}
                          statusMeta={statusMeta}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: '120px' }}>
                        <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#64748b', fontWeight: '800', letterSpacing: '0.05em' }}>Payment Status</span>
                        <PaymentDropdown
                          value={order.paymentStatus || 'pending'}
                          onChange={newVal => updatePaymentStatus(order._id, newVal)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}