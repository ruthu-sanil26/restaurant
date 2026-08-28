import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from './Staff.module.css';

const ROLES = ['admin', 'receptionist', 'waiter'];

const ROLE_META = {
  admin:        { label: 'Admin',        color: '#f0c674', bg: 'rgba(240,198,116,0.13)', icon: '👑' },
  receptionist: { label: 'Receptionist', color: '#64b5f6', bg: 'rgba(100,181,246,0.13)', icon: '🧑‍💼' },
  waiter:       { label: 'Waiter',       color: '#81c784', bg: 'rgba(129,199,132,0.13)', icon: '🍽️' },
};

export default function Staff() {
  const { user: me } = useAuth();
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [toast,       setToast]       = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [updatingId,  setUpdatingId]  = useState(null);
  const [filterRole,  setFilterRole]  = useState('all');
  const [search,      setSearch]      = useState('');

  /* ── Load ── */
  const load = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch (err) {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* ── Toast helper ── */
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  /* ── Change Role ── */
  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      const res = await api.put(`/auth/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u._id === userId ? res.data : u));
      showToast(`✓ Role updated to ${newRole}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  };

  /* ── Delete User ── */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/auth/users/${deleteTarget._id}`);
      setUsers(prev => prev.filter(u => u._id !== deleteTarget._id));
      showToast(`${deleteTarget.idNumber} removed`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeleteTarget(null);
    }
  };

  /* ── Filters ── */
  const filtered = users.filter(u => {
    const matchRole   = filterRole === 'all' || u.role === filterRole;
    const matchSearch = (u.idNumber || '').toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const counts = {
    all:          users.length,
    admin:        users.filter(u => u.role === 'admin').length,
    receptionist: users.filter(u => u.role === 'receptionist' || u.role === 'staff').length,
    waiter:       users.filter(u => u.role === 'waiter').length,
  };

  const initials  = (idNumber) => idNumber?.slice(0, 2).toUpperCase() || '?';
  const joinedDate = (date) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) return <div className={styles.loading}>⏳ Loading team…</div>;
  if (error)   return <div className={styles.error}>⚠️ {error}</div>;

  return (
    <div className={styles.page}>

      {/* ── Toast ── */}
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalIcon}>⚠️</div>
            <h3 className={styles.modalTitle}>Remove Staff Member?</h3>
            <p className={styles.modalDesc}>
              <strong>{deleteTarget.idNumber}</strong> ({deleteTarget.email}) will be permanently
              deleted and will no longer be able to log in.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className={styles.modalConfirm} onClick={confirmDelete}>
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Staff <span>Management</span></h1>
          <p className={styles.pageSubtitle}>
            {users.length} team member{users.length !== 1 ? 's' : ''} registered
          </p>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{counts.all}</span>
          <span className={styles.statLabel}>Total Members</span>
        </div>
        <div className={styles.statCard} style={{ '--sv-color': ROLE_META.admin.color }}>
          <span className={styles.statValue} style={{ color: ROLE_META.admin.color }}>{counts.admin}</span>
          <span className={styles.statLabel}>👑 Admins</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: ROLE_META.receptionist.color }}>{counts.receptionist}</span>
          <span className={styles.statLabel}>🧑‍💼 Receptionists</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: ROLE_META.waiter.color }}>{counts.waiter}</span>
          <span className={styles.statLabel}>🍽️ Waiters</span>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className={styles.filters}>
        <div className={styles.filterTabs}>
          {['all', 'admin', 'receptionist', 'waiter'].map(role => (
            <button
              key={role}
              className={`${styles.filterTab} ${filterRole === role ? styles.filterTabActive : ''}`}
              onClick={() => setFilterRole(role)}
              style={filterRole === role && role !== 'all' ? {
                color:       ROLE_META[role]?.color,
                borderColor: ROLE_META[role]?.color,
                background:  ROLE_META[role]?.bg,
              } : {}}
            >
              {role === 'all' ? '👥' : ROLE_META[role].icon}{' '}
              {role.charAt(0).toUpperCase() + role.slice(1)}
              <span className={styles.tabCount}>{counts[role]}</span>
            </button>
          ))}
        </div>

        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Search by ID number or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID Number</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              {me?.role === 'admin' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className={styles.emptyState}>
                    <span>🔎</span>
                    <p>No users match your filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(u => {
                const meta       = ROLE_META[u.role] || ROLE_META.receptionist;
                const isSelf     = u._id === me?._id;
                const isUpdating = updatingId === u._id;

                return (
                  <tr key={u._id} className={`${styles.row} ${isSelf ? styles.selfRow : ''}`}>

                    {/* Avatar + ID Number */}
                    <td>
                      <div className={styles.memberCell}>
                        <div
                          className={styles.avatar}
                          style={{ background: meta.bg, color: meta.color, borderColor: meta.color + '55' }}
                        >
                          {initials(u.idNumber)}
                        </div>
                        <div>
                          <span className={styles.memberName}>
                            {u.idNumber}
                            {isSelf && <span className={styles.youBadge}>You</span>}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className={styles.emailCell}>{u.email}</td>

                    {/* Role */}
                    <td>
                      {me?.role === 'admin' && !isSelf ? (
                        <select
                          className={styles.roleSelect}
                          value={u.role}
                          disabled={isUpdating}
                          style={{ color: meta.color, borderColor: meta.color + '88', background: meta.bg }}
                          onChange={e => handleRoleChange(u._id, e.target.value)}
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r}>{ROLE_META[r].icon} {ROLE_META[r].label}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={styles.rolePill}
                          style={{ color: meta.color, background: meta.bg, borderColor: meta.color + '55' }}
                        >
                          {meta.icon} {meta.label}
                        </span>
                      )}
                      {isUpdating && <span className={styles.updating}>Saving…</span>}
                    </td>

                    {/* Joined */}
                    <td className={styles.dateCell}>{joinedDate(u.createdAt)}</td>

                    {/* Actions */}
                    {me?.role === 'admin' && (
                      <td>
                        {!isSelf ? (
                          <button
                            className={styles.deleteBtn}
                            onClick={() => setDeleteTarget(u)}
                            title="Remove user"
                          >
                            🗑️ Remove
                          </button>
                        ) : (
                          <span className={styles.selfNote}>—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
