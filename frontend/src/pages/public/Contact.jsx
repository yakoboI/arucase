/**
 * Contact Page — multi-card layout, device-width inner shell
 */
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import { createT, getPreferredLanguage } from '../../utils/i18n';
import { getGoogleMapsEmbedSrc } from '../../utils/googleMapsEmbed';
import { PublicCmsHtml, usePublicPage } from '../../components/public/PublicCmsPage';
import { hasPublishedPage, settingValue } from '../../utils/publicPageContent';
import './Contact.css';

const Contact = () => {
  const { data: contactPageData } = usePublicPage('contact');
  const contactPage = contactPageData?.data?.page;
  const hasContactCms = hasPublishedPage(contactPage);

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

  const contactAddress = settingValue(settings, 'contact_address');
  const contactPhone = settingValue(settings, 'contact_phone');
  const contactEmail = settingValue(settings, 'contact_email');
  const contactWhatsapp = settingValue(settings, 'contact_whatsapp');
  const whatsappNumber = contactWhatsapp.replace(/[+\s]/g, '');
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '';
  const socialLocation = settingValue(settings, 'social_location');
  const mapEmbedSrc = getGoogleMapsEmbedSrc(socialLocation);
  const socialYoutube = settingValue(settings, 'social_youtube');
  const admissionsEmail = settingValue(settings, 'admissions_email');
  const academicsEmail = settingValue(settings, 'academics_email');
  const bursarEmail = settingValue(settings, 'bursar_email');
  const alumniEmail = settingValue(settings, 'alumni_email');
  const parentsEmail = settingValue(settings, 'parents_email');

  return (
    <PublicLayout>
      <div className="contact-page">
        <div className="contact-page-inner">
          {hasContactCms ? (
            <PublicCmsHtml page={contactPage} className="contact-card contact-card--cms" />
          ) : null}

          <header className="contact-card contact-card--intro">
            <h1 className="contact-page-title">{tt('contact.pageTitle')}</h1>
            {!hasContactCms ? <p className="contact-page-lead">{tt('contact.intro')}</p> : null}
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

              {contactPhone ? (
                <p>
                  <i className="fas fa-phone" />
                  <span className="contact-info-block">
                    <strong>{tt('contact.phone')}:</strong>{' '}
                    <a href={`tel:${contactPhone}`}>{contactPhone}</a>
                  </span>
                </p>
              ) : null}

              {contactEmail ? (
                <p>
                  <i className="fas fa-envelope" />
                  <span className="contact-info-block">
                    <strong>{tt('contact.email')}:</strong>{' '}
                    <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                  </span>
                </p>
              ) : null}

              {whatsappUrl ? (
                <p>
                  <i className="fab fa-whatsapp contact-whatsapp-icon" />
                  <span className="contact-info-block">
                    <strong>{tt('contact.whatsapp')}:</strong>{' '}
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      {contactWhatsapp}
                    </a>
                  </span>
                </p>
              ) : null}
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
                  <strong>{tt('contact.officeHoursItems.monFri')}:</strong>{' '}
                  {settingValue(settings, 'office_weekdays') || '—'}
                </li>
                <li>
                  <strong>{tt('contact.officeHoursItems.saturday')}:</strong>{' '}
                  {settingValue(settings, 'office_saturday') || '—'}
                </li>
                <li>
                  <strong>{tt('contact.officeHoursItems.sunday')}:</strong>{' '}
                  {settingValue(settings, 'office_sunday') || '—'}
                </li>
                <li>
                  <strong>{tt('contact.officeHoursItems.publicHolidays')}:</strong>{' '}
                  {settingValue(settings, 'office_holidays') || '—'}
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
                {admissionsEmail ? (
                  <li>
                    <strong>{tt('contact.departments.admissions')}:</strong>{' '}
                    <a href={`mailto:${admissionsEmail}`}>{admissionsEmail}</a>
                  </li>
                ) : null}
                {academicsEmail ? (
                  <li>
                    <strong>{tt('contact.departments.academics')}:</strong>{' '}
                    <a href={`mailto:${academicsEmail}`}>{academicsEmail}</a>
                  </li>
                ) : null}
                {bursarEmail ? (
                  <li>
                    <strong>{tt('contact.departments.bursar')}:</strong>{' '}
                    <a href={`mailto:${bursarEmail}`}>{bursarEmail}</a>
                  </li>
                ) : null}
                {alumniEmail ? (
                  <li>
                    <strong>{tt('contact.departments.alumni')}:</strong>{' '}
                    <a href={`mailto:${alumniEmail}`}>{alumniEmail}</a>
                  </li>
                ) : null}
                {parentsEmail ? (
                  <li>
                    <strong>{tt('contact.departments.parentsOffice')}:</strong>{' '}
                    <a href={`mailto:${parentsEmail}`}>{parentsEmail}</a>
                  </li>
                ) : null}
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
            {socialLocation ? (
              <div className="map-button-container">
                <a href={socialLocation} target="_blank" rel="noopener noreferrer" className="map-button">
                  <i className="fas fa-external-link-alt" /> {tt('contact.openFullMap')}
                </a>
              </div>
            ) : null}
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
            {socialYoutube ? (
              <div className="social-links">
                <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="social-link-youtube">
                  <i className="fab fa-youtube" /> YouTube
                </a>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Contact;
