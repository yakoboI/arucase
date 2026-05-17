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
import { PublicCmsHtml, PublicCmsEmpty, usePublicPage } from '../../components/public/PublicCmsPage';
import { hasPublishedPage } from '../../utils/publicPageContent';

const Staff = () => {
  const { data: pageData, isLoading, isError } = usePublicPage('staff');

  const { data: staffProfiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['public-staff-profiles'],
    queryFn: async () => {
      const res = await publicAPI.getStaffProfiles();
      return res.data?.staff_profiles || [];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - staff profiles rarely change
  });

  const getPhotoUrl = useCallback(
    (photoPath) => (photoPath ? resolveStaticUrl(photoPath) : null),
    []
  );

  // Memoized arrays - must be before early return to follow Rules of Hooks
  const teachers = useMemo(() => (staffProfiles || []).filter((p) => p.is_teaching), [staffProfiles]);
  const nonTeaching = useMemo(() => (staffProfiles || []).filter((p) => !p.is_teaching), [staffProfiles]);


  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Inapakia ukurasa wa watumishi..." />
      </PublicLayout>
    );
  }

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && hasPublishedPage(page);

  return (
    <PublicLayout>
      <div className="staff-page staff-page--immersive">
        <div className="staff-page__bg" aria-hidden />
        <div className="staff-page__inner">
          <header className="content-card staff-surface staff-surface--hero">
            <p className="staff-hero__eyebrow">Seminari ya Kikatoliki Arusha</p>
            <h2 className="staff-hero__title">Watumishi</h2>
            </header>

          {hasCustomContent ? (
            <PublicCmsHtml page={page} className="content-card staff-surface staff-surface--cms" />
          ) : (
            <PublicCmsEmpty pageLabel="Watumishi" />
          )}

          <div className="content-card staff-directory-card staff-surface staff-surface--directory-intro">
            <h2 className="staff-directory__title">Wasifu wa watumishi</h2>
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
