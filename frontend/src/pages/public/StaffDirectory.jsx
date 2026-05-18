/**
 * Staff directory grid — data from Admin → Staff Profiles (not Public Pages).
 */
import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicAPI } from '../../services/public';
import { resolveStaticUrl } from '../../utils/backendUrl';

function StaffProfileCard({ profile, getPhotoUrl, teaching }) {
  return (
    <article className="staff-profile-card">
      <div className="profile-head">
        <div className="profile-photo-frame">
          {profile.photo_path ? (
            <img
              src={getPhotoUrl(profile.photo_path)}
              alt={profile.full_name}
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
          <h4>{profile.full_name}</h4>
          <p className="role">{profile.role_title}</p>
        </div>
      </div>
      <div className="profile-body">
        {teaching && profile.professional_subjects ? (
          <div>
            <strong>Taaluma:</strong> {profile.professional_subjects}
          </div>
        ) : null}
        {teaching && profile.teaching_since_year ? (
          <div>
            <strong>Mwaka wa kuanza kufundisha:</strong> {profile.teaching_since_year}
          </div>
        ) : null}
        {teaching && profile.subjects_teaching ? (
          <div>
            <strong>Masomo anayofundisha:</strong> {profile.subjects_teaching}
          </div>
        ) : null}
        {teaching && profile.class_teacher_for ? (
          <div>
            <strong>Mlezi wa darasa:</strong> {profile.class_teacher_for}
          </div>
        ) : null}
        {profile.other_duties ? (
          <div>
            <strong>{teaching ? 'Majukumu mengine' : 'Majukumu'}:</strong> {profile.other_duties}
          </div>
        ) : null}
        {profile.contact_phone ? (
          <div>
            <strong>Simu:</strong> <a href={`tel:${profile.contact_phone}`}>{profile.contact_phone}</a>
          </div>
        ) : null}
        {profile.contact_email ? (
          <div>
            <strong>Barua pepe:</strong>{' '}
            <a href={`mailto:${profile.contact_email}`}>{profile.contact_email}</a>
          </div>
        ) : null}
        {profile.profile_summary ? <p className="summary">{profile.profile_summary}</p> : null}
      </div>
    </article>
  );
}

export default function StaffDirectory() {
  const { data: staffProfiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['public-staff-profiles'],
    queryFn: async () => {
      const res = await publicAPI.getStaffProfiles();
      return res.data?.staff_profiles || [];
    },
    staleTime: 15 * 60 * 1000,
  });

  const getPhotoUrl = useCallback(
    (photoPath) => (photoPath ? resolveStaticUrl(photoPath) : null),
    []
  );

  const teachers = useMemo(() => (staffProfiles || []).filter((p) => p.is_teaching), [staffProfiles]);
  const nonTeaching = useMemo(() => (staffProfiles || []).filter((p) => !p.is_teaching), [staffProfiles]);

  if (profilesLoading) {
    return (
      <div className="staff-empty">
        <i className="fas fa-spinner fa-spin" aria-hidden />
        Inapakia wasifu wa watumishi…
      </div>
    );
  }

  if ((staffProfiles || []).length === 0) {
    return (
      <div className="staff-empty">
        <i className="fas fa-users" aria-hidden />
        Hakuna wasifu wa watumishi kwa sasa. Ongeza katika Admin → Staff Profiles.
      </div>
    );
  }

  return (
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
              <StaffProfileCard key={p.id} profile={p} getPhotoUrl={getPhotoUrl} teaching />
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
              <StaffProfileCard key={p.id} profile={p} getPhotoUrl={getPhotoUrl} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
