import React, { useState, useEffect } from 'react';
import api from '../services/api';
import styles from './Settings.module.css';

export default function Settings() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/categories/${editing._id}`, form);
      } else {
        await api.post('/categories', form);
      }
      setForm({ name: '', description: '' });
      setEditing(null);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description || '' });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/categories/${deleteTarget._id}`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      console.error(err);
      setDeleteTarget(null);
    }
  };

  if (loading) return <div className={styles.loading}>⏳ Loading settings…</div>;

  return (
    <>
      {deleteTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalIcon}>⚠️</div>
            <h3 className={styles.modalTitle}>Delete Category?</h3>
            <p className={styles.modalDesc}>
              <strong>{deleteTarget.name}</strong> will be permanently deleted. Menu items in this category may be affected.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancel} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className={styles.modalConfirm} onClick={confirmDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.page}>
      
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Menu <span>Categories</span></h1>
          <p className={styles.pageSubtitle}>
            {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'} organized
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className={styles.formCard}>
        <h3 className={styles.formTitle}>
          {editing ? '✏️ Edit Category' : '➕ Create New Category'}
        </h3>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <input
              placeholder="Category name (e.g. Desserts)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <input
              placeholder="Short description (optional)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          
          <div className={styles.formActions}>
            <button type="submit" className={styles.btn}>
              {editing ? 'Update Category' : 'Add Category'}
            </button>
            {editing && (
              <button type="button" className={styles.btnSecondary} onClick={() => setEditing(null)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Categories Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={3}>
                  <div className={styles.emptyState}>
                    <span>📭</span>
                    <p>No categories yet. Add one to organize your menu.</p>
                  </div>
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat._id} className={styles.row}>
                  <td>
                    <span className={styles.catName}>
                      <span className={styles.catIcon}>{cat.name.charAt(0).toUpperCase()}</span>
                      {cat.name}
                    </span>
                  </td>
                  <td className={styles.catDesc}>
                    {cat.description || '—'}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button type="button" className={styles.smallBtn} onClick={() => handleEdit(cat)}>
                        ✏️ Edit
                      </button>
                      <button type="button" className={styles.smallBtnDanger} onClick={() => setDeleteTarget(cat)}>
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}
