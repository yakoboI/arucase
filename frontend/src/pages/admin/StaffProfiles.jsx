import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import { resolveStaticUrl } from '../../utils/backendUrl';
import './StaffProfiles.css';

const emptyForm = {
  full_name: '',
  role_title: '',
  is_teaching: true,
  contact_phone: '',
  contact_email: '',
  display_order: 0,
  active: true,
};

export default function StaffProfiles() {
  const { loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: profiles = [], isLoading, isError, error } = useQuery({
    queryKey: ['staff-profiles-admin'],
    queryFn: async () => {
      const res = await adminAPI.getStaffProfiles();
      return res.data?.staff_profiles || [];
    },
    enabled: !authLoading,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (k === 'photo') return;
        fd.append(k, v ?? '');
      });
      if (payload.photo instanceof File) fd.append('photo', payload.photo);
      return adminAPI.saveStaffProfile(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-profiles-admin'] });
      toast.success(`Wasifu ${editing ? 'umesasishwa' : 'umehifadhiwa'} kwa mafanikio.`);
      closeModal();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Imeshindikana kuhifadhi wasifu.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => adminAPI.deleteStaffProfile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-profiles-admin'] });
      toast.success('Wasifu umefutwa kwa mafanikio.');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Imeshindikana kufuta wasifu.'),
  });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (profiles || []).filter((p) => {
      if (typeFilter === 'teachers' && !p.is_teaching) return false;
      if (typeFilter === 'non-teaching' && p.is_teaching) return false;
      if (!q) return true;
      const hay = [
        p.full_name, p.role_title, p.contact_phone, p.contact_email,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [profiles, search, typeFilter]);

  const stats = useMemo(() => {
    const all = profiles || [];
    const teachers = all.filter((p) => p.is_teaching).length;
    const nonTeaching = all.filter((p) => !p.is_teaching).length;
    const active = all.filter((p) => p.active !== false).length;
    return { total: all.length, teachers, nonTeaching, active };
  }, [profiles]);

  /** When the grid is empty: no data at all vs filtered/search with no matches */
  const emptyContext = useMemo(() => {
    if (visible.length > 0) return null;
    const all = profiles || [];
    if (all.length === 0) return { kind: 'none' };
    const q = search.trim();
    if (q) return { kind: 'search', q };
    if (typeFilter === 'teachers') return { kind: 'teachers' };
    if (typeFilter === 'non-teaching') return { kind: 'non-teaching' };
    return { kind: 'none' };
  }, [visible, profiles, search, typeFilter]);

  const openCreate = (overrides = {}) => {
    setEditing(null);
    setForm({ ...emptyForm, ...overrides });
    setSelectedPhoto(null);
    setPhotoPreview('');
    setOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      full_name: p.full_name || '',
      role_title: p.role_title || '',
      is_teaching: Boolean(p.is_teaching),
      contact_phone: p.contact_phone || '',
      contact_email: p.contact_email || '',
      display_order: p.display_order || 0,
      active: p.active !== false,
    });
    setSelectedPhoto(null);
    setPhotoPreview(p.photo_path ? toImageUrl(p.photo_path) : '');
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setSelectedPhoto(null);
    setPhotoPreview('');
  };

  const toImageUrl = (photoPath) => resolveStaticUrl(photoPath);

  const onPhoto = (file) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Tafadhali pakia picha ya PNG/JPG/WEBP/GIF.');
      return;
    }
    setSelectedPhoto(file);
    const r = new FileReader();
    r.onload = () => setPhotoPreview(String(r.result || ''));
    r.readAsDataURL(file);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.role_title.trim()) {
      toast.error('Jina kamili na cheo/kazi vinahitajika.');
      return;
    }
    saveMutation.mutate({
      id: editing?.id,
      ...form,
      photo: selectedPhoto,
    });
  };

  const confirmDeleteProfile = (p) => {
    if (!window.confirm(`Futa wasifu wa "${p.full_name}"?`)) return;
    deleteMutation.mutate(p.id);
  };

  return (
    <AdminLayout>
      <div className="staff-profiles-page">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-id-badge" />
            <span className="staff-page-title">Wasifu wa Watumishi (Walimu na Wasio Walimu)</span>
            <div className="header-actions">
              <button type="button" className="excel-btn secondary small" onClick={openCreate}>
                <i className="fas fa-plus-circle" aria-hidden="true" /> Ongeza Wasifu
              </button>
            </div>
          </div>
          <div className="excel-card-body">
            <div className="staff-stats">
              <span className="staff-stat"><small>Jumla</small><strong>{stats.total}</strong></span>
              <span className="staff-stat"><small>Walimu</small><strong>{stats.teachers}</strong></span>
              <span className="staff-stat"><small>Wasio walimu</small><strong>{stats.nonTeaching}</strong></span>
              <span className="staff-stat"><small>Hai</small><strong>{stats.active}</strong></span>
            </div>
            <div className="staff-toolbar">
              <input
                className="excel-input"
                placeholder="Tafuta kwa jina, kazi, simu au barua pepe."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="staff-type-filters" role="tablist" aria-label="Aina ya watumishi">
                <button
                  type="button"
                  role="tab"
                  aria-selected={typeFilter === 'all'}
                  id="staff-filter-all"
                  className={`staff-filter-tab ${typeFilter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setTypeFilter('all')}
                >
                  Wote
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={typeFilter === 'teachers'}
                  id="staff-filter-teachers"
                  className={`staff-filter-tab ${typeFilter === 'teachers' ? 'is-active' : ''}`}
                  onClick={() => setTypeFilter('teachers')}
                >
                  Walimu
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={typeFilter === 'non-teaching'}
                  id="staff-filter-non-teaching"
                  className={`staff-filter-tab ${typeFilter === 'non-teaching' ? 'is-active' : ''}`}
                  onClick={() => setTypeFilter('non-teaching')}
                >
                  Wasio Walimu
                </button>
              </div>
            </div>

            {authLoading ? (
              <div className="loading-state"><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Inathibitisha kuingia...</div>
            ) : isLoading ? (
              <div className="loading-state"><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Inapakia wasifu...</div>
            ) : isError ? (
              <div className="staff-empty-panel staff-empty-panel--error">
                <div className="staff-empty-panel__icon" aria-hidden="true">
                  <i className="fas fa-plug-circle-xmark" />
                </div>
                <h3 className="staff-empty-panel__title">Imeshindikana kufikia seva</h3>
                <p className="staff-empty-panel__text">
                  Hatujaweza kupata data ya wasifu kwa sasa.
                  {error?.message ? ` (${error.message})` : ''}
                </p>
                <button
                  type="button"
                  className="excel-btn secondary staff-empty-panel__cta"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['staff-profiles-admin'] })}
                >
                  <i className="fas fa-rotate-right" aria-hidden="true" /> Jaribu Tena
                </button>
              </div>
            ) : visible.length === 0 ? (
              emptyContext?.kind === 'none' ? (
                <div className="staff-empty-panel staff-empty-panel--hero">
                  <div className="staff-empty-hero-visual" aria-hidden="true">
                    <div className="staff-empty-hero-ring">
                      <i className="fas fa-users" />
                    </div>
                    <span className="staff-empty-hero-badge staff-empty-hero-badge--a">
                      <i className="fas fa-chalkboard-teacher" />
                    </span>
                    <span className="staff-empty-hero-badge staff-empty-hero-badge--b">
                      <i className="fas fa-briefcase" />
                    </span>
                  </div>
                  <h3 className="staff-empty-panel__title">Hakuna wasifu</h3>
                  <p className="staff-empty-panel__text">
                    Ongeza wasifu wa walimu na watumishi wasio walimu ili waonekane kwenye ukurasa wa umma.
                  </p>
                  <div className="staff-empty-hint-cards">
                    <button
                      type="button"
                      className="staff-empty-hint-card"
                      onClick={() => openCreate({ is_teaching: true })}
                    >
                      <span className="staff-empty-hint-card__icon staff-empty-hint-card__icon--teacher">
                        <i className="fas fa-chalkboard-teacher" aria-hidden="true" />
                      </span>
                      <span className="staff-empty-hint-card__label">Mwalimu</span>
                      <span className="staff-empty-hint-card__hint">Ongeza mwalimu na picha</span>
                    </button>
                    <button
                      type="button"
                      className="staff-empty-hint-card"
                      onClick={() => openCreate({ is_teaching: false })}
                    >
                      <span className="staff-empty-hint-card__icon staff-empty-hint-card__icon--staff">
                        <i className="fas fa-user-tie" aria-hidden="true" />
                      </span>
                      <span className="staff-empty-hint-card__label">Sio mwalimu</span>
                      <span className="staff-empty-hint-card__hint">Ofisi, maabara, utawala, n.k.</span>
                    </button>
                  </div>
                  <button type="button" className="excel-btn primary staff-empty-panel__cta staff-empty-panel__cta--main" onClick={() => openCreate()}>
                    <i className="fas fa-user-plus" aria-hidden="true" /> Ongeza Wasifu wa Kwanza
                  </button>
                </div>
              ) : emptyContext?.kind === 'non-teaching' ? (
                <div className="staff-empty-panel staff-empty-panel--filter">
                  <div className="staff-empty-panel__icon staff-empty-panel__icon--muted" aria-hidden="true">
                    <i className="fas fa-briefcase" />
                  </div>
                  <h3 className="staff-empty-panel__title">Hakuna wasifu wa wasio walimu</h3>
                  <p className="staff-empty-panel__text">
                    Ongeza wasifu wa watumishi wasio walimu ili waonekane kwenye ukurasa wa umma pamoja na walimu.
                    Kwa sasa kichujio &quot;Wasio Walimu&quot; hakina matokeo.
                  </p>
                  <div className="staff-empty-filter-actions">
                    <button type="button" className="excel-btn primary staff-empty-panel__cta" onClick={() => openCreate({ is_teaching: false })}>
                      <i className="fas fa-user-plus" aria-hidden="true" /> Ongeza Wasio Walimu
                    </button>
                    <button type="button" className="excel-btn secondary staff-empty-panel__cta" onClick={() => setTypeFilter('all')}>
                      <i className="fas fa-list" aria-hidden="true" /> Ona wote
                    </button>
                  </div>
                </div>
              ) : emptyContext?.kind === 'teachers' ? (
                <div className="staff-empty-panel staff-empty-panel--filter">
                  <div className="staff-empty-panel__icon staff-empty-panel__icon--muted" aria-hidden="true">
                    <i className="fas fa-chalkboard-teacher" />
                  </div>
                  <h3 className="staff-empty-panel__title">Hakuna wasifu wa walimu</h3>
                  <p className="staff-empty-panel__text">
                    Hakuna walimu kwenye orodha kwa sasa. Ongeza wasifu wa mwalimu au badilisha kichujio kuona aina nyingine.
                  </p>
                  <div className="staff-empty-filter-actions">
                    <button type="button" className="excel-btn primary staff-empty-panel__cta" onClick={() => openCreate({ is_teaching: true })}>
                      <i className="fas fa-user-plus" aria-hidden="true" /> Ongeza Mwalimu
                    </button>
                    <button type="button" className="excel-btn secondary staff-empty-panel__cta" onClick={() => setTypeFilter('all')}>
                      <i className="fas fa-list" aria-hidden="true" /> Ona wote
                    </button>
                  </div>
                </div>
              ) : (
                <div className="staff-empty-panel staff-empty-panel--filter">
                  <div className="staff-empty-panel__icon staff-empty-panel__icon--muted" aria-hidden="true">
                    <i className="fas fa-magnifying-glass" />
                  </div>
                  <h3 className="staff-empty-panel__title">Hakuna matokeo ya utafutaji</h3>
                  <p className="staff-empty-panel__text">
                    Hakuna wasifu unaolingana na &quot;{emptyContext.q}&quot;. Jaribu maneno mengine au futa utafutaji.
                  </p>
                  <button type="button" className="excel-btn secondary staff-empty-panel__cta" onClick={() => setSearch('')}>
                    <i className="fas fa-xmark" aria-hidden="true" /> Futa utafutaji
                  </button>
                </div>
              )
            ) : (
              <div className="staff-grid">
                {visible.map((p) => (
                  <article key={p.id} className="staff-card-admin">
                    <div className="staff-card-top">
                      <div className="staff-photo-frame">
                        {p.photo_path ? (
                          <img
                            src={toImageUrl(p.photo_path)}
                            alt={p.full_name}
                            className="staff-photo-inner"
                          />
                        ) : (
                          <div className="staff-photo-inner staff-photo-placeholder">
                            <i className="fas fa-user" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3>{p.full_name}</h3>
                        <p>{p.role_title}</p>
                        <div className="chip-row">
                          <span className={`chip ${p.is_teaching ? 'teacher' : 'non-teacher'}`}>
                            {p.is_teaching ? 'Mwalimu' : 'Sio Mwalimu'}
                          </span>
                          <span className={`chip ${p.active ? 'active' : 'inactive'}`}>
                            {p.active ? 'Hai' : 'Imezimwa'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="staff-meta">
                      <div><strong>Duty/Kazi:</strong> {p.role_title}</div>
                      {p.contact_phone ? <div><strong>Simu:</strong> {p.contact_phone}</div> : null}
                      {p.contact_email ? <div><strong>Barua pepe:</strong> {p.contact_email}</div> : null}
                    </div>
                    <div className="staff-actions">
                      <button type="button" className="excel-btn secondary small" onClick={() => openEdit(p)}>
                        <i className="fas fa-edit" aria-hidden="true" /> Hariri
                      </button>
                      <button type="button" className="excel-btn danger small" onClick={() => confirmDeleteProfile(p)}>
                        <i className="fas fa-trash-alt" aria-hidden="true" /> Futa
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        {open ? (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editing ? 'Hariri Wasifu wa Mtumishi' : 'Ongeza Wasifu wa Mtumishi'}</h3>
                <button type="button" className="modal-close" onClick={closeModal} aria-label="Funga dirisha">
                  <i className="fas fa-times" aria-hidden="true" />
                </button>
              </div>
              <form onSubmit={submit} className="admin-form staff-form">
                <div className="form-section-title">Taarifa za Msingi</div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Jina kamili *</label>
                    <input className="excel-input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Duty/Kazi ya mtumishi *</label>
                    <input className="excel-input" value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Aina ya Mtumishi</label>
                    <select className="excel-input" value={form.is_teaching ? 'teacher' : 'non'} onChange={(e) => setForm({ ...form, is_teaching: e.target.value === 'teacher' })}>
                      <option value="teacher">Mwalimu</option>
                      <option value="non">Sio Mwalimu</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Mpangilio (order)</label>
                    <input type="number" className="excel-input" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value, 10) || 0 })} />
                  </div>
                </div>

                <div className="form-section-title">Mawasiliano</div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Simu</label>
                    <input className="excel-input" inputMode="tel" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Barua pepe</label>
                    <input type="email" className="excel-input" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                  </div>
                </div>
                <div className="form-group checkbox-line">
                  <label><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Hai (ionekane public)</label>
                </div>

                <div className="form-group">
                  <label>Picha ya mtumishi</label>
                  <div className="upload-area" onClick={() => fileRef.current?.click()}>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onPhoto(e.target.files?.[0])} />
                    {photoPreview ? (
                      <img src={photoPreview} alt="preview" className="photo-preview" />
                    ) : (
                      <button
                        type="button"
                        className="excel-btn secondary staff-upload-trigger"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileRef.current?.click();
                        }}
                      >
                        Bofya kupakia picha
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="excel-btn secondary" onClick={closeModal}>
                    Ghairi
                  </button>
                  <button type="submit" className="excel-btn primary" disabled={saveMutation.isLoading}>
                    <i className="fas fa-save" aria-hidden="true" /> {saveMutation.isLoading ? 'Inahifadhi...' : 'Hifadhi Wasifu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}

