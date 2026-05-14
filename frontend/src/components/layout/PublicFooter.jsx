import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { publicAPI } from '../../services/public';
import { DEFAULT_GOOGLE_MAPS_LOCATION } from '../../constants/defaultGoogleMapsLocation';
import './PublicFooter.css';

const PublicFooter = () => {
  const { data: homepageData } = useQuery({
    queryKey: ['homepage'],
    queryFn: async () => {
      try {
        const res = await publicAPI.getHomepage();
        return res.data;
      } catch (err) {
        console.error('Error fetching homepage data in footer:', err);
        return { settings: {} };
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: visitorStats, refetch: refetchVisitorStats } = useQuery({
    queryKey: ['visitor-stats'],
    queryFn: async () => {
      try {
        const res = await publicAPI.getVisitorStats();
        return res.data;
      } catch (err) {
        console.error('Error fetching visitor stats:', err);
        return { stats: { daily: 0, weekly: 0, total: 0 } };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    const onTracked = () => {
      refetchVisitorStats();
    };
    window.addEventListener('visitor:tracked', onTracked);
    return () => window.removeEventListener('visitor:tracked', onTracked);
  }, [refetchVisitorStats]);

  const settings = homepageData?.settings || {};
  const contactEmail = settings?.contact_email || 'info@arushacatholicseminary.co.tz';
  const contactWhatsapp = settings?.contact_whatsapp || '255123456789';
  const socialLocation = settings?.social_location || DEFAULT_GOOGLE_MAPS_LOCATION;
  
  const socialYoutube = settings?.social_youtube || 'https://youtube.com/@arushacatholicseminary';

  // Format WhatsApp number (remove + and spaces)
  const whatsappNumber = contactWhatsapp.replace(/[+\s]/g, '');
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;

  const stats = visitorStats?.stats || {
    daily: 0,
    weekly: 0,
    total: 0
  };

  // Map backend stats to frontend format
  const displayStats = {
    daily: stats.today || 0,
    weekly: stats.week || 0,
    total: stats.total || 0
  };

  return (
    <>
      {/* Social Media Footer */}
      <footer className="social-footer">
        <div className="social-footer-content">
          <span className="social-label">Ungana Nasi</span>
          <div className="social-icons">
            <a 
              href={socialYoutube} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="youtube" 
              title="YouTube"
            >
              <i className="fab fa-youtube"></i>
            </a>
            <a 
              href={`mailto:${contactEmail}`} 
              className="email" 
              title="Email"
            >
              <i className="fas fa-envelope"></i>
            </a>
            <a 
              href={whatsappUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="whatsapp" 
              title="WhatsApp"
            >
              <i className="fab fa-whatsapp"></i>
            </a>
            <a 
              href={socialLocation} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="location" 
              title="Our Location"
            >
              <i className="fas fa-map-marker-alt"></i>
            </a>
          </div>
        </div>
      </footer>

      {/* Copyright Footer */}
      <footer className="copyright-footer">
        <div className="copyright-footer-container">
          <p className="copyright-text">
            &copy; <span id="current-year">2026</span> Seminari ya Kikatoliki Arusha. Haki zote zimehifadhiwa.
            {' '}
            <Link to="/privacy-policy" className="privacy-link">
              Sera ya Faragha
            </Link>
            {' | '}
            <Link to="/privacy-policy#haki-zako" className="privacy-link">
              Haki Zako
            </Link>
            {' | '}
            <Link to="/privacy-policy#mawasiliano" className="privacy-link">
              Mawasiliano
            </Link>
          </p>
          <p className="visitor-stats">
            <span className="visitor-label">Wageni:</span>
            <span className="visitor-value">Leo: {displayStats.daily}</span>
            <span className="footer-separator">|</span>
            <span className="visitor-value">Wiki Hii: {displayStats.weekly}</span>
            <span className="footer-separator">|</span>
            <span className="visitor-total">Jumla: {displayStats.total}</span>
          </p>
        </div>
      </footer>
    </>
  );
};

export default PublicFooter;
