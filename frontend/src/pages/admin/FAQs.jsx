/**
 * FAQs Management Page
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import './PublicWebsite.css';

const FAQs = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'General',
    display_order: 0,
    active: true,
  });

  // Fetch FAQs
  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['admin-faqs'],
    queryFn: async () => {
      const res = await adminAPI.getFAQs();
      return res.data.faqs || [];
    },
  });

  // Save FAQ mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return adminAPI.saveFAQ(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-faqs']);
      toast.success(`FAQ ${editingFAQ ? 'updated' : 'created'} successfully!`);
      setShowModal(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save FAQ');
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }) => {
      return adminAPI.toggleFAQStatus(id, active);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-faqs']);
      toast.success('FAQ status updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return adminAPI.deleteFAQ(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-faqs']);
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
      display_order: faq.display_order || 0,
      active: faq.active !== false,
    });
    setShowModal(true);
  };

  const handleToggle = (faq) => {
    toggleMutation.mutate({ id: faq.id, active: !faq.active });
  };

  const handleDelete = (faq) => {
    if (window.confirm(`Are you sure you want to delete this FAQ?`)) {
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

  const categories = ['General', 'Admissions', 'Academics', 'Fees', 'Student Life', 'Parents', 'Alumni'];

  return (
    <AdminLayout>
      <div className="public-website-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-question-circle"></i>
            FAQs Management
            <div className="header-actions">
              <button onClick={handleAdd} className="excel-btn primary small">
                <i className="fas fa-plus"></i> Add FAQ
              </button>
            </div>
          </div>
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">Loading FAQs...</div>
            ) : (
              <>
                <div className="table-container">
                  <table className="excel-table">
                    <thead>
                      <tr>
                        <th>Display Order</th>
                        <th>Question</th>
                        <th>Answer</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faqs.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="empty-table-message">
                            No FAQs found. Add your first FAQ above.
                          </td>
                        </tr>
                      ) : (
                        faqs.map((faq) => (
                          <tr key={faq.id}>
                            <td>{faq.display_order}</td>
                            <td>{faq.question}</td>
                            <td className="answer-cell">
                              {faq.answer.length > 100 ? `${faq.answer.substring(0, 100)}...` : faq.answer}
                            </td>
                            <td>{faq.category}</td>
                            <td>
                              <span className={`status-badge ${faq.active ? 'badge-active' : 'badge-inactive'}`}>
                                {faq.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="actions-col">
                              <button onClick={() => handleEdit(faq)} className="action-btn edit-btn">
                                <i className="fas fa-edit"></i>
                              </button>
                              <button onClick={() => handleToggle(faq)} className="action-btn toggle-btn">
                                <i className={`fas fa-${faq.active ? 'eye-slash' : 'eye'}`}></i>
                              </button>
                              <button onClick={() => handleDelete(faq)} className="action-btn delete-btn">
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {showModal && (
                  <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                      <div className="modal-header">
                        <h3>{editingFAQ ? 'Edit FAQ' : 'Add New FAQ'}</h3>
                        <button className="modal-close" onClick={() => setShowModal(false)}>
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <form onSubmit={handleSubmit} className="faq-form">
                        <div className="form-group">
                          <label>Question *</label>
                          <textarea
                            value={formData.question}
                            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                            className="excel-input"
                            rows="3"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Answer *</label>
                          <textarea
                            value={formData.answer}
                            onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                            className="excel-input"
                            rows="5"
                            required
                          />
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Category</label>
                            <select
                              value={formData.category}
                              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                              className="excel-input"
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Display Order</label>
                            <input
                              type="number"
                              value={formData.display_order}
                              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                              className="excel-input"
                              min="0"
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>
                            <input
                              type="checkbox"
                              checked={formData.active}
                              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                            />
                            Active
                          </label>
                        </div>
                        <div className="form-actions">
                          <button type="submit" className="excel-btn primary" disabled={saveMutation.isLoading}>
                            <i className="fas fa-save"></i> {saveMutation.isLoading ? 'Saving...' : 'Save FAQ'}
                          </button>
                          <button type="button" onClick={() => setShowModal(false)} className="excel-btn secondary">
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
