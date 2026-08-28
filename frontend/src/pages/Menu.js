import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from './Menu.module.css';

const API_BASE = 'http://localhost:5000';

const EMPTY_OPTION = { label: '', type: 'select', choices: [{ name: '', extraPrice: 0 }], required: false };

export default function Menu() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', category: '', available: true, image: '' });
  const [customizationOptions, setCustomizationOptions] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [filterChef, setFilterChef] = useState(false);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef();

  const isAdmin = user?.role === 'admin';

  const load = async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        api.get('/categories'),
        api.get('/menu'),
      ]);
      setCategories(catRes.data);
      setItems(itemRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (categories.length && !form.category) setForm((f) => ({ ...f, category: categories[0]._id }));
  }, [categories.length]);

  /* ---- Image selection ---- */
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
    setForm((f) => ({ ...f, image: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ---- Customization option helpers ---- */
  const addCustomizationOption = () =>
    setCustomizationOptions(prev => [...prev, { ...EMPTY_OPTION, choices: [{ name: '', extraPrice: 0 }] }]);

  const removeCustomizationOption = (idx) =>
    setCustomizationOptions(prev => prev.filter((_, i) => i !== idx));

  const updateCustomizationOption = (idx, field, value) =>
    setCustomizationOptions(prev => prev.map((opt, i) => i === idx ? { ...opt, [field]: value } : opt));

  const addChoice = (optIdx) =>
    setCustomizationOptions(prev => prev.map((opt, i) =>
      i === optIdx ? { ...opt, choices: [...opt.choices, { name: '', extraPrice: 0 }] } : opt
    ));

  const removeChoice = (optIdx, choiceIdx) =>
    setCustomizationOptions(prev => prev.map((opt, i) =>
      i === optIdx ? { ...opt, choices: opt.choices.filter((_, ci) => ci !== choiceIdx) } : opt
    ));

  const updateChoice = (optIdx, choiceIdx, field, value) =>
    setCustomizationOptions(prev => prev.map((opt, i) =>
      i === optIdx ? { ...opt, choices: opt.choices.map((c, ci) => ci === choiceIdx ? { ...c, [field]: value } : c) } : opt
    ));

  /* ---- Upload image then save item ---- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let imageUrl = form.image;

      // Upload new image if one was selected
      if (imageFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append('image', imageFile);
        const uploadRes = await api.post('/menu/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        imageUrl = uploadRes.data.imageUrl;
        setUploading(false);
      }

      // Clean up customization options before saving
      const cleanedOptions = customizationOptions
        .filter(opt => opt.label.trim())
        .map(opt => ({
          ...opt,
          choices: opt.type === 'text' ? [] : opt.choices.filter(c => c.name.trim()).map(c => ({
            name: c.name.trim(),
            extraPrice: parseFloat(c.extraPrice) || 0
          })),
        }));

      const payload = {
        ...form,
        price: parseFloat(form.price),
        category: form.category || categories[0]?._id,
        image: imageUrl,
        customizationOptions: cleanedOptions,
      };

      if (editing) {
        await api.put(`/menu/${editing._id}`, payload);
      } else {
        await api.post('/menu', payload);
      }

      setEditing(null);
      setForm({ name: '', description: '', price: '', category: categories[0]?._id || '', available: true, image: '' });
      setCustomizationOptions([]);
      setImageFile(null);
      setImagePreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
    } catch (err) {
      console.error(err);
      setUploading(false);
      alert('Failed to save menu item.');
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setImageFile(null);
    setImagePreview('');
    setForm({
      name: item.name,
      description: item.description || '',
      price: item.price?.toString() || '',
      category: item.category?._id || item.category,
      available: item.available !== false,
      image: item.image || '',
    });
    // Restore existing customization options
    setCustomizationOptions(
      (item.customizationOptions || []).map(opt => ({
        ...opt,
        choices: opt.choices?.length ? opt.choices.map(c => typeof c === 'string' ? { name: c, extraPrice: 0 } : c) : [{ name: '', extraPrice: 0 }],
      }))
    );
    // Show existing image as preview
    if (item.image) {
      setImagePreview(item.image.startsWith('http') ? item.image : `${API_BASE}${item.image}`);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/menu/${deleteTarget._id}`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      console.error(err);
      setDeleteTarget(null);
    }
  };

  const toggleChefRecommended = async (item) => {
    try {
      await api.put(`/menu/${item._id}`, {
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category?._id || item.category,
        available: item.available,
        image: item.image,
        isChefRecommended: !item.isChefRecommended,
      });
      load();
    } catch (err) {
      console.error('Toggle chef rec failed:', err);
    }
  };

  const getImageSrc = (image) => {
    if (!image) return null;
    return image.startsWith('http') ? image : `${API_BASE}${image}`;
  };

  if (loading) return <div className={styles.loading}>Loading menu...</div>;

  return (
    <>
      {deleteTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalIcon}>⚠️</div>
            <h3 className={styles.modalTitle}>Delete Menu Item?</h3>
            <p className={styles.modalDesc}>
              <strong>{deleteTarget.name}</strong> will be permanently deleted from the menu.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancel} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className={styles.modalConfirm} onClick={confirmDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.page}>
        <h1 className={styles.pageTitle}>Menu</h1>

      {isAdmin && (
        <form onSubmit={handleSubmit} className={styles.form}>

          {/* ── Image Upload Area ── */}
          <div className={styles.imageUploadArea}>
            <div
              className={styles.imageDropZone}
              onClick={() => fileInputRef.current?.click()}
              style={imagePreview ? { padding: 0, border: 'none' } : {}}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className={styles.imagePreview} />
              ) : (
                <div className={styles.imageDropPlaceholder}>
                  <span className={styles.uploadIcon}>🖼️</span>
                  <span>Click to upload image</span>
                  <span className={styles.uploadHint}>JPG, PNG, WEBP · max 5MB</span>
                </div>
              )}
            </div>
            {imagePreview && (
              <button type="button" className={styles.clearImageBtn} onClick={clearImage}>
                ✕ Remove
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* ── Text Fields ── */}
          <div className={styles.formFields}>
            <input
              placeholder="Item name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className={styles.input}
            />
            <input
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={styles.input}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Price"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              required
              className={styles.input}
            />
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className={styles.input}
            >
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={form.available}
                onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))}
              />
              Available
            </label>

            {/* ── Customization Options Builder ── */}
            <div className={styles.customizationSection}>
              <div className={styles.customizationHeader}>
                <span className={styles.customizationTitle}>🎛️ Customization Options</span>
                <button
                  type="button"
                  className={styles.addOptionBtn}
                  onClick={addCustomizationOption}
                >
                  + Add Option
                </button>
              </div>

              {customizationOptions.length === 0 && (
                <p className={styles.customizationHint}>
                  No options yet. Click "+ Add Option" to let customers personalize this item.
                </p>
              )}

              {customizationOptions.map((opt, optIdx) => (
                <div key={optIdx} className={styles.optionBlock}>
                  <div className={styles.optionBlockHeader}>
                    <input
                      className={`${styles.input} ${styles.optionLabelInput}`}
                      placeholder="Option label (e.g. Spice Level)"
                      value={opt.label}
                      onChange={(e) => updateCustomizationOption(optIdx, 'label', e.target.value)}
                    />
                    <select
                      className={`${styles.input} ${styles.optionTypeSelect}`}
                      value={opt.type}
                      onChange={(e) => updateCustomizationOption(optIdx, 'type', e.target.value)}
                    >
                      <option value="select">Single choice</option>
                      <option value="checkbox">Multi-select</option>
                      <option value="text">Free text</option>
                    </select>
                    <label className={styles.requiredLabel}>
                      <input
                        type="checkbox"
                        checked={opt.required}
                        onChange={(e) => updateCustomizationOption(optIdx, 'required', e.target.checked)}
                      />
                      Required
                    </label>
                    <button
                      type="button"
                      className={styles.removeOptionBtn}
                      onClick={() => removeCustomizationOption(optIdx)}
                    >
                      ✕
                    </button>
                  </div>

                  {opt.type !== 'text' && (
                    <div className={styles.choicesList}>
                      {opt.choices.map((choice, choiceIdx) => (
                        <div key={choiceIdx} className={styles.choiceRow}>
                          <input
                            className={`${styles.input} ${styles.choiceInput}`}
                            placeholder={`Choice ${choiceIdx + 1}`}
                            value={choice.name}
                            onChange={(e) => updateChoice(optIdx, choiceIdx, 'name', e.target.value)}
                          />
                          <input
                            type="number"
                            step="0.01"
                            style={{ width: '100px' }}
                            className={`${styles.input} ${styles.choiceInput}`}
                            placeholder="+ Price"
                            value={choice.extraPrice}
                            onChange={(e) => updateChoice(optIdx, choiceIdx, 'extraPrice', e.target.value)}
                          />
                          {opt.choices.length > 1 && (
                            <button
                              type="button"
                              className={styles.removeChoiceBtn}
                              onClick={() => removeChoice(optIdx, choiceIdx)}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className={styles.addChoiceBtn}
                        onClick={() => addChoice(optIdx)}
                      >
                        + Add Choice
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.btn} disabled={uploading}>
                {uploading ? 'Uploading…' : editing ? 'Update Item' : 'Add Item'}
              </button>
              {editing && (
                <button type="button" className={styles.btnSecondary} onClick={() => {
                  setEditing(null);
                  clearImage();
                  setCustomizationOptions([]);
                  setForm({ name: '', description: '', price: '', category: categories[0]?._id || '', available: true, image: '' });
                }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterTabs}>
          <button
            className={`${styles.filterBtn} ${!filterChef ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterChef(false)}
          >
            All Items
          </button>
          <button
            className={`${styles.filterBtn} ${filterChef ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterChef(true)}
          >
            👨‍🍳 Chef's Picks {items.filter(i => i.isChefRecommended).length > 0 && `(${items.filter(i => i.isChefRecommended).length})`}
          </button>
        </div>

        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Search Menu…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.grid}>
        {items
          .filter(item => {
            const matchChef = !filterChef || item.isChefRecommended;
            const term = search.toLowerCase();
            const matchSearch = item.name.toLowerCase().includes(term) || (item.category?.name || '').toLowerCase().includes(term);
            return matchChef && matchSearch;
          })
          .map((item) => (
          <div key={item._id} className={`${styles.card} ${item.isChefRecommended ? styles.chefCard : ''}`}>
            {/* Image */}
            {getImageSrc(item.image) ? (
              <div className={styles.imageWrapper}>
                <img
                  src={getImageSrc(item.image)}
                  alt={item.name}
                  className={styles.cardImg}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                {item.available === false && (
                  <span className={styles.unavailableBadge}>Unavailable</span>
                )}
                {item.isChefRecommended && (
                  <span className={styles.chefBadge}>👨‍🍳 Chef's Pick</span>
                )}
              </div>
            ) : (
              <div className={styles.noImage}>
                {item.isChefRecommended && <span className={styles.chefBadgeNoImg}>👨‍🍳 Chef's Pick</span>}
                <span>🍽️</span>
              </div>
            )}

            <div className={styles.cardBody}>
              <div className={styles.cardHeader}>
                <span className={styles.name}>{item.name}</span>
                <span className={styles.price}>₹{(item.price || 0).toLocaleString('en-IN')}</span>
              </div>
              {item.description && <p className={styles.desc}>{item.description}</p>}
              <span className={styles.categoryTag}>{item.category?.name}</span>
              {item.customizationOptions?.length > 0 && (
                <span className={styles.customizableBadge}>🎛️ Customizable</span>
              )}
              {!getImageSrc(item.image) && item.available === false && (
                <span className={styles.unavailable}>Unavailable</span>
              )}
              {isAdmin && (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={`${styles.chefToggleBtn} ${item.isChefRecommended ? styles.chefToggleOn : ''}`}
                    onClick={() => toggleChefRecommended(item)}
                    title={item.isChefRecommended ? "Remove from Chef's Picks" : "Mark as Chef's Pick"}
                  >
                    {item.isChefRecommended ? '⭐ Chef Pick' : '☆ Chef Pick'}
                  </button>
                  <button type="button" className={styles.smallBtn} onClick={() => handleEdit(item)}>Edit</button>
                  <button type="button" className={styles.smallBtnDanger} onClick={() => setDeleteTarget(item)}>Delete</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && <p className={styles.empty}>No menu items. Add categories in Settings first.</p>}
    </div>
    </>
  );
}
