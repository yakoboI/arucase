/**
 * Announcements Component - Full Functionality
 */
import { Link } from 'react-router-dom';
import './Announcements.css';

const Announcements = ({ announcements = [], limit = 5 }) => {
  const displayAnnouncements = announcements.slice(0, limit);

  if (displayAnnouncements.length === 0) {
    return null;
  }

  return (
    <section className="announcements-section">
      <div className="section-header">
        <h2>Announcements</h2>
        <Link to="/announcements" className="view-all-link">
          View All →
        </Link>
      </div>
      
      <div className="announcements-grid">
        {displayAnnouncements.map((announcement) => (
          <div key={announcement.id} className="announcement-card">
            <div className="announcement-header">
              <span className={`priority-badge priority-${announcement.priority}`}>
                {announcement.priority}
              </span>
              <span className="announcement-date">{announcement.date}</span>
            </div>
            <h3 className="announcement-title">{announcement.title}</h3>
            <p className="announcement-content">
              {(announcement.content || announcement.body || '').length > 150
                ? `${(announcement.content || announcement.body || '').substring(0, 150)}...`
                : (announcement.content || announcement.body || '')}
            </p>
            <Link to={`/announcements#${announcement.id}`} className="read-more">
              Read More
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Announcements;
