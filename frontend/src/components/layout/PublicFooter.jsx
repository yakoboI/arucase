import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { publicAPI } from '../../services/public';
import { settingValue } from '../../utils/publicPageContent';
import { FOOTER_COPYRIGHT_NAME, resolveFooterCopyrightName } from '../../utils/footerCopyright';
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
  const contactEmail = settingValue(settings, 'contact_email');
  const contactWhatsapp = settingValue(settings, 'contact_whatsapp');
  const socialLocation = settingValue(settings, 'social_location');
  const socialYoutube = settingValue(settings, 'social_youtube');
  const socialFacebook = settingValue(settings, 'social_facebook');
  const socialInstagram = settingValue(settings, 'social_instagram');
  const socialTwitter = settingValue(settings, 'social_twitter');
  const footerSocialLabel = settingValue(settings, 'footer_social_label');
  const footerCopyright = resolveFooterCopyrightName(settingValue(settings, 'footer_copyright'));
  const schoolName = resolveFooterCopyrightName(settingValue(settings, 'school_name'));

  const whatsappNumber = contactWhatsapp.replace(/[+\s]/g, '');
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '';

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
          {footerSocialLabel || socialYoutube || contactEmail || whatsappUrl || socialLocation ? (
            <span className="social-label">{footerSocialLabel || 'Ungana Nasi'}</span>
          ) : null}
          <div className="social-icons">
            {socialYoutube ? (
              <a
                href={socialYoutube}
                target="_blank"
                rel="noopener noreferrer"
                className="youtube"
                title="YouTube"
              >
                <i className="fab fa-youtube" />
              </a>
            ) : null}
            {contactEmail ? (
              <a href={`mailto:${contactEmail}`} className="email" title="Email">
                <i className="fas fa-envelope" />
              </a>
            ) : null}
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp"
                title="WhatsApp"
              >
                <i className="fab fa-whatsapp" />
              </a>
            ) : null}
            {socialLocation ? (
              <a
                href={socialLocation}
                target="_blank"
                rel="noopener noreferrer"
                className="location"
                title="Our Location"
              >
                <i className="fas fa-map-marker-alt" />
              </a>
            ) : null}
            {socialFacebook ? (
              <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="facebook" title="Facebook">
                <i className="fab fa-facebook" />
              </a>
            ) : null}
            {socialInstagram ? (
              <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="instagram" title="Instagram">
                <i className="fab fa-instagram" />
              </a>
            ) : null}
            {socialTwitter ? (
              <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="twitter" title="X">
                <i className="fab fa-x-twitter" />
              </a>
            ) : null}
          </div>
        </div>
      </footer>

      {/* Copyright Footer */}
      <footer className="copyright-footer">
        <div className="copyright-footer-container">
          <p className="copyright-text">
            {footerCopyright ? (
              <>
                &copy; <span id="current-year">{new Date().getFullYear()}</span> {footerCopyright}
              </>
            ) : (
              <>
                &copy; <span id="current-year">{new Date().getFullYear()}</span>{' '}
                {schoolName || FOOTER_COPYRIGHT_NAME}. Haki zote zimehifadhiwa.
              </>
            )}
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
