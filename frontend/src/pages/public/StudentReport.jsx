/**
 * Student Report page — sharp cards, gray shell, centred header + CTA.
 * CMS: HTML passthrough, or markdown-style (## / lists) → multi-card grid.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import { prepareStudentReportHtml } from './studentReportCms';
import './StudentReport.css';
import DOMPurify from 'dompurify';

const PageHeader = () => (
  <header className="student-report-page-header">
    <p className="student-report-page-eyebrow">Seminari ya Kikatoliki Arusha</p>
    <h1 className="student-report-page-title">Ripoti za Mwanafunzi</h1>
    <p className="student-report-page-lead">
      Seminari inadumisha mfumo wa ripoti ili kufuatilia maendeleo ya kitaaluma na malezi, na kuwasiliana
      na wazazi na walezi kuhusu maendeleo ya mwanafunzi.
    </p>
    <div className="student-report-page-cta">
      <Link to="/student-login" className="student-report-page-cta__btn">
        <i className="fas fa-sign-in-alt" aria-hidden />
        Ingia kuona ripoti na matokeo
      </Link>
      <p className="student-report-page-cta__hint">
        Wanafunzi waliosajiliwa hutumia mwaka, namba ya usajili, na namba ya kitabulisho ya muda ili kuingia
        kuona matokeo yake.
      </p>
    </div>
  </header>
);

const StudentReport = () => {
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['page', 'student_report'],
    queryFn: () => publicAPI.getPage('student_report'),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  const { data: settings } = useQuery({
    queryKey: ['homepage'],
    queryFn: () => publicAPI.getHomepage(),
    select: (res) => res.data?.settings,
    staleTime: 10 * 60 * 1000,
  });

  const email = settings?.contact_email || 'info@arushacatholicseminary.co.tz';
  const phone = settings?.contact_phone || '+255 123 456 789';

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && page && (page.html_content || page.content);

  const preparedCms = useMemo(() => {
    if (!page) return { html: '', variant: 'prose' };
    const raw = prepareStudentReportHtml(page);
    return { html: DOMPurify.sanitize(raw.html), variant: raw.variant };
  }, [page?.html_content, page?.content]);

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Inapakia ukurasa wa ripoti..." />
      </PublicLayout>
    );
  }

  const fallbackContent = (
    <div className="student-report-inner">
      <section className="student-report-card" aria-labelledby="sr-academic-heading">
        <div className="student-report-card__head">
          <span className="student-report-card__icon" aria-hidden>
            <i className="fas fa-chart-line" />
          </span>
          <h2 id="sr-academic-heading" className="student-report-card__title">
            Ripoti za Kitaaluma
          </h2>
        </div>
        <p className="student-report-card__intro">
          Tunafuatilia maendeleo ya masomo na malezi ya kiroho kwa njia iliyo wazi na ya kina, ili kila
          mwanafunzi apate mwongozo unaofaa.
        </p>
      </section>

      <section className="student-report-card" aria-labelledby="sr-structure-heading">
        <div className="student-report-card__head">
          <span className="student-report-card__icon" aria-hidden>
            <i className="fas fa-clipboard-list" />
          </span>
          <h2 id="sr-structure-heading" className="student-report-card__title">
            Yaliyomo kwenye Ripoti
          </h2>
        </div>
        <ul className="student-report-list">
          <li>Alama za masomo na nafasi kwenye darasa</li>
          <li>Nafasi ya muhula na ujumla wa utendaji</li>
          <li>Maoni ya walimu kwa kila somo</li>
          <li>Maoni ya mwalimu wa darasa kwa ujumla</li>
          <li>Maoni ya mkuu wa shule</li>
          <li>Tathmini ya kiongozi wa kiroho</li>
          <li>Tabia na nidhamu</li>
        </ul>
      </section>

      <section className="student-report-card" aria-labelledby="sr-schedule-heading">
        <div className="student-report-card__head">
          <span className="student-report-card__icon" aria-hidden>
            <i className="fas fa-calendar-alt" />
          </span>
          <h2 id="sr-schedule-heading" className="student-report-card__title">
            Ratiba ya Ripoti
          </h2>
        </div>
        <ul className="student-report-list">
          <li><strong>Ripoti za kila mwezi:</strong> muhtasari wa maendeleo ya masomo</li>
          <li><strong>Ripoti za kati ya muhula:</strong> tathmini kamili katikati ya muhula</li>
          <li><strong>Ripoti za mwisho wa muhula:</strong> ripoti kamili ya kitaaluma na malezi</li>
          <li><strong>Ripoti ya mwaka:</strong> muhtasari wa mwisho wa mwaka wa masomo</li>
        </ul>
      </section>

      <section className="student-report-card student-report-card--wide" aria-labelledby="sr-access-heading">
        <div className="student-report-card__head">
          <span className="student-report-card__icon" aria-hidden>
            <i className="fas fa-door-open" />
          </span>
          <h2 id="sr-access-heading" className="student-report-card__title">
            Jinsi ya Kupata Ripoti
          </h2>
        </div>
        <ul className="student-report-list">
          <li>Nakala za magazeti mwishoni mwa muhula</li>
          <li>Mikutano ya wazazi na walimu</li>
          <li>
            <strong>Mtandaoni (wanafunzi):</strong>{' '}
            <Link to="/student-login" className="student-report-inline-link">
              Ingia hapa
            </Link>{' '}
            kwenye mfumo wa &ldquo;Ripoti za Mwanafunzi&rdquo; kuangalia ripoti na matokeo baada ya kuingia.
          </li>
        </ul>
      </section>

      <section className="student-report-card student-report-card--contact" aria-labelledby="sr-contact-heading">
        <div className="student-report-card__head">
          <span className="student-report-card__icon" aria-hidden>
            <i className="fas fa-envelope" />
          </span>
          <h2 id="sr-contact-heading" className="student-report-card__title">
            Maswali kuhusu Ripoti
          </h2>
        </div>
        <p className="student-report-card__intro">
          Kwa maelezo zaidi kuhusu ripoti, wasiliana na ofisi ya shule:
        </p>
        <ul className="student-report-contact-list">
          <li>
            <span className="student-report-contact-list__key">Barua pepe</span>
            <a href={`mailto:${email}`} className="student-report-contact-list__link">
              {email}
            </a>
          </li>
          <li>
            <span className="student-report-contact-list__key">Simu</span>
            <a href={`tel:${phone}`} className="student-report-contact-list__link">
              {phone}
            </a>
          </li>
        </ul>
      </section>
    </div>
  );

  return (
    <PublicLayout>
      <div
        className={`student-report-page${hasCustomContent ? ' student-report-page--cms' : ''}${
          hasCustomContent && preparedCms.variant === 'grid' ? ' student-report-page--cms-grid' : ''
        }`}
      >
        <PageHeader />

        {hasCustomContent ? (
          <article
            className={
              preparedCms.variant === 'grid'
                ? 'student-report-cms-article student-report-cms-article--grid'
                : 'student-report-card student-report-card--prose content-card'
            }
            dangerouslySetInnerHTML={{ __html: preparedCms.html }}
          />
        ) : (
          fallbackContent
        )}
      </div>
    </PublicLayout>
  );
};

export default StudentReport;
