/**
 * Pass ID Management - Generate and Manage Student Pass IDs
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import DataTable from '../../components/common/DataTable';
import './PassIdManagement.css';

const PassIdManagement = () => {
  const navigate = useNavigate();
  const { form: formParam } = useParams();
  const queryClient = useQueryClient();
  const [selectedForm, setSelectedForm] = useState(formParam || 'FORM I');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const forms = ['FORM I', 'FORM II', 'FORM III', 'FORM IV', 'FORM V', 'FORM VI'];
  const months = ['Jrb1', 'Robo', 'Jrb2', 'Nusu', 'Muh', 'February', 'March', 'April', 'May', 'August', 'September', 'October', 'November'];

  // Update selectedForm when URL param changes
  useEffect(() => {
    if (formParam) {
      setSelectedForm(decodeURIComponent(formParam));
    }
  }, [formParam]);

  const handleFormClick = (formName) => {
    navigate(`/admin/pass-ids/${encodeURIComponent(formName)}`);
  };

  // Fetch Pass IDs for selected form
  const { data: passIdsData, isLoading } = useQuery({
    queryKey: ['pass-ids', selectedForm, selectedMonth, selectedYear],
    queryFn: async () => {
      const params = {};
      if (selectedMonth) params.month = selectedMonth;
      if (selectedYear) params.year = selectedYear;
      const res = await adminAPI.getPassIds(selectedForm, params);
      return res.data.passIds || [];
    },
    enabled: !!selectedForm,
  });

  const passIds = passIdsData || [];

  // Generate Pass IDs mutation
  const generateMutation = useMutation({
    mutationFn: async (data) => {
      return adminAPI.generatePassIds(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['pass-ids']);
      toast.success(data.data.message || 'Pass IDs generated successfully!');
      setShowGenerateModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to generate Pass IDs');
    },
  });

  // Regenerate Pass ID mutation
  const regenerateMutation = useMutation({
    mutationFn: async (data) => {
      return adminAPI.regeneratePassId(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pass-ids']);
      toast.success('Pass ID regenerated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to regenerate Pass ID');
    },
  });

  const handleGenerate = () => {
    if (!selectedMonth) {
      toast.error('Please select a month');
      return;
    }
    generateMutation.mutate({
      form: selectedForm,
      month: selectedMonth,
      year: selectedYear
    });
  };

  const handleRegenerate = (admNo) => {
    if (!selectedMonth) {
      toast.error('Please select a month');
      return;
    }
    if (window.confirm(`Regenerate Pass ID for ${admNo}?`)) {
      regenerateMutation.mutate({
        adm_no: admNo,
        form: selectedForm,
        month: selectedMonth,
        year: selectedYear
      });
    }
  };

  const columns = [
    { key: 'adm_no', label: 'Admission No' },
    { 
      key: 'name', 
      label: 'Name',
      render: (value, row) => {
        const name = row.first_name && row.surname 
          ? `${row.first_name} ${row.middle_name || ''} ${row.surname}`.trim()
          : 'N/A';
        return name;
      }
    },
    { key: 'year', label: 'Year' },
    { 
      key: 'pass_id', 
      label: 'Pass ID',
      render: (value) => (
        <span className="pass-id-display">{value}</span>
      )
    },
    { key: 'month', label: 'Month' },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, row) => (
        <button
          onClick={() => handleRegenerate(row.adm_no)}
          className="regenerate-btn"
          disabled={regenerateMutation.isLoading}
        >
          <i className="fas fa-sync-alt"></i> Regenerate
        </button>
      )
    }
  ];

  return (
    <AdminLayout>
      <div className="pass-id-management-page">
        <div className="excel-card pass-id-root-card">
          <div className="excel-card-header">
            <i className="fas fa-key"></i>
            Pass ID Management
            <div className="header-actions">
              <button 
                onClick={() => setShowGenerateModal(true)} 
                className="excel-btn secondary small"
                disabled={!selectedMonth}
              >
                <i className="fas fa-plus-circle"></i> Generate Pass IDs
              </button>
            </div>
          </div>
          <div className="excel-card-body">
            {/* Show form cards if no form selected, otherwise show form detail */}
            {!formParam ? (
              /* Form Cards - Clickable to navigate */
              <div className="forms-grid">
                {forms.map(formName => (
                  <div 
                    key={formName}
                    className="form-card clickable"
                    onClick={() => handleFormClick(formName)}
                  >
                    <div className="form-card-header">
                      <i className="fas fa-graduation-cap"></i>
                      <h3>{formName}</h3>
                    </div>
                    <div className="form-card-body">
                      <div className="form-card-placeholder">
                        <i className="fas fa-arrow-right"></i>
                        <p>Click to view Pass IDs</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Form Detail View */
              <>
                {/* Filters */}
                <div className="filter-section">
                  <div className="filter-group">
                    <label>Form:</label>
                    <select
                      value={selectedForm}
                      onChange={(e) => {
                        const newForm = e.target.value;
                        setSelectedForm(newForm);
                        navigate(`/admin/pass-ids/${encodeURIComponent(newForm)}`);
                      }}
                      className="filter-select"
                    >
                      {forms.map(form => (
                        <option key={form} value={form}>{form}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Month:</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="filter-select"
                    >
                      <option value="">All Months</option>
                      {months.map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Year:</label>
                    <input
                      type="number"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="filter-input"
                      min="2020"
                      max="2030"
                    />
                  </div>
                </div>

                <div className="form-detail-view">
                  <div className="form-detail-header">
                    <button 
                      onClick={() => navigate('/admin/pass-ids')}
                      className="back-to-list-btn"
                    >
                      <i className="fas fa-arrow-left"></i> Back to Forms
                    </button>
                    <h2>{selectedForm} - Pass IDs</h2>
                  </div>
                  
                  {isLoading ? (
                    <div className="loading-state">
                      <i className="fas fa-spinner fa-spin"></i> Loading...
                    </div>
                  ) : passIds.length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-key"></i>
                      <p>No Pass IDs found for {selectedForm}</p>
                      <small>Generate Pass IDs for this form using the button above</small>
                    </div>
                  ) : (
                    <div className="pass-ids-table-container">
                      <DataTable
                        className="pass-ids-datatable"
                        data={passIds}
                        columns={columns}
                        showActions={false}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Generate Modal */}
        {showGenerateModal && (
          <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Generate Pass IDs</h3>
                <button onClick={() => setShowGenerateModal(false)} className="modal-close">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Form: <span className="pass-id-modal-value">{selectedForm}</span></label>
                </div>
                <div className="form-group">
                  <label>Month: <span className="pass-id-modal-value">{selectedMonth}</span></label>
                </div>
                <div className="form-group">
                  <label>Year: <span className="pass-id-modal-value">{selectedYear}</span></label>
                </div>
                <p className="modal-warning">
                  <i className="fas fa-exclamation-triangle"></i> This will generate Pass IDs for all students in {selectedForm} for {selectedMonth} {selectedYear}. 
                  Existing Pass IDs will be regenerated.
                </p>
                <div className="modal-actions">
                  <button 
                    onClick={() => setShowGenerateModal(false)} 
                    className="excel-btn secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleGenerate}
                    className="excel-btn primary"
                    disabled={generateMutation.isLoading}
                  >
                    {generateMutation.isLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Generating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-key"></i> Generate Pass IDs
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PassIdManagement;

