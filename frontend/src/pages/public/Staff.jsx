/**
 * Staff Page - Full Content from Python Template
 */
import React, { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import { resolveStaticUrl } from '../../utils/backendUrl';
import './Staff.css';
import DOMPurify from 'dompurify';

const Staff = () => {
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['page', 'staff'],
    queryFn: () => publicAPI.getPage('staff'),
    retry: false,
    staleTime: 15 * 60 * 1000, // 15 minutes - content rarely changes
  });

  const { data: staffProfiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['public-staff-profiles'],
    queryFn: async () => {
      const res = await publicAPI.getStaffProfiles();
      return res.data?.staff_profiles || [];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - staff profiles rarely change
  });

  const { data: settings } = useQuery({
    queryKey: ['homepage-settings'],
    queryFn: async () => {
      try {
        const res = await publicAPI.getHomepage();
        return res.data?.settings;
      } catch (err) {
        console.error('Error fetching staff settings:', err);
        return {};
      }
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - settings rarely change
  });

  const getPhotoUrl = useCallback(
    (photoPath) => (photoPath ? resolveStaticUrl(photoPath) : null),
    []
  );

  // Memoized arrays - must be before early return to follow Rules of Hooks
  const teachers = useMemo(() => (staffProfiles || []).filter((p) => p.is_teaching), [staffProfiles]);
  const nonTeaching = useMemo(() => (staffProfiles || []).filter((p) => !p.is_teaching), [staffProfiles]);

  const contactEmail = settings?.contact_email || 'info@arushacatholicseminary.co.tz';
  const contactPhone = settings?.contact_phone || '+255 123 456 789';

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Inapakia ukurasa wa watumishi..." />
      </PublicLayout>
    );
  }

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && page && (page.html_content || page.content);

  return (
    <PublicLayout>
      <div className="staff-page staff-page--immersive">
        <div className="staff-page__bg" aria-hidden />
        <div className="staff-page__inner">
          <header className="content-card staff-surface staff-surface--hero">
            <p className="staff-hero__eyebrow">Seminari ya Kikatoliki Arusha</p>
            <h2 className="staff-hero__title">Watumishi</h2>
            <p className="staff-hero__lead">
              Timu ya uongozi, walimu, na watumishi wengine wanaohudumia seminari — taarifa rasmi na wasifu
              wanaoshirikishwa na ofisi ya utawala.
            </p>
          </header>

          {hasCustomContent ? (
            <div
              className="content-card staff-surface staff-surface--cms"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.html_content || page.content || '') }}
            />
          ) : (
            <>
              <div className="content-card staff-surface staff-surface--chunk staff-surface--stripe-navy">
                <h3 className="staff-chunk__title">Uongozi</h3>
                <p className="staff-chunk__text">
                  Seminari inaongozwa na timu ya mapadre na watumishi walei waliobobea katika malezi ya jumla ya wanafunzi.
                </p>
              </div>
              <div className="content-card staff-surface staff-surface--chunk staff-surface--stripe-teal">
                <h3 className="staff-chunk__title">Walimu</h3>
                <p className="staff-chunk__text">
                  Walimu wetu ni wataalamu wa masomo mbalimbali ambao wanatoa mafunzo ya kitaaluma na malezi ya kiroho kwa
                  wanafunzi.
                </p>
              </div>
              <div className="content-card staff-surface staff-surface--chunk staff-surface--stripe-slate">
                <h3 className="staff-chunk__title">Watumishi wasio walimu</h3>
                <p className="staff-chunk__text">
                  Watumishi wasio walimu wanahudumia shule kwa kutoa huduma za usimamizi, usafi, chakula, na mengineyo.
                </p>
              </div>
              <div className="content-card staff-surface staff-surface--chunk staff-surface--stripe-gold">
                <h3 className="staff-chunk__title">Wasiliana nasi</h3>
                <p className="staff-chunk__text">
                  Kwa maelezo zaidi kuhusu watumishi, wasiliana nasi:
                </p>
                <ul className="staff-chunk__contacts">
                  <li>
                    <strong>Barua pepe:</strong>{' '}
                    <a href={`mailto:${contactEmail}`} className="contact-link">
                      {contactEmail}
                    </a>
                  </li>
                  <li>
                    <strong>Simu:</strong>{' '}
                    <a href={`tel:${contactPhone}`} className="contact-link">
                      {contactPhone}
                    </a>
                  </li>
                </ul>
              </div>
            </>
          )}

          <div className="content-card staff-directory-card staff-surface staff-surface--directory-intro">
            <h2 className="staff-directory__title">Wasifu wa watumishi</h2>
            <p className="staff-directory-intro">
              Taarifa hizi husasishwa na ofisi ya utawala. Orodha inagawanywa kwa walimu na watumishi wasio walimu.
            </p>
            {profilesLoading ? (
              <div className="staff-empty">
                <i className="fas fa-spinner fa-spin" aria-hidden />
                Inapakia wasifu wa watumishi…
              </div>
            ) : null}
            {!profilesLoading && (staffProfiles || []).length === 0 ? (
              <div className="staff-empty">
                <i className="fas fa-users" aria-hidden />
                Hakuna wasifu wa watumishi kwa sasa. Taarifa zitapatikana baada ya kuongezwa.
              </div>
            ) : null}
          </div>

          {!profilesLoading && (staffProfiles || []).length > 0 ? (
            <>
              <section
                className="content-card staff-surface staff-surface--directory-teachers"
                aria-labelledby="staff-teachers-heading"
              >
                <h3 id="staff-teachers-heading" className="staff-section-card__title">
                  Walimu
                </h3>
                {teachers.length === 0 ? (
                  <div className="staff-empty staff-empty--compact">Hakuna wasifu wa walimu kwa sasa.</div>
                ) : (
                  <div className="staff-grid-public">
                    {teachers.map((p) => (
                      <article key={p.id} className="staff-profile-card">
                        <div className="profile-head">
                          <div className="profile-photo-frame">
                            {p.photo_path ? (
                              <img
                                src={getPhotoUrl(p.photo_path)}
                                alt={p.full_name}
                                className="profile-photo-inner"
                                loading="lazy"
                              />
                            ) : (
                              <div className="profile-photo-inner profile-photo-placeholder">
                                <i className="fas fa-user" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h4>{p.full_name}</h4>
                            <p className="role">{p.role_title}</p>
                          </div>
                        </div>
                        <div className="profile-body">
                          {p.professional_subjects ? <div><strong>Taaluma:</strong> {p.professional_subjects}</div> : null}
                          {p.teaching_since_year ? (
                            <div><strong>Mwaka wa kuanza kufundisha:</strong> {p.teaching_since_year}</div>
                          ) : null}
                          {p.subjects_teaching ? <div><strong>Masomo anayofundisha:</strong> {p.subjects_teaching}</div> : null}
                          {p.class_teacher_for ? <div><strong>Mlezi wa darasa:</strong> {p.class_teacher_for}</div> : null}
                          {p.other_duties ? <div><strong>Majukumu mengine:</strong> {p.other_duties}</div> : null}
                          {p.contact_phone ? (
                            <div>
                              <strong>Simu:</strong> <a href={`tel:${p.contact_phone}`}>{p.contact_phone}</a>
                            </div>
                          ) : null}
                          {p.contact_email ? (
                            <div>
                              <strong>Barua pepe:</strong> <a href={`mailto:${p.contact_email}`}>{p.contact_email}</a>
                            </div>
                          ) : null}
                          {p.profile_summary ? <p className="summary">{p.profile_summary}</p> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section
                className="content-card staff-surface staff-surface--directory-non"
                aria-labelledby="staff-non-teachers-heading"
              >
                <h3 id="staff-non-teachers-heading" className="staff-section-card__title">
                  Watumishi wasio walimu
                </h3>
                {nonTeaching.length === 0 ? (
                  <div className="staff-empty staff-empty--compact">Hakuna wasifu wa watumishi wasio walimu kwa sasa.</div>
                ) : (
                  <div className="staff-grid-public">
                    {nonTeaching.map((p) => (
                      <article key={p.id} className="staff-profile-card">
                        <div className="profile-head">
                          <div className="profile-photo-frame">
                            {p.photo_path ? (
                              <img
                                src={getPhotoUrl(p.photo_path)}
                                alt={p.full_name}
                                className="profile-photo-inner"
                                loading="lazy"
                              />
                            ) : (
                              <div className="profile-photo-inner profile-photo-placeholder">
                                <i className="fas fa-user" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h4>{p.full_name}</h4>
                            <p className="role">{p.role_title}</p>
                          </div>
                        </div>
                        <div className="profile-body">
                          {p.other_duties ? <div><strong>Majukumu:</strong> {p.other_duties}</div> : null}
                          {p.contact_phone ? (
                            <div>
                              <strong>Simu:</strong> <a href={`tel:${p.contact_phone}`}>{p.contact_phone}</a>
                            </div>
                          ) : null}
                          {p.contact_email ? (
                            <div>
                              <strong>Barua pepe:</strong> <a href={`mailto:${p.contact_email}`}>{p.contact_email}</a>
                            </div>
                          ) : null}
                          {p.profile_summary ? <p className="summary">{p.profile_summary}</p> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </PublicLayout>
  );
};

export default Staff;
