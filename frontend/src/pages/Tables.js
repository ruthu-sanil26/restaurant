import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from './Tables.module.css';

export default function Tables() {
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ number: '', capacity: '' });
  const [editing, setEditing] = useState(null); // table being edited
  const [deleteTarget, setDeleteTarget] = useState(null);
  const isAdmin = user?.role === 'admin';

  const load = async () => {
    try {
      const res = await api.get('/tables');
      setTables(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* ── Add new table ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tables', {
        number: parseInt(form.number, 10),
        capacity: parseInt(form.capacity, 10),
      });
      setForm({ number: '', capacity: '' });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add table');
    }
  };

  /* ── Start editing ── */
  const handleEdit = (table) => {
    setEditing(table);
    setForm({ number: table.number, capacity: table.capacity });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── Save edit ── */
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/tables/${editing._id}`, {
        number: parseInt(form.number, 10),
        capacity: parseInt(form.capacity, 10),
      });
      setEditing(null);
      setForm({ number: '', capacity: '' });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update table');
    }
  };

  /* ── Cancel edit ── */
  const handleCancelEdit = () => {
    setEditing(null);
    setForm({ number: '', capacity: '' });
  };

  /* ── Delete ── */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/tables/${deleteTarget._id}`);
      if (editing?._id === deleteTarget._id) handleCancelEdit();
      setDeleteTarget(null);
      load();
    } catch (err) {
      console.error(err);
      setDeleteTarget(null);
    }
  };

  if (loading) return <div className={styles.loading}>Loading tables...</div>;

  const isEditing = !!editing;

  return (
    <>
      {deleteTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalIcon}>⚠️</div>
            <h3 className={styles.modalTitle}>Delete Table?</h3>
            <p className={styles.modalDesc}>
              <strong>Table {deleteTarget.number}</strong> will be permanently removed.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancel} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className={styles.modalConfirm} onClick={confirmDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.page}>
        <h1 className={styles.pageTitle}>Tables</h1>

      {isAdmin && (
        <form onSubmit={isEditing ? handleUpdate : handleSubmit} className={`${styles.form} ${isEditing ? styles.formEditing : ''}`}>
          {isEditing && (
            <span className={styles.editingLabel}>✏️ Editing Table {editing.number}</span>
          )}
          <input
            type="number"
            placeholder="Table number"
            value={form.number}
            onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
            required
            min="1"
            className={styles.input}
          />
          <input
            type="number"
            placeholder="Capacity"
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            required
            min="1"
            className={styles.input}
          />
          <button type="submit" className={styles.btn}>
            {isEditing ? 'Save Changes' : 'Add Table'}
          </button>
          {isEditing && (
            <button type="button" className={styles.btnCancel} onClick={handleCancelEdit}>
              Cancel
            </button>
          )}
        </form>
      )}

      <div className={styles.grid}>
        {tables.map((table) => (
          <div
            key={table._id}
            className={`${styles.card} ${editing?._id === table._id ? styles.cardActive : ''}`}
            data-status={table.status}
          >
            <div className={styles.cardTop}>
              <span className={styles.tableNumber}>Table {table.number}</span>
              <span className={`${styles.statusPill} ${styles[`status_${table.status}`]}`}>
                {table.status}
              </span>
            </div>

            <span className={styles.capacity}>👥 {table.capacity} seats</span>



            {isAdmin && (
              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={styles.editBtn}
                  onClick={() => handleEdit(table)}
                  disabled={editing?._id === table._id}
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => setDeleteTarget(table)}
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {tables.length === 0 && (
        <p className={styles.empty}>No tables yet. Add one above.</p>
      )}
    </div>
    </>
  );
}
