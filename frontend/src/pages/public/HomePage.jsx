/**
 * Homepage — hero, discovery hub, news, gallery, leadership, FAQ, contact.
 * Markup uses only standard HTML elements (div, section, etc.) — no <motion> tags.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import PublicLayout from '../../components/layout/PublicLayout';
import { publicAPI } from '../../services/public';
import { resolveStaticUrl } from '../../utils/backendUrl';
import './HomePage.css';
import { PublicCmsHtml, usePublicPage } from '../../components/public/PublicCmsPage';
import { hasPublishedPage, settingValue } from '../../utils/publicPageContent';
import { syncFaqJsonLd, removeFaqJsonLd } from '../../utils/faqJsonLd';

function stripHtml(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }).trim();
}

function excerpt(text, max = 140) {
  const plain = stripHtml(text);
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trim()}…`;
}

function formatAnnouncementDate(createdAt) {
  if (!createdAt) return '';
  try {
    return new Date(createdAt).toLocaleDateString('sw-TZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

const HomePage = () => {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [failedImages, setFailedImages] = useState(new Set());
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [selectedGalleryPhoto, setSelectedGalleryPhoto] = useState(null);

  const getImageUrl = useCallback((path) => resolveStaticUrl(path), []);

  const { data, isLoading } = useQuery({
    queryKey: ['homepage'],
    queryFn: async () => {
      try {
        const res = await publicAPI.getHomepage();
        return res.data;
      } catch {
        return {
          settings: {},
          gallery_photos: [],
          faqs: [],
          administrators: [],
          announcements: [],
          school_stats: { graduates_since_1967: 0, current_students: 0, academic_year: null },
        };
      }
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
    retryOnMount: false,
    refetchOnWindowFocus: false,
  });

  const actualData = data && typeof data === 'object' ? data : {};
  const {
    settings = {},
    gallery_photos = [],
    faqs = [],
    administrators = [],
    announcements = [],
    school_stats = {},
  } = actualData;

  const schoolName = settingValue(settings, 'school_name');
  const rectorStatement = settingValue(settings, 'rector_statement');

  const contactEmail = settingValue(settings, 'contact_email');
  const contactPhone = settingValue(settings, 'contact_phone');
  const contactWhatsapp = settingValue(settings, 'contact_whatsapp');
  const contactAddress = settingValue(settings, 'contact_address');
  const socialLocation = settingValue(settings, 'social_location');
  const { data: homepageCmsData } = usePublicPage('homepage');
  const homepageCms = homepageCmsData?.data?.page;
  const hasHomepageCms = hasPublishedPage(homepageCms);
  const whatsappUrl = contactWhatsapp
    ? `https://wa.me/${contactWhatsapp.replace(/[+\s]/g, '')}`
    : '';

  const formatStat = useCallback((value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return '—';
    return n.toLocaleString('en-US');
  }, []);

  const validGalleryPhotos = useMemo(() => {
    return (
      gallery_photos?.filter((photo) => {
        const imageUrl = getImageUrl(photo.path);
        return !failedImages.has(imageUrl);
      }) || []
    );
  }, [gallery_photos, failedImages, getImageUrl]);

  const carouselPhotos = useMemo(
    () => validGalleryPhotos.slice(0, Math.min(10, validGalleryPhotos.length)),
    [validGalleryPhotos]
  );

  const galleryPreviewPhotos = useMemo(
    () => validGalleryPhotos.slice(0, 6),
    [validGalleryPhotos]
  );

  const previewAnnouncements = useMemo(
    () => (announcements || []).slice(0, 3),
    [announcements]
  );

  const displayFaqs = useMemo(() => (faqs || []).slice(0, 5), [faqs]);

  useEffect(() => {
    syncFaqJsonLd(displayFaqs);
    return () => removeFaqJsonLd();
  }, [displayFaqs]);

  const handleImageError = useCallback((imageUrl) => {
    if (imageUrl) {
      setFailedImages((prev) => new Set([...prev, imageUrl]));
    }
  }, []);

  useEffect(() => {
    if (!carouselPhotos.length) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => {
        const maxIndex = carouselPhotos.length - 1;
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [carouselPhotos.length]);

  useEffect(() => {
    if (!selectedAdmin && !selectedGalleryPhoto) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedAdmin(null);
        setSelectedGalleryPhoto(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedAdmin, selectedGalleryPhoto]);

  const academicYear = school_stats?.academic_year || new Date().getFullYear();

  return (
    <PublicLayout>
      <div className="homepage">
        {/* —— Hero —— */}
        <section className="main-content" aria-label="Ukurasa wa mwanzo">
          <div className="hero-carousel">
            {isLoading && carouselPhotos.length === 0 ? (
              <SkeletonLoader type="image" height="400px" />
            ) : carouselPhotos.length > 0 ? (
              <>
                <div className="carousel-wrapper">
                  {carouselPhotos.map((photo, index) => {
                    const imageUrl = getImageUrl(photo.path);
                    const isActive = index === carouselIndex;
                    const shouldLoad = isActive || Math.abs(index - carouselIndex) <= 1;
                    const slideAlt =
                      photo.caption ||
                      `${schoolName} — picha ya seminari ${index + 1}`;
                    return (
                      <div
                        key={photo.id || index}
                        className={`carousel-slide ${isActive ? 'active' : ''}`}
                        style={{
                          backgroundImage:
                            shouldLoad && imageUrl ? `url("${imageUrl}")` : 'none',
                        }}
                      >
                        {shouldLoad && imageUrl && (
                          <>
                            <img
                              src={imageUrl}
                              alt={slideAlt}
                              width={1200}
                              height={600}
                              style={{ display: 'none' }}
                              loading={isActive ? 'eager' : 'lazy'}
                              onError={() => handleImageError(imageUrl)}
                              onLoad={() => {
                                setFailedImages((prev) => {
                                  const next = new Set(prev);
                                  next.delete(imageUrl);
                                  return next;
                                });
                              }}
                            />
                            <div className="carousel-overlay" aria-hidden />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                {carouselPhotos.length > 1 && (
                  <div className="carousel-indicators">
                    {carouselPhotos.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`carousel-indicator ${index === carouselIndex ? 'active' : ''}`}
                        onClick={() => setCarouselIndex(index)}
                        aria-label={`Nenda kwenye picha ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="hero-fallback-background" aria-hidden />
            )}
          </div>

          <div className="hero-content-overlay hero-content-overlay--cta-only">
            <div className="hero-cta-group">
              <Link to="/admissions/apply" className="hero-cta hero-cta--primary">
                <i className="fas fa-pen-to-square" aria-hidden />
                Omba Udahili
                <span className="hero-cta-en">Apply now</span>
              </Link>
              <Link to="/about" className="hero-cta">
                <i className="fas fa-info-circle" aria-hidden />
                Kuhusu
              </Link>
              <Link to="/contact" className="hero-cta">
                <i className="fas fa-envelope" aria-hidden />
                Wasiliana
              </Link>
              <Link to="/student-login" className="hero-cta hero-cta--ghost">
                <i className="fas fa-file-alt" aria-hidden />
                Wanafunzi
              </Link>
            </div>
          </div>

          <Link
            to="/login"
            className="hero-ofisi-link"
            aria-label="Ofisi — uingiaji wa maafisa"
          >
            <i className="fas fa-building" aria-hidden />
            <span className="hero-ofisi-link__label">Ofisi</span>
          </Link>

          <div className="scrolling-text-bottom" aria-live="polite">
            <div className="scrolling-text-wrapper">
              <div className="scrolling-text-content">{rectorStatement}</div>
              <div className="scrolling-text-content">{rectorStatement}</div>
            </div>
          </div>
        </section>

        {/* —— Stats —— */}
        <section className="home-stats-section" aria-label="Takwimu za seminari">
          <div className="home-stats-grid">
            <article className="home-stat-card home-stat-card--graduates">
              <i className="fas fa-user-graduate home-stat-icon" aria-hidden />
              <p className="home-stat-number">
                {isLoading ? '…' : formatStat(school_stats?.graduates_since_1967)}
              </p>
              <p className="home-stat-label">Wahitimu tangu 1967</p>
              <p className="home-stat-label-en">Graduates since 1967</p>
            </article>
            <article className="home-stat-card home-stat-card--enrolled">
              <i className="fas fa-users home-stat-icon" aria-hidden />
              <p className="home-stat-number">
                {isLoading ? '…' : formatStat(school_stats?.current_students)}
              </p>
              <p className="home-stat-label">Wanafunzi wa sasa</p>
              <p className="home-stat-label-en">Current students</p>
              {academicYear ? (
                <p className="home-stat-meta">
                  Mwaka wa masomo {academicYear} · Academic year
                </p>
              ) : null}
            </article>
            <article className="home-stat-card home-stat-card--year">
              <i className="fas fa-calendar-alt home-stat-icon" aria-hidden />
              <p className="home-stat-number">{academicYear}</p>
              <p className="home-stat-label">Mwaka wa masomo</p>
              <p className="home-stat-label-en">School year in progress</p>
            </article>
          </div>
        </section>

        {/* —— Intro —— */}
        <section className="home-intro" aria-labelledby="home-intro-heading">
          <div className="home-section-inner">
            <div className="home-framed-panel">
            <header className="home-section-header home-section-header--left">
              <p className="home-section-eyebrow" lang="sw">
                Karibu
              </p>
              <h2 id="home-intro-heading" className="home-section-title">
                Seminari ya Kikatoliki Arusha
              </h2>
              <p className="home-section-subtitle" lang="en">
                St. Thomas Aquinas Seminary · Oldonyosambu, Tanzania
              </p>
            </header>
            <p className="home-intro-text" lang="sw">
              Tangu <strong>1967</strong>, tunatoa elimu bora ya Kikatoliki na malezi ya kiroho kwa
              vijana wa kiume wanaotamani kulitumikia Kanisa na jamii. Tunafundisha{' '}
              <strong>Form I hadi Form VI</strong> (O-Level na A-Level) kwa ubora wa kitaaluma na
              nidhamu.
            </p>
            <p className="home-intro-text home-intro-text--en" lang="en">
              For over five decades we have formed young men in faith, academics, and service —
              offering <strong>O-Level and A-Level</strong> programmes with NECTA excellence and
              Catholic discipleship in the heart of Arusha.
            </p>
            <Link to="/about" className="home-text-link">
              Soma zaidi kuhusu sisi
              <i className="fas fa-arrow-right" aria-hidden />
            </Link>
            </div>
          </div>
        </section>

        {hasHomepageCms ? (
          <section className="home-cms-section" aria-label="Homepage content">
            <div className="home-section-inner">
              <PublicCmsHtml page={homepageCms} className="content-card home-cms-body" />
            </div>
          </section>
        ) : null}

        {/* —— Announcements —— */}
        {(isLoading || previewAnnouncements.length > 0) && (
          <section className="home-announcements" aria-labelledby="home-news-heading">
            <div className="home-section-inner">
              <header className="home-section-header home-section-header--row">
                <div>
                  <h2 id="home-news-heading" className="home-section-title">
                    <i className="fas fa-bullhorn" aria-hidden />
                    Matangazo
                  </h2>
                  <p className="home-section-subtitle">Latest news · Habari za hivi karibuni</p>
                </div>
                <Link to="/announcements" className="home-view-all">
                  Angalia yote
                  <i className="fas fa-arrow-right" aria-hidden />
                </Link>
              </header>
              {isLoading ? (
                <div className="home-announce-skeleton">
                  <SkeletonLoader type="card" height="100px" />
                  <SkeletonLoader type="card" height="100px" />
                </div>
              ) : (
                <ul className="home-announce-list">
                  {previewAnnouncements.map((ann) => (
                    <li key={ann.id} className="home-announce-item">
                      <div className="home-announce-meta">
                        {ann.created_at && (
                          <time dateTime={ann.created_at}>
                            {formatAnnouncementDate(ann.created_at)}
                          </time>
                        )}
                        {ann.priority && (
                          <span
                            className={`home-announce-priority home-announce-priority--${(ann.priority || 'normal').toLowerCase()}`}
                          >
                            {ann.priority}
                          </span>
                        )}
                      </div>
                      <h3 className="home-announce-title">{ann.title || 'Tangazo'}</h3>
                      <p className="home-announce-excerpt">
                        {excerpt(ann.content || ann.body)}
                      </p>
                      <Link
                        to={`/announcements#${ann.id}`}
                        className="home-announce-readmore"
                      >
                        Soma zaidi
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* —— Admissions CTA —— */}
        <section className="home-admissions-cta" aria-labelledby="home-admissions-heading">
          <div className="home-admissions-cta__inner">
            <div className="home-framed-panel home-framed-panel--cta home-admissions-cta__frame">
            <div className="home-admissions-cta__copy">
              <p className="home-section-eyebrow">Udahili</p>
              <h2 id="home-admissions-heading" className="home-admissions-cta__title">
                Jiunge na Seminari Yetu
              </h2>
              <p className="home-admissions-cta__lead" lang="sw">
                Tunapokea maombi kutoka kwa vijana wa kiume wenye nia ya malezi ya wito na ubora wa
                kitaaluma. Anza safari yako leo — mtandaoni au ofisini.
              </p>
              <p className="home-admissions-cta__lead-en" lang="en">
                We welcome applications from young men seeking Catholic formation and academic
                excellence. Apply online or visit our office.
              </p>
              <ol className="home-admissions-steps">
                <li>
                  <span>1</span> Soma vigezo na nyaraka zinazohitajika
                </li>
                <li>
                  <span>2</span> Jaza fomu ya maombi mtandaoni
                </li>
                <li>
                  <span>3</span> Wasilisha nyaraka na subiri majibu
                </li>
              </ol>
            </div>
            <div className="home-admissions-cta__actions">
              <div className="home-admissions-cta__btn-row">
                <Link to="/admissions/apply" className="home-admissions-btn home-admissions-btn--primary">
                  <i className="fas fa-pen-to-square" aria-hidden />
                  Omba Udahili / Apply Online
                </Link>
                <Link to="/admissions" className="home-admissions-btn">
                  Maelezo ya Udahili
                </Link>
              </div>
              {contactPhone && (
                <a href={`tel:${contactPhone.replace(/\s/g, '')}`} className="home-admissions-phone">
                  <i className="fas fa-phone" aria-hidden />
                  {contactPhone}
                </a>
              )}
            </div>
            </div>
          </div>
        </section>

        {/* —— Gallery preview —— */}
        {(isLoading || galleryPreviewPhotos.length > 0) && (
          <section className="home-gallery" aria-labelledby="home-gallery-heading">
            <div className="home-section-inner">
              <header className="home-section-header home-section-header--row">
                <div>
                  <h2 id="home-gallery-heading" className="home-section-title">
                    <i className="fas fa-images" aria-hidden />
                    Picha za Seminari
                  </h2>
                  <p className="home-section-subtitle">Campus & life · Maisha na mazingira</p>
                </div>
                <Link to="/gallery" className="home-view-all">
                  Angalia picha zote
                  <i className="fas fa-arrow-right" aria-hidden />
                </Link>
              </header>
              {isLoading ? (
                <div className="home-gallery-grid home-gallery-grid--loading">
                  {[1, 2, 3].map((i) => (
                    <SkeletonLoader key={i} type="image" height="200px" />
                  ))}
                </div>
              ) : (
                <div className="home-gallery-grid">
                  {galleryPreviewPhotos.map((photo) => {
                    const imageUrl = getImageUrl(photo.path);
                    return (
                      <button
                        key={photo.id}
                        type="button"
                        className="home-gallery-item"
                        onClick={() => setSelectedGalleryPhoto(photo)}
                        aria-label={photo.caption || 'Fungua picha'}
                      >
                        <img
                          src={imageUrl}
                          alt={photo.caption || 'Picha ya seminari'}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        {photo.caption && (
                          <span className="home-gallery-caption">{photo.caption}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* —— Leadership —— */}
        <section className="administration-section" aria-labelledby="home-leadership-heading">
          <div className="administration-container">
            <header className="administration-header">
              <h2 id="home-leadership-heading" className="administration-title">
                <i className="fas fa-user-tie administration-title-icon" aria-hidden />
                Uongozi wa Shule
              </h2>
              <p className="administration-subtitle">
                School leadership · Wafahamu viongozi wa seminari
              </p>
            </header>
            {administrators?.length > 0 ? (
              <div className="administrators-grid">
                {administrators.map((admin) => (
                  <article key={admin.id} className="admin-card admin-card--named">
                    <button
                      type="button"
                      className="admin-photo-button"
                      onClick={() => setSelectedAdmin(admin)}
                      aria-label={admin.name ? `Angalia ${admin.name}` : 'Angalia wasifu'}
                    >
                      <div className="admin-photo-frame">
                        {admin.photo ? (
                          <img
                            src={getImageUrl(admin.photo)}
                            alt={admin.name || 'Picha ya kiongozi'}
                            className="admin-photo-inner"
                            loading="lazy"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const ph = e.target.nextElementSibling;
                              if (ph) ph.style.display = 'grid';
                            }}
                          />
                        ) : null}
                        <div
                          className="admin-photo-inner admin-photo-placeholder"
                          style={{ display: admin.photo ? 'none' : 'grid' }}
                        >
                          <i className="fas fa-user admin-photo-placeholder-icon" aria-hidden />
                        </div>
                      </div>
                    </button>
                    <div className="admin-card-body">
                      <h3 className="admin-name">{admin.name || '—'}</h3>
                      <p className="admin-title">{admin.title || '—'}</p>
                      {admin.year_started && (
                        <p className="admin-year-inline">
                          <i className="fas fa-calendar-alt" aria-hidden /> Tangu{' '}
                          {admin.year_started}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="administrators-empty">
                <p>Taarifa za uongozi zitapatikana hivi karibuni.</p>
              </div>
            )}
          </div>
        </section>

        {/* —— FAQ —— */}
        <section className="home-faq" aria-labelledby="home-faq-heading">
          <div className="home-section-inner home-faq__inner">
            <header className="home-section-header">
              <h2 id="home-faq-heading" className="home-section-title">
                <i className="fas fa-question-circle" aria-hidden />
                Maswali Yanayoulizwa Mara kwa Mara
              </h2>
              <p className="home-section-subtitle">
                Frequently asked questions · Majibu ya haraka
              </p>
            </header>
            {displayFaqs.length > 0 ? (
              <div className="home-faq-list">
                {displayFaqs.map((faq, index) => (
                  <div
                    key={faq.id || index}
                    className={`home-faq-item ${openFaqIndex === index ? 'is-open' : ''}`}
                  >
                    <button
                      type="button"
                      className="home-faq-question"
                      onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                      aria-expanded={openFaqIndex === index}
                    >
                      <span>{faq.question}</span>
                      <i
                        className={`fas fa-chevron-down home-faq-chevron ${openFaqIndex === index ? 'is-open' : ''}`}
                        aria-hidden
                      />
                    </button>
                    {openFaqIndex === index && (
                      <div className="home-faq-answer">
                        <p>{faq.answer}</p>
                        {faq.category && faq.category !== 'General' && (
                          <span className="home-faq-category">{faq.category}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="home-faq-empty">
                Maswali yataongezwa hapa hivi karibuni. Wasiliana nasi kwa msaada.
              </p>
            )}
            <p className="home-faq-help">
              <i className="fas fa-info-circle" aria-hidden />
              Haujapata jibu?{' '}
              <Link to="/contact">Wasiliana nasi</Link>
              {' · '}
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </p>
          </div>
        </section>

        {/* —— Contact strip —— */}
        <section className="home-contact-strip" aria-label="Mawasiliano">
          <div className="home-section-inner">
            <header className="home-section-header">
              <h2 className="home-section-title">
                <i className="fas fa-headset" aria-hidden />
                Wasiliana Nasi
              </h2>
              <p className="home-section-subtitle">Get in touch · Tupo Oldonyosambu, Arusha</p>
            </header>
            <div className="home-contact-grid">
              <a href={`tel:${contactPhone.replace(/\s/g, '')}`} className="home-contact-card">
                <i className="fas fa-phone" aria-hidden />
                <span className="home-contact-label">Simu / Phone</span>
                <span className="home-contact-value">{contactPhone}</span>
              </a>
              <a href={`mailto:${contactEmail}`} className="home-contact-card">
                <i className="fas fa-envelope" aria-hidden />
                <span className="home-contact-label">Barua pepe / Email</span>
                <span className="home-contact-value">{contactEmail}</span>
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="home-contact-card"
              >
                <i className="fab fa-whatsapp" aria-hidden />
                <span className="home-contact-label">WhatsApp</span>
                <span className="home-contact-value">Ujumbe wa haraka</span>
              </a>
              <a
                href={socialLocation}
                target="_blank"
                rel="noopener noreferrer"
                className="home-contact-card"
              >
                <i className="fas fa-map-marker-alt" aria-hidden />
                <span className="home-contact-label">Eneo / Location</span>
                <span className="home-contact-value">{contactAddress}</span>
              </a>
            </div>
            <Link to="/contact" className="home-contact-page-link">
              Ukurasa kamili wa mawasiliano
              <i className="fas fa-arrow-right" aria-hidden />
            </Link>
          </div>
        </section>

        {/* —— Modals —— */}
        {selectedAdmin && (
          <div
            className="admin-profile-modal"
            onClick={() => setSelectedAdmin(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Wasifu wa kiongozi"
          >
            <div
              className="admin-profile-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="admin-profile-modal-close"
                onClick={() => setSelectedAdmin(null)}
                aria-label="Funga"
              >
                <i className="fas fa-times" aria-hidden />
              </button>
              <div className="admin-photo-container admin-photo-container--modal">
                <div className="admin-photo-frame">
                  {selectedAdmin.photo ? (
                    <img
                      src={getImageUrl(selectedAdmin.photo)}
                      alt={selectedAdmin.name || 'Administrator photo'}
                      className="admin-photo-inner"
                      loading="eager"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const ph = e.target.nextElementSibling;
                        if (ph) ph.style.display = 'grid';
                      }}
                    />
                  ) : null}
                  <div
                    className="admin-photo-inner admin-photo-placeholder"
                    style={{ display: selectedAdmin.photo ? 'none' : 'grid' }}
                  >
                    <i className="fas fa-user admin-photo-placeholder-icon" aria-hidden />
                  </div>
                </div>
              </div>
              <h3 className="admin-name admin-name--modal">
                {selectedAdmin.name || 'Name Not Available'}
              </h3>
              <p className="admin-title admin-title--modal">
                {selectedAdmin.title || 'Title Not Available'}
              </p>
              {selectedAdmin.year_started && (
                <div className="admin-year-badge admin-year-badge--modal">
                  <i className="fas fa-calendar-alt admin-year-badge-icon" aria-hidden />
                  <span className="admin-year-text">Since {selectedAdmin.year_started}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedGalleryPhoto && (
          <div
            className="home-gallery-lightbox"
            onClick={() => setSelectedGalleryPhoto(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="home-gallery-lightbox-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="home-gallery-lightbox-close"
                onClick={() => setSelectedGalleryPhoto(null)}
                aria-label="Funga"
              >
                <i className="fas fa-times" aria-hidden />
              </button>
              <img
                src={getImageUrl(selectedGalleryPhoto.path)}
                alt={selectedGalleryPhoto.caption || 'Picha ya seminari'}
              />
              {selectedGalleryPhoto.caption && (
                <p className="home-gallery-lightbox-caption">{selectedGalleryPhoto.caption}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default HomePage;
