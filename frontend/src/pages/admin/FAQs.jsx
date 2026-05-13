/**
 * FAQs Management Page
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import './PublicWebsite.css';
import './FAQs.css';

const ALL_CATEGORIES = 'All';
const categories = ['General', 'Admissions', 'Academics', 'Fees', 'Student Life', 'Parents', 'Alumni'];

const truncatePreview = (text, max = 140) => {
  const s = (text ?? '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max).trim()}…`;
};

const FAQs = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'General',
    display_order: 0,
    active: true,
  });

  const { data: faqs = [], isPending } = useQuery({
    queryKey: ['admin-faqs'],
    queryFn: async () => {
      const res = await adminAPI.getFAQs();
      return res.data.faqs || [];
    },
  });

  const sortedFaqs = useMemo(() => {
    return [...faqs].sort((a, b) => {
      const oa = Number(a.display_order) || 0;
      const ob = Number(b.display_order) || 0;
      if (oa !== ob) return oa - ob;
      return (a.id ?? 0) - (b.id ?? 0);
    });
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedFaqs.filter((faq) => {
      if (categoryFilter !== ALL_CATEGORIES && (faq.category || 'General') !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      const question = (faq.question || '').toLowerCase();
      const answer = (faq.answer || '').toLowerCase();
      return question.includes(q) || answer.includes(q);
    });
  }, [sortedFaqs, search, categoryFilter]);

  const stats = useMemo(() => {
    const total = faqs.length;
    const active = faqs.filter((f) => f.active !== false).length;
    return { total, active };
  }, [faqs]);

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return adminAPI.saveFAQ(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
      toast.success(`FAQ ${editingFAQ ? 'updated' : 'created'} successfully!`);
      setShowModal(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save FAQ');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }) => {
      return adminAPI.toggleFAQStatus(id, active);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
      toast.success('FAQ status updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return adminAPI.deleteFAQ(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
      toast.success('FAQ deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete FAQ');
    },
  });

  const resetForm = () => {
    setFormData({
      question: '',
      answer: '',
      category: 'General',
      display_order: 0,
      active: true,
    });
    setEditingFAQ(null);
  };

  const handleAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (faq) => {
    setEditingFAQ(faq);
    setFormData({
      question: faq.question || '',
      answer: faq.answer || '',
      category: faq.category || 'General',
      display_order: faq.display_order ?? 0,
      active: faq.active !== false,
    });
    setShowModal(true);
  };

  const handleToggle = (faq) => {
    toggleMutation.mutate({ id: faq.id, active: !faq.active });
  };

  const handleDelete = (faq) => {
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      deleteMutation.mutate(faq.id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error('Question and answer are required');
      return;
    }

    saveMutation.mutate({
      id: editingFAQ?.id,
      ...formData,
    });
  };

  const closeModal = useCallback(() => {
    setShowModal(false);
    resetForm();
  }, []);

  const showFilteredEmpty = !isPending && faqs.length > 0 && filteredFaqs.length === 0;
  const showGlobalEmpty = !isPending && faqs.length === 0;

  return (
    <AdminLayout>
      <div className="faqs-admin-page public-website-page-container">
        <header className="faqs-intro admin-page-header">
          <h1>
            <i className="fas fa-question-circle" aria-hidden="true"></i>
            FAQs
          </h1>
          <p>
            Questions and answers shown on the public site. Lower display order appears first. Use search and
            filters to find entries quickly.
          </p>
        </header>

        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-list-check"></i>
            Manage entries
            <div className="header-actions">
              <button type="button" onClick={handleAdd} className="excel-btn primary small">
                <i className="fas fa-plus"></i> Add FAQ
              </button>
            </div>
          </div>
          <div className="excel-card-body">
            {isPending ? (
              <div className="faqs-loading-rows" aria-busy="true" aria-label="Loading FAQs">
                <div className="faqs-skeleton-row" />
                <div className="faqs-skeleton-row" />
                <div className="faqs-skeleton-row" />
                <div className="faqs-skeleton-row" />
              </div>
            ) : (
              <>
                <div className="faqs-toolbar">
                  <div className="faqs-toolbar-search">
                    <label htmlFor="faqs-search">Search</label>
                    <div className="faqs-search-wrap">
                      <i className="fas fa-magnifying-glass" aria-hidden="true"></i>
                      <input
                        id="faqs-search"
                        type="search"
                        className="faqs-search-input"
                        placeholder="Question or answer…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="faqs-toolbar-filters">
                    <div className="form-group">
                      <label htmlFor="faqs-category-filter">Category</label>
                      <select
                        id="faqs-category-filter"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="excel-input"
                      >
                        <option value={ALL_CATEGORIES}>All categories</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="faqs-stats" role="status">
                    <span className="faqs-stat">
                      <strong>{stats.total}</strong>
                      total
                    </span>
                    <span className="faqs-stat">
                      <strong>{stats.active}</strong>
                      active
                    </span>
                  </div>
                </div>

                {showFilteredEmpty && (
                  <p className="faqs-results-hint">
                    No FAQs match your filters.{' '}
                    <button type="button" className="excel-btn secondary small" onClick={() => { setSearch(''); setCategoryFilter(ALL_CATEGORIES); }}>
                      Clear filters
                    </button>
                  </p>
                )}

                {showGlobalEmpty ? (
                  <div className="faqs-empty-block">
                    <i className="fas fa-question-circle faqs-empty-icon" aria-hidden="true"></i>
                    <h2>No FAQs yet</h2>
                    <p>Add the first question and answer visitors will see on your site.</p>
                    <button type="button" onClick={handleAdd} className="excel-btn primary">
                      <i className="fas fa-plus"></i> Add FAQ
                    </button>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="excel-table">
                      <thead>
                        <tr>
                          <th scope="col">Order</th>
                          <th scope="col">Question</th>
                          <th scope="col">Answer</th>
                          <th scope="col">Category</th>
                          <th scope="col">Status</th>
                          <th scope="col">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFaqs.map((faq) => {
                          const answerText = faq.answer || '';
                          const preview = truncatePreview(answerText);
                          return (
                            <tr key={faq.id}>
                              <td className="faqs-order-cell">{faq.display_order ?? 0}</td>
                              <td className="faqs-question-cell">
                                <div className="faqs-question-preview" title={faq.question || ''}>
                                  {faq.question || '—'}
                                </div>
                              </td>
                              <td className="faqs-answer-cell answer-cell">
                                <div className="faqs-answer-preview" title={answerText || undefined}>
                                  {preview || '—'}
                                </div>
                              </td>
                              <td>
                                <span className="faqs-category-pill">{faq.category || 'General'}</span>
                              </td>
                              <td>
                                <span className={`status-badge ${faq.active !== false ? 'badge-active' : 'badge-inactive'}`}>
                                  {faq.active !== false ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="actions-col">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(faq)}
                                  className="action-btn edit-btn"
                                  title="Edit"
                                  aria-label={`Edit FAQ: ${faq.question || faq.id}`}
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggle(faq)}
                                  className="action-btn toggle-btn"
                                  title={faq.active !== false ? 'Deactivate' : 'Activate'}
                                  aria-label={faq.active !== false ? 'Deactivate FAQ' : 'Activate FAQ'}
                                  disabled={toggleMutation.isPending}
                                >
                                  <i className={`fas fa-${faq.active !== false ? 'eye-slash' : 'eye'}`}></i>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(faq)}
                                  className="action-btn delete-btn"
                                  title="Delete"
                                  aria-label={`Delete FAQ: ${faq.question || faq.id}`}
                                  disabled={deleteMutation.isPending}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {showModal && (
                  <div
                    className="modal-overlay faqs-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="faqs-modal-title"
                    onClick={closeModal}
                  >
                    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                      <div className="modal-header">
                        <h3 id="faqs-modal-title">{editingFAQ ? 'Edit FAQ' : 'Add FAQ'}</h3>
                        <button type="button" className="modal-close" onClick={closeModal} aria-label="Close dialog">
                          <i className="fas fa-times" aria-hidden="true"></i>
                        </button>
                      </div>
                      <form onSubmit={handleSubmit} className="faq-form">
                        <div className="form-group">
                          <label htmlFor="faq-question">Question *</label>
                          <textarea
                            id="faq-question"
                            value={formData.question}
                            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                            className="excel-input"
                            rows={3}
                            required
                            placeholder="e.g. When does the school year begin?"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="faq-answer">Answer *</label>
                          <textarea
                            id="faq-answer"
                            value={formData.answer}
                            onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                            className="excel-input"
                            rows={6}
                            required
                            placeholder="Clear, concise answer for families and visitors."
                          />
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="faq-category">Category</label>
                            <select
                              id="faq-category"
                              value={formData.category}
                              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                              className="excel-input"
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label htmlFor="faq-order">Display order</label>
                            <input
                              id="faq-order"
                              type="number"
                              value={formData.display_order}
                              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 0 })}
                              className="excel-input"
                              min={0}
                            />
                          </div>
                        </div>
                        <label className="faqs-active-row">
                          <input
                            type="checkbox"
                            checked={formData.active}
                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                          />
                          <span>Show on public site (active)</span>
                        </label>
                        <div className="form-actions">
                          <button type="submit" className="excel-btn primary" disabled={saveMutation.isPending}>
                            <i className="fas fa-save"></i> {saveMutation.isPending ? 'Saving…' : 'Save FAQ'}
                          </button>
                          <button type="button" onClick={closeModal} className="excel-btn secondary">
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default FAQs;
