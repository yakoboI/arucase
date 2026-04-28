/**
 * Student Promotion Dashboard
 */
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import './Promotion.css';

const Promotion = () => {
  // Fetch promotion sessions
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['promotion-sessions'],
    queryFn: async () => {
      const res = await adminAPI.getPromotionDashboard();
      return res.data.sessions || [];
    },
  });

  // Memoize computed stats to prevent recalculation on every render
  const totalPromoted = useMemo(() => 
    sessions.reduce((sum, s) => sum + (s.promoted_count || 0), 0),
    [sessions]
  );

  return (
    <AdminLayout>
      <div className="promotion-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-graduation-cap"></i>
            Student Promotion Dashboard
            <div className="header-actions">
              <Link to="/admin/promotion/select-class" className="excel-btn primary small">
                <i className="fas fa-user-graduate"></i> Promote Students
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">Loading promotion history...</div>
            ) : (
              <>
                <div className="promotion-stats">
                  <div className="stat-card">
                    <i className="fas fa-history stat-icon"></i>
                    <div className="stat-content">
                      <h3>{sessions.length}</h3>
                      <p>Total Sessions</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <i className="fas fa-users stat-icon"></i>
                    <div className="stat-content">
                      <h3>{totalPromoted}</h3>
                      <p>Students Promoted</p>
                    </div>
                  </div>
                </div>

                <div className="sessions-table-container">
                  <h3>Recent Promotion Sessions</h3>
                  {sessions.length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-graduation-cap empty-icon"></i>
                      <p>No promotion sessions yet</p>
                      <Link to="/admin/promotion/select-class" className="excel-btn primary">
                        <i className="fas fa-user-graduate"></i> Start First Promotion
                      </Link>
                    </div>
                  ) : (
                    <table className="excel-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>From</th>
                          <th>To</th>
                          <th>Total Students</th>
                          <th>Promoted</th>
                          <th>Excluded</th>
                          <th>Created By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map((session) => (
                          <tr key={session.id}>
                            <td>{new Date(session.created_at).toLocaleDateString()}</td>
                            <td>{session.from_level} {session.from_stream} {session.from_year}</td>
                            <td>{session.to_level} {session.to_stream} {session.to_year}</td>
                            <td>{session.total_students}</td>
                            <td className="success-text">{session.promoted_count}</td>
                            <td className="warning-text">{session.excluded_count}</td>
                            <td>{session.created_by}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Promotion;

