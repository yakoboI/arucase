import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const hasToken = false; // Remove token requirement - let enhanced auth handle it

  const { data: profiles = [], isLoading, isError, error } = useQuery({
    queryKey: ['staff-profiles-admin'],
    queryFn: async () => {
      const res = await adminAPI.getStaffProfiles();
      return res.data?.staff_profiles || [];
    },
    enabled: hasToken,
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

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
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
    if (!hasToken) {
      toast.error('Kikao kimeisha. Tafadhali ingia tena.');
      navigate('/login', { replace: true });
      return;
    }
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

  return (
    <AdminLayout>
      <div className="staff-profiles-page">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-id-badge" />
            <span className="staff-page-title">Wasifu wa Watumishi (Walimu na Wasio Walimu)</span>
            <div className="header-actions">
              <button className="excel-btn secondary small" onClick={openCreate}>
                <i className="fas fa-plus-circle" /> Ongeza Wasifu
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
                  className={`type-filter-btn ${typeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTypeFilter('all')}
                >
                  Wote
                </button>
                <button
                  type="button"
                  className={`type-filter-btn ${typeFilter === 'teachers' ? 'active' : ''}`}
                  onClick={() => setTypeFilter('teachers')}
                >
                  Walimu
                </button>
                <button
                  type="button"
                  className={`type-filter-btn ${typeFilter === 'non-teaching' ? 'active' : ''}`}
                  onClick={() => setTypeFilter('non-teaching')}
                >
                  Wasio Walimu
                </button>
              </div>
            </div>

            {!hasToken ? (
              <div className="admin-empty-state">
                <i className="fas fa-user-lock" />
                <h3>Kikao kimeisha</h3>
                <p>Tafadhali ingia tena ili kuona na kusimamia wasifu wa watumishi.</p>
                <button
                  type="button"
                  className="excel-btn secondary"
                  onClick={() => navigate('/login', { replace: true })}
                >
                  <i className="fas fa-right-to-bracket" /> Ingia Tena
                </button>
              </div>
            ) : isLoading ? (
              <div className="loading-state"><i className="fas fa-spinner fa-spin" /> Inapakia wasifu...</div>
            ) : isError ? (
              <div className="admin-empty-state">
                <i className="fas fa-plug-circle-xmark" />
                <h3>Imeshindikana kufikia seva</h3>
                <p>
                  Hatujaweza kupata data ya staff profiles kwa sasa.
                  {error?.message ? ` (${error.message})` : ''}
                </p>
                <button
                  type="button"
                  className="excel-btn secondary"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['staff-profiles-admin'] })}
                >
                  <i className="fas fa-rotate-right" /> Jaribu Tena
                </button>
              </div>
            ) : visible.length === 0 ? (
              <div className="admin-empty-state">
                <i className="fas fa-id-badge" />
                <h3>Hakuna wasifu</h3>
                <p>Ongeza wasifu wa walimu na watumishi wasio walimu ili waonekane kwenye ukurasa wa umma.</p>
                <button className="excel-btn secondary" onClick={openCreate}>
                  <i className="fas fa-plus-circle" /> Ongeza Wasifu wa Kwanza
                </button>
              </div>
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
                      <button className="admin-action-btn edit" onClick={() => openEdit(p)}><i className="fas fa-edit" /> Hariri</button>
                      <button
                        className="admin-action-btn delete"
                        onClick={() => window.confirm(`Futa wasifu wa "${p.full_name}"?`) && deleteMutation.mutate(p.id)}
                      >
                        <i className="fas fa-trash-alt" /> Futa
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
                <button className="modal-close" onClick={closeModal}><i className="fas fa-times" /></button>
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
                        className="upload-cta-btn"
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
                  <button type="button" className="excel-btn secondary" onClick={closeModal}>Ghairi</button>
                  <button type="submit" className="excel-btn primary" disabled={saveMutation.isLoading}>
                    <i className="fas fa-save" /> {saveMutation.isLoading ? 'Inahifadhi...' : 'Hifadhi Wasifu'}
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

