/**
 * Staff Page - Full Content from Python Template
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMemo, useCallback } from 'react';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import './Staff.css';

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

  const getPhotoUrl = useCallback((photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) return photoPath;
    const cleanPath = photoPath.startsWith('/') ? photoPath.substring(1) : photoPath;
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) return `${apiUrl.replace('/api', '')}/static/${cleanPath}`;
    return `/static/${cleanPath}`;
  }, []);

  // Memoized arrays - must be before early return to follow Rules of Hooks
  const teachers = useMemo(() => (staffProfiles || []).filter((p) => p.is_teaching), [staffProfiles]);
  const nonTeaching = useMemo(() => (staffProfiles || []).filter((p) => !p.is_teaching), [staffProfiles]);

  const fallbackContent = (
    <div className="content-card">
      <h2>Watumishi</h2>

      <h3>Uongozi</h3>
      <p>
        Seminari inaongozwa na timu ya mapadre na watumishi walei waliobobea katika malezi ya jumla ya wanafunzi.
      </p>

      <h3>Walimu</h3>
      <p>
        Walimu wetu ni wataalamu wa masomo mbalimbali ambao wanatoa mafunzo ya kitaaluma na malezi ya kiroho
        kwa wanafunzi.
      </p>

      <h3>Watumishi Wasio Walimu</h3>
      <p>
        Watumishi wasio walimu wanahudumia shule kwa kutoa huduma za usimamizi, usafi, chakula, na mengineyo.
      </p>

      <h3>Wasiliana Nasi</h3>
      <p>
        Kwa maelezo zaidi kuhusu watumishi, wasiliana nasi:<br />
        <strong>Barua pepe:</strong>{' '}
        <a href={`mailto:${settings?.contact_email || 'info@arushacatholicseminary.co.tz'}`} className="contact-link">
          {settings?.contact_email || 'info@arushacatholicseminary.co.tz'}
        </a>
        <br />
        <strong>Simu:</strong>{' '}
        <a href={`tel:${settings?.contact_phone || '+255 123 456 789'}`} className="contact-link">
          {settings?.contact_phone || '+255 123 456 789'}
        </a>
      </p>
    </div>
  );

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Inapakia ukurasa wa watumishi..." />
      </PublicLayout>
    );
  }

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && page && (page.html_content || page.content);
  const contactPhone = settings?.contact_phone || '+255 123 456 789';
  const contactEmail = settings?.contact_email || 'info@arushacatholicseminary.co.tz';

  return (
    <PublicLayout>
      <div className="staff-page">
        <Link to="/" className="home-button">
          <i className="fas fa-home"></i> Rudi Nyumbani
        </Link>

        {hasCustomContent ? (
          <div className="content-card" dangerouslySetInnerHTML={{ __html: page.html_content || page.content || '' }} />
        ) : (
          fallbackContent
        )}

        <div className="content-card staff-directory-card">
          <h2>Wasifu wa Watumishi</h2>
          <p className="staff-directory-intro">
            Taarifa hizi husasishwa na ofisi ya utawala. Hapa utaona walimu na watumishi wasio walimu pamoja na majukumu yao.
          </p>

          {profilesLoading ? (
            <div className="staff-empty"><i className="fas fa-spinner fa-spin" /> Inapakia wasifu wa watumishi...</div>
          ) : (staffProfiles || []).length === 0 ? (
            <div className="staff-empty">
              <i className="fas fa-users" />
              Hakuna wasifu wa watumishi kwa sasa. Taarifa zitapatikana baada ya kuongezwa.
            </div>
          ) : (
            <>
              <h3>Walimu</h3>
              {teachers.length === 0 ? (
                <div className="staff-empty">Hakuna wasifu wa walimu kwa sasa.</div>
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
                        {p.teaching_since_year ? <div><strong>Mwaka wa kuanza kufundisha:</strong> {p.teaching_since_year}</div> : null}
                        {p.subjects_teaching ? <div><strong>Masomo anayofundisha:</strong> {p.subjects_teaching}</div> : null}
                        {p.class_teacher_for ? <div><strong>Mlezi wa darasa:</strong> {p.class_teacher_for}</div> : null}
                        {p.other_duties ? <div><strong>Majukumu mengine:</strong> {p.other_duties}</div> : null}
                        {p.contact_phone ? <div><strong>Simu:</strong> <a href={`tel:${p.contact_phone}`}>{p.contact_phone}</a></div> : null}
                        {p.contact_email ? <div><strong>Barua pepe:</strong> <a href={`mailto:${p.contact_email}`}>{p.contact_email}</a></div> : null}
                        {p.profile_summary ? <p className="summary">{p.profile_summary}</p> : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <h3>Watumishi Wasio Walimu</h3>
              {nonTeaching.length === 0 ? (
                <div className="staff-empty">Hakuna wasifu wa watumishi wasio walimu kwa sasa.</div>
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
                        {p.contact_phone ? <div><strong>Simu:</strong> <a href={`tel:${p.contact_phone}`}>{p.contact_phone}</a></div> : null}
                        {p.contact_email ? <div><strong>Barua pepe:</strong> <a href={`mailto:${p.contact_email}`}>{p.contact_email}</a></div> : null}
                        {p.profile_summary ? <p className="summary">{p.profile_summary}</p> : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default Staff;
