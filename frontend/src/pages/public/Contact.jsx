/**
 * Contact Page — multi-card layout, device-width inner shell
 */
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import { DEFAULT_GOOGLE_MAPS_LOCATION } from '../../constants/defaultGoogleMapsLocation';
import { createT, getPreferredLanguage } from '../../utils/i18n';
import { getGoogleMapsEmbedSrc } from '../../utils/googleMapsEmbed';
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
  const socialLocation = settings?.social_location || DEFAULT_GOOGLE_MAPS_LOCATION;
  const mapEmbedSrc = getGoogleMapsEmbedSrc(socialLocation);
  const socialYoutube = settings?.social_youtube || 'https://youtube.com/@arushacatholicseminary';
  const admissionsEmail = settings?.admissions_email || 'admissions@arushacatholicseminary.co.tz';
  const academicsEmail = settings?.academics_email || 'academics@arushacatholicseminary.co.tz';
  const bursarEmail = settings?.bursar_email || 'bursar@arushacatholicseminary.co.tz';
  const alumniEmail = settings?.alumni_email || 'alumni@arushacatholicseminary.co.tz';
  const parentsEmail = settings?.parents_email || 'parents@arushacatholicseminary.co.tz';

  return (
    <PublicLayout>
      <div className="contact-page">
        <div className="contact-page-inner">
          <header className="contact-card contact-card--intro">
            <h1 className="contact-page-title">{tt('contact.pageTitle')}</h1>
            <p className="contact-page-lead">{tt('contact.intro')}</p>
          </header>

          <section className="contact-card" aria-labelledby="contact-info-heading">
            <div className="contact-card__head">
              <span className="contact-card__icon" aria-hidden>
                <i className="fas fa-address-card" />
              </span>
              <h2 id="contact-info-heading" className="contact-card__title">
                {tt('contact.contactInformation')}
              </h2>
            </div>
            <div className="contact-info-box">
              <p>
                <i className="fas fa-map-marker-alt" />
                <span className="contact-info-block">
                  <strong>{tt('contact.address')}:</strong>
                  <br />
                  {contactAddress.split('\n').map((line, idx) => (
                    <span key={idx}>
                      {line}
                      <br />
                    </span>
                  ))}
                </span>
              </p>

              <p>
                <i className="fas fa-phone" />
                <span className="contact-info-block">
                  <strong>{tt('contact.phone')}:</strong>{' '}
                  <a href={`tel:${contactPhone}`}>{contactPhone}</a>
                </span>
              </p>

              <p>
                <i className="fas fa-envelope" />
                <span className="contact-info-block">
                  <strong>{tt('contact.email')}:</strong>{' '}
                  <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                </span>
              </p>

              <p>
                <i className="fab fa-whatsapp contact-whatsapp-icon" />
                <span className="contact-info-block">
                  <strong>{tt('contact.whatsapp')}:</strong>{' '}
                  <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                    {contactWhatsapp}
                  </a>
                </span>
              </p>
            </div>
          </section>

          <div className="contact-page-grid">
            <section className="contact-card" aria-labelledby="office-hours-heading">
              <div className="contact-card__head">
                <span className="contact-card__icon" aria-hidden>
                  <i className="fas fa-clock" />
                </span>
                <h2 id="office-hours-heading" className="contact-card__title">
                  {tt('contact.officeHours')}
                </h2>
              </div>
              <ul className="contact-list">
                <li>
                  <strong>{tt('contact.officeHoursItems.monFri')}:</strong> {tt('contact.officeHoursItems.monFriTime')}
                </li>
                <li>
                  <strong>{tt('contact.officeHoursItems.saturday')}:</strong>{' '}
                  {tt('contact.officeHoursItems.saturdayTime')}
                </li>
                <li>
                  <strong>{tt('contact.officeHoursItems.sunday')}:</strong> {tt('contact.officeHoursItems.sundayTime')}
                </li>
                <li>
                  <strong>{tt('contact.officeHoursItems.publicHolidays')}:</strong>{' '}
                  {tt('contact.officeHoursItems.publicHolidaysTime')}
                </li>
              </ul>
            </section>

            <section className="contact-card" aria-labelledby="dept-heading">
              <div className="contact-card__head">
                <span className="contact-card__icon" aria-hidden>
                  <i className="fas fa-sitemap" />
                </span>
                <h2 id="dept-heading" className="contact-card__title">
                  {tt('contact.departmentContacts')}
                </h2>
              </div>
              <ul className="contact-list">
                <li>
                  <strong>{tt('contact.departments.admissions')}:</strong>{' '}
                  <a href={`mailto:${admissionsEmail}`}>{admissionsEmail}</a>
                </li>
                <li>
                  <strong>{tt('contact.departments.academics')}:</strong>{' '}
                  <a href={`mailto:${academicsEmail}`}>{academicsEmail}</a>
                </li>
                <li>
                  <strong>{tt('contact.departments.bursar')}:</strong>{' '}
                  <a href={`mailto:${bursarEmail}`}>{bursarEmail}</a>
                </li>
                <li>
                  <strong>{tt('contact.departments.alumni')}:</strong>{' '}
                  <a href={`mailto:${alumniEmail}`}>{alumniEmail}</a>
                </li>
                <li>
                  <strong>{tt('contact.departments.parentsOffice')}:</strong>{' '}
                  <a href={`mailto:${parentsEmail}`}>{parentsEmail}</a>
                </li>
              </ul>
            </section>
          </div>

          <div className="contact-page-grid">
            <section className="contact-card" aria-labelledby="visit-heading">
              <div className="contact-card__head">
                <span className="contact-card__icon" aria-hidden>
                  <i className="fas fa-building" />
                </span>
                <h2 id="visit-heading" className="contact-card__title">
                  {tt('contact.visitUs')}
                </h2>
              </div>
              <p className="contact-card__body">{tt('contact.visitUsBody')}</p>
            </section>

            <section className="contact-card" aria-labelledby="directions-heading">
              <div className="contact-card__head">
                <span className="contact-card__icon" aria-hidden>
                  <i className="fas fa-route" />
                </span>
                <h2 id="directions-heading" className="contact-card__title">
                  {tt('contact.directions')}
                </h2>
              </div>
              <p className="contact-card__body">{tt('contact.directionsBody')}</p>
            </section>
          </div>

          <section className="contact-card contact-card--map" aria-labelledby="map-heading">
            <div className="contact-card__head">
              <span className="contact-card__icon" aria-hidden>
                <i className="fas fa-map-marked-alt" />
              </span>
              <h2 id="map-heading" className="contact-card__title">
                {tt('contact.mapTitle')}
              </h2>
            </div>
            {mapEmbedSrc ? (
              <div className="contact-map-embed">
                <iframe
                  title={tt('contact.mapIframeTitle')}
                  src={mapEmbedSrc}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            ) : (
              <p className="contact-card__body contact-map-fallback" role="status">
                {tt('contact.mapUnavailable')}
              </p>
            )}
            <div className="map-button-container">
              <a href={socialLocation} target="_blank" rel="noopener noreferrer" className="map-button">
                <i className="fas fa-external-link-alt" /> {tt('contact.openFullMap')}
              </a>
            </div>
          </section>

          <section className="contact-card contact-card--follow" aria-labelledby="follow-heading">
            <div className="contact-card__head">
              <span className="contact-card__icon" aria-hidden>
                <i className="fas fa-share-alt" />
              </span>
              <h2 id="follow-heading" className="contact-card__title">
                {tt('contact.followUs')}
              </h2>
            </div>
            <p className="contact-card__body">{tt('contact.followUsBody')}</p>
            <div className="social-links">
              <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="social-link-youtube">
                <i className="fab fa-youtube" /> YouTube
              </a>
            </div>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Contact;
