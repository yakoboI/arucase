/**
 * Admin Announcements CRUD page
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import './News.css';

const DEFAULT_FORM = {
  title: '',
  content: '',
  date: new Date().toISOString().split('T')[0],
  priority: 'normal',
  type: 'General Announcement',
  active: true,
};

const Announcements = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState('add'); // 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [generatedId, setGeneratedId] = useState(null);

  const [formData, setFormData] = useState(DEFAULT_FORM);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await adminAPI.getAnnouncements();
      return res.data.announcements || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const availablePriorityOptions = useMemo(() => ['High', 'normal', 'Low'], []);

  // Generate announcement ID when opening ADD form
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!showForm || mode !== 'add') return;

      try {
        const res = await adminAPI.generateAnnouncementId();
        if (!cancelled) setGeneratedId(res.data?.id || null);
      } catch (e) {
        if (!cancelled) setGeneratedId(null);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [showForm, mode]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const id =
        mode === 'add'
          ? generatedId || `ann_${Date.now()}`
          : editingId;

      if (!id) {
        throw new Error('Missing announcement id');
      }

      return adminAPI.saveAnnouncement({
        ...formData,
        id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['announcements']);
      toast.success(mode === 'add' ? 'Announcement published successfully!' : 'Announcement updated successfully!');

      setShowForm(false);
      setMode('add');
      setEditingId(null);
      setGeneratedId(null);
      setFormData(DEFAULT_FORM);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save announcement');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => adminAPI.deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['announcements']);
      toast.success('Announcement deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete announcement');
    },
  });

  const openAdd = () => {
    setMode('add');
    setEditingId(null);
    setGeneratedId(null);
    setFormData(DEFAULT_FORM);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setMode('edit');
    setEditingId(item.id);
    setGeneratedId(null);
    setFormData({
      title: item.title || '',
      content: item.content || '',
      date: item.date ? String(item.date).slice(0, 10) : new Date().toISOString().split('T')[0],
      priority: item.priority || 'normal',
      type: item.type || 'General Announcement',
      active: Boolean(item.active),
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim() || !formData.date) {
      toast.error('Title, content, and date are required');
      return;
    }
    saveMutation.mutate();
  };

  const getPriorityClass = (priority) => {
    const p = (priority || '').toString().toLowerCase();
    if (p === 'high') return 'priority-high';
    if (p === 'low') return 'priority-low';
    return 'priority-normal';
  };

  return (
    <AdminLayout>
      <div className="news-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-bullhorn" />
            Announcements Management
            <div className="header-actions">
              <button
                onClick={() => (showForm ? setShowForm(false) : openAdd())}
                className="excel-btn primary small"
              >
                <i className="fas fa-plus" /> {showForm ? 'Close' : 'Add New'}
              </button>
            </div>
          </div>

          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : (
              <>
                {showForm && (
                  <div className="add-announcement-form">
                    <h3>{mode === 'add' ? 'Add New Announcement' : 'Edit Announcement'}</h3>
                    <form onSubmit={handleSubmit}>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Title *</label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="excel-input"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>Priority *</label>
                          <select
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            className="excel-input"
                            required
                          >
                            {availablePriorityOptions.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Date *</label>
                          <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="excel-input"
                            required
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Type</label>
                          <input
                            type="text"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="excel-input"
                          />
                        </div>

                        <div className="form-group">
                          <label>Active</label>
                          <select
                            value={formData.active ? 'true' : 'false'}
                            onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
                            className="excel-input"
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Content *</label>
                        <textarea
                          value={formData.content}
                          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                          className="excel-input"
                          rows="6"
                          required
                        />
                      </div>

                      <div className="form-actions">
                        <button type="submit" className="excel-btn primary" disabled={saveMutation.isPending}>
                          <i className="fas fa-save" />{' '}
                          {saveMutation.isPending
                            ? 'Saving...'
                            : mode === 'add'
                              ? 'Publish Announcement'
                              : 'Update Announcement'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowForm(false);
                            setMode('add');
                            setEditingId(null);
                            setGeneratedId(null);
                            setFormData(DEFAULT_FORM);
                          }}
                          className="excel-btn secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="announcements-table-container">
                  <table className="excel-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Content</th>
                        <th>Date</th>
                        <th>Priority</th>
                        <th>Active</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {announcements.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="empty-table-message">
                            No announcements yet. Add your first announcement above.
                          </td>
                        </tr>
                      ) : (
                        announcements.map((item) => (
                          <tr key={item.id}>
                            <td>{item.id}</td>
                            <td>
                              <strong>{item.title}</strong>
                            </td>
                            <td className="news-content">{item.content}</td>
                            <td>{item.date}</td>
                            <td>
                              <span className={`priority-badge ${getPriorityClass(item.priority)}`}>
                                {item.priority || 'normal'}
                              </span>
                            </td>
                            <td>{item.active ? 'Yes' : 'No'}</td>
                            <td>
                              <div className="public-page-card-actions">
                                <button
                                  onClick={() => openEdit(item)}
                                  className="excel-btn secondary small"
                                >
                                  <i className="fas fa-edit" /> Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm('Are you sure you want to delete this announcement?')) {
                                      deleteMutation.mutate(item.id);
                                    }
                                  }}
                                  className="excel-btn danger small"
                                >
                                  <i className="fas fa-trash" /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Announcements;

