/**
 * Admissions Page — CMS from Admin → Public Pages (slug: admissions)
 */
import { useQuery } from '@tanstack/react-query';
import { PublicCmsHtml, PublicCmsEmpty, usePublicPage } from '../../components/public/PublicCmsPage';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import { hasPublishedPage, settingValue } from '../../utils/publicPageContent';
import './Admissions.css';

const AdmissionsHero = ({ settings }) => {
  const email = settingValue(settings, 'contact_email');
  const phone = settingValue(settings, 'contact_phone');
  return (
    <header className="admissions-hero admissions-hero--compact">
      <div className="admissions-hero__inner">
        <p className="admissions-hero__eyebrow">Seminari ya Kikatoliki Arusha</p>
        <h1 className="admissions-hero__title">Udahili</h1>
        {email ? (
          <a href={`mailto:${email}`} className="admissions-hero__link">
            <i className="fas fa-envelope" aria-hidden /> {email}
          </a>
        ) : null}
        {phone ? (
          <a href={`tel:${phone}`} className="admissions-hero__phone">
            <i className="fas fa-phone" aria-hidden /> {phone}
          </a>
        ) : null}
      </div>
    </header>
  );
};

const Admissions = () => {
  const { data: pageData, isLoading, isError } = usePublicPage('admissions');
  const { data: settings } = useQuery({
    queryKey: ['homepage'],
    queryFn: () => publicAPI.getHomepage(),
    select: (res) => res.data?.settings,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Inapakia ukurasa wa udahili..." />
      </PublicLayout>
    );
  }

  const page = pageData?.data?.page;
  const published = !isError && hasPublishedPage(page);

  return (
    <PublicLayout>
      <div className="admissions-page">
        <AdmissionsHero settings={settings} />
        {published ? (
          <PublicCmsHtml page={page} className="admissions-card admissions-card--prose content-card" />
        ) : (
          <PublicCmsEmpty pageLabel="Udahili" />
        )}
      </div>
    </PublicLayout>
  );
};

export default Admissions;
