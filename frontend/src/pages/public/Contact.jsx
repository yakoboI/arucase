/**
 * Contact — prose from Public Pages (contact slug); phones/emails/hours from Site & Contacts.
 */
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import { getGoogleMapsEmbedSrc } from '../../utils/googleMapsEmbed';
import { PublicCmsEmpty, PublicCmsPreparedBlock, usePublicPage } from '../../components/public/PublicCmsPage';
import PublicPageHero from '../../components/public/PublicPageHero';
import { hasPublishedPage, settingValue } from '../../utils/publicPageContent';
import './Contact.css';

const Contact = () => {
  const { data: contactPageData, isLoading: cmsLoading } = usePublicPage('contact');
  const contactPage = contactPageData?.data?.page;
  const hasContactCms = hasPublishedPage(contactPage);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['homepage'],
    queryFn: async () => {
      const res = await publicAPI.getHomepage();
      return res.data?.settings || {};
    },
    staleTime: 10 * 60 * 1000,
  });

  if (cmsLoading || settingsLoading) {
    return (
      <PublicLayout>
        <Loading message="Inapakia ukurasa wa mawasiliano..." />
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
  const socialFacebook = settingValue(settings, 'social_facebook');
  const socialInstagram = settingValue(settings, 'social_instagram');
  const socialTwitter = settingValue(settings, 'social_twitter');
  const admissionsEmail = settingValue(settings, 'admissions_email');
  const academicsEmail = settingValue(settings, 'academics_email');
  const bursarEmail = settingValue(settings, 'bursar_email');
  const alumniEmail = settingValue(settings, 'alumni_email');
  const parentsEmail = settingValue(settings, 'parents_email');

  const officeWeekdays = settingValue(settings, 'office_weekdays');
  const officeSaturday = settingValue(settings, 'office_saturday');
  const officeSunday = settingValue(settings, 'office_sunday');
  const officeHolidays = settingValue(settings, 'office_holidays');

  const hasContactInfo = contactAddress || contactPhone || contactEmail || whatsappUrl;
  const hasOfficeHours = officeWeekdays || officeSaturday || officeSunday || officeHolidays;
  const hasDeptEmails =
    admissionsEmail || academicsEmail || bursarEmail || alumniEmail || parentsEmail;
  const hasSocial = socialYoutube || socialFacebook || socialInstagram || socialTwitter;

  return (
    <PublicLayout>
      <div className="contact-page">
        <div className="contact-page-inner">
          <PublicPageHero
            page={contactPage}
            fallbackTitle="Mawasiliano"
            settings={settings}
            variant="contact"
          />

          {hasContactCms ? (
            <PublicCmsPreparedBlock
              page={contactPage}
              themeKey="contact"
              proseClassName="contact-card contact-card--cms"
            />
          ) : (
            <PublicCmsEmpty pageLabel="Mawasiliano" />
          )}

          {hasContactInfo ? (
            <section className="contact-card" aria-labelledby="contact-info-heading">
              <div className="contact-card__head">
                <span className="contact-card__icon" aria-hidden>
                  <i className="fas fa-address-card" />
                </span>
                <h2 id="contact-info-heading" className="contact-card__title">
                  {settingValue(settings, 'contact_info_heading') || 'Mawasiliano'}
                </h2>
              </div>
              <div className="contact-info-box">
                {contactAddress ? (
                  <p>
                    <i className="fas fa-map-marker-alt" />
                    <span className="contact-info-block">
                      <strong>Anwani:</strong>
                      <br />
                      {contactAddress.split('\n').map((line, idx) => (
                        <span key={idx}>
                          {line}
                          <br />
                        </span>
                      ))}
                    </span>
                  </p>
                ) : null}
                {contactPhone ? (
                  <p>
                    <i className="fas fa-phone" />
                    <span className="contact-info-block">
                      <strong>Simu:</strong>{' '}
                      <a href={`tel:${contactPhone}`}>{contactPhone}</a>
                    </span>
                  </p>
                ) : null}
                {contactEmail ? (
                  <p>
                    <i className="fas fa-envelope" />
                    <span className="contact-info-block">
                      <strong>Barua pepe:</strong>{' '}
                      <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                    </span>
                  </p>
                ) : null}
                {whatsappUrl ? (
                  <p>
                    <i className="fab fa-whatsapp contact-whatsapp-icon" />
                    <span className="contact-info-block">
                      <strong>WhatsApp:</strong>{' '}
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                        {contactWhatsapp}
                      </a>
                    </span>
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          {hasOfficeHours || hasDeptEmails ? (
            <div className="contact-page-grid">
              {hasOfficeHours ? (
                <section className="contact-card" aria-labelledby="office-hours-heading">
                  <div className="contact-card__head">
                    <span className="contact-card__icon" aria-hidden>
                      <i className="fas fa-clock" />
                    </span>
                    <h2 id="office-hours-heading" className="contact-card__title">
                      {settingValue(settings, 'office_hours_heading') || 'Saa za ofisi'}
                    </h2>
                  </div>
                  <ul className="contact-list">
                    {officeWeekdays ? (
                      <li>
                        <strong>Jumatatu–Ijumaa:</strong>{' '}
                        {officeWeekdays}
                      </li>
                    ) : null}
                    {officeSaturday ? (
                      <li>
                        <strong>Jumamosi:</strong>{' '}
                        {officeSaturday}
                      </li>
                    ) : null}
                    {officeSunday ? (
                      <li>
                        <strong>Jumapili:</strong>{' '}
                        {officeSunday}
                      </li>
                    ) : null}
                    {officeHolidays ? (
                      <li>
                        <strong>Sikukuu:</strong>{' '}
                        {officeHolidays}
                      </li>
                    ) : null}
                  </ul>
                </section>
              ) : null}

              {hasDeptEmails ? (
                <section className="contact-card" aria-labelledby="dept-heading">
                  <div className="contact-card__head">
                    <span className="contact-card__icon" aria-hidden>
                      <i className="fas fa-sitemap" />
                    </span>
                    <h2 id="dept-heading" className="contact-card__title">
                      {settingValue(settings, 'department_contacts_heading') || 'Mawasiliano ya idara'}
                    </h2>
                  </div>
                  <ul className="contact-list">
                    {admissionsEmail ? (
                      <li>
                        <strong>Udahili:</strong>{' '}
                        <a href={`mailto:${admissionsEmail}`}>{admissionsEmail}</a>
                      </li>
                    ) : null}
                    {academicsEmail ? (
                      <li>
                        <strong>Masomo:</strong>{' '}
                        <a href={`mailto:${academicsEmail}`}>{academicsEmail}</a>
                      </li>
                    ) : null}
                    {bursarEmail ? (
                      <li>
                        <strong>Fedha:</strong>{' '}
                        <a href={`mailto:${bursarEmail}`}>{bursarEmail}</a>
                      </li>
                    ) : null}
                    {alumniEmail ? (
                      <li>
                        <strong>Wahitimu:</strong>{' '}
                        <a href={`mailto:${alumniEmail}`}>{alumniEmail}</a>
                      </li>
                    ) : null}
                    {parentsEmail ? (
                      <li>
                        <strong>Wazazi:</strong>{' '}
                        <a href={`mailto:${parentsEmail}`}>{parentsEmail}</a>
                      </li>
                    ) : null}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : null}

          {mapEmbedSrc || socialLocation ? (
            <section className="contact-card contact-card--map" aria-labelledby="map-heading">
              <div className="contact-card__head">
                <span className="contact-card__icon" aria-hidden>
                  <i className="fas fa-map-marked-alt" />
                </span>
                <h2 id="map-heading" className="contact-card__title">
                  {settingValue(settings, 'map_heading') || 'Ramani'}
                </h2>
              </div>
              {mapEmbedSrc ? (
                <div className="contact-map-embed">
                  <iframe
                    title="Ramani ya seminari"
                    src={mapEmbedSrc}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              ) : null}
              {socialLocation ? (
                <div className="map-button-container">
                  <a href={socialLocation} target="_blank" rel="noopener noreferrer" className="map-button">
                    <i className="fas fa-external-link-alt" />{' '}
                    Fungua ramani kamili
                  </a>
                </div>
              ) : null}
            </section>
          ) : null}

          {hasSocial ? (
            <section className="contact-card contact-card--follow" aria-labelledby="follow-heading">
              <div className="contact-card__head">
                <span className="contact-card__icon" aria-hidden>
                  <i className="fas fa-share-alt" />
                </span>
                <h2 id="follow-heading" className="contact-card__title">
                  {settingValue(settings, 'social_heading') || 'Mitandao ya kijamii'}
                </h2>
              </div>
              <div className="social-links">
                {socialYoutube ? (
                  <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="social-link-youtube">
                    <i className="fab fa-youtube" /> YouTube
                  </a>
                ) : null}
                {socialFacebook ? (
                  <a href={socialFacebook} target="_blank" rel="noopener noreferrer">
                    <i className="fab fa-facebook" /> Facebook
                  </a>
                ) : null}
                {socialInstagram ? (
                  <a href={socialInstagram} target="_blank" rel="noopener noreferrer">
                    <i className="fab fa-instagram" /> Instagram
                  </a>
                ) : null}
                {socialTwitter ? (
                  <a href={socialTwitter} target="_blank" rel="noopener noreferrer">
                    <i className="fab fa-x-twitter" /> X
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </PublicLayout>
  );
};

export default Contact;
