/**
 * Contact Page - Full Content from Python Template
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import { createT, getPreferredLanguage } from '../../utils/i18n';
import './Contact.css';

const Contact = () => {
  const lang = getPreferredLanguage();
  const tt = createT(lang);
  const { data: settings, isLoading } = useQuery({
    queryKey: ['homepage'],
    queryFn: async () => {
      try {
        const res = await publicAPI.getHomepage();
        return res.data?.settings;
      } catch (err) {
        console.error('Error fetching contact settings:', err);
        return {};
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message={tt('contact.loadingPage')} />
      </PublicLayout>
    );
  }

  const contactAddress = settings?.contact_address || 'Arusha Catholic Seminary, P.O. Box 1234, Arusha, Tanzania';
  const contactPhone = settings?.contact_phone || '+255 123 456 789';
  const contactEmail = settings?.contact_email || 'info@arushacatholicseminary.co.tz';
  const contactWhatsapp = settings?.contact_whatsapp || '+255 123 456 789';
  const whatsappNumber = contactWhatsapp.replace(/[+\s]/g, '');
  const socialLocation = settings?.social_location || 'https://maps.google.com/?q=Arusha+Catholic+Seminary+Tanzania';
  const socialYoutube = settings?.social_youtube || 'https://youtube.com/@arushacatholicseminary';
  const admissionsEmail = settings?.admissions_email || 'admissions@arushacatholicseminary.co.tz';
  const academicsEmail = settings?.academics_email || 'academics@arushacatholicseminary.co.tz';
  const bursarEmail = settings?.bursar_email || 'bursar@arushacatholicseminary.co.tz';
  const alumniEmail = settings?.alumni_email || 'alumni@arushacatholicseminary.co.tz';
  const parentsEmail = settings?.parents_email || 'parents@arushacatholicseminary.co.tz';

  return (
    <PublicLayout>
      <div className="contact-page">
        <Link to="/" className="home-button">
          <i className="fas fa-home"></i> {tt('common.backToHome')}
        </Link>

        <div className="content-card">
          <h2>{tt('contact.pageTitle')}</h2>
          <p>{tt('contact.intro')}</p>

          <h3>{tt('contact.contactInformation')}</h3>
          <div className="contact-info-box">
            <p>
              <i className="fas fa-map-marker-alt"></i>
              <strong>{tt('contact.address')}:</strong><br />
              {contactAddress.split('\n').map((line, idx) => (
                <span key={idx}>{line}<br /></span>
              ))}
            </p>
            
            <p>
              <i className="fas fa-phone"></i>
              <strong>{tt('contact.phone')}:</strong>{' '}
              <a href={`tel:${contactPhone}`}>{contactPhone}</a>
            </p>
            
            <p>
              <i className="fas fa-envelope"></i>
              <strong>{tt('contact.email')}:</strong>{' '}
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </p>
            
            <p>
              <i className="fab fa-whatsapp contact-whatsapp-icon"></i>
              <strong>{tt('contact.whatsapp')}:</strong>{' '}
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                {contactWhatsapp}
              </a>
            </p>
          </div>

          <h3>{tt('contact.officeHours')}</h3>
          <ul>
            <li><strong>{tt('contact.officeHoursItems.monFri')}:</strong> {tt('contact.officeHoursItems.monFriTime')}</li>
            <li><strong>{tt('contact.officeHoursItems.saturday')}:</strong> {tt('contact.officeHoursItems.saturdayTime')}</li>
            <li><strong>{tt('contact.officeHoursItems.sunday')}:</strong> {tt('contact.officeHoursItems.sundayTime')}</li>
            <li><strong>{tt('contact.officeHoursItems.publicHolidays')}:</strong> {tt('contact.officeHoursItems.publicHolidaysTime')}</li>
          </ul>

          <h3>{tt('contact.departmentContacts')}</h3>
          <ul>
            <li><strong>{tt('contact.departments.admissions')}:</strong> <a href={`mailto:${admissionsEmail}`}>{admissionsEmail}</a></li>
            <li><strong>{tt('contact.departments.academics')}:</strong> <a href={`mailto:${academicsEmail}`}>{academicsEmail}</a></li>
            <li><strong>{tt('contact.departments.bursar')}:</strong> <a href={`mailto:${bursarEmail}`}>{bursarEmail}</a></li>
            <li><strong>{tt('contact.departments.alumni')}:</strong> <a href={`mailto:${alumniEmail}`}>{alumniEmail}</a></li>
            <li><strong>{tt('contact.departments.parentsOffice')}:</strong> <a href={`mailto:${parentsEmail}`}>{parentsEmail}</a></li>
          </ul>

          <h3>{tt('contact.visitUs')}</h3>
          <p>{tt('contact.visitUsBody')}</p>

          <h3>{tt('contact.directions')}</h3>
          <p>{tt('contact.directionsBody')}</p>

          <div className="map-button-container">
            <a href={socialLocation} target="_blank" rel="noopener noreferrer" className="map-button">
              <i className="fas fa-map-marked-alt"></i> {tt('contact.googleMapsCta')}
            </a>
          </div>

          <h3>{tt('contact.followUs')}</h3>
          <p>{tt('contact.followUsBody')}</p>
          <div className="social-links">
            <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="social-link-youtube">
              <i className="fab fa-youtube"></i> YouTube
            </a>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Contact;

