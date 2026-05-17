/**
 * Student Report page — CMS from Admin → Public Pages (slug: student_report)
 */
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import PublicCmsPage from '../../components/public/PublicCmsPage';
import { prepareStudentReportHtml } from './studentReportCms';
import './StudentReport.css';

const PageHeader = () => (
  <header className="student-report-page-header">
    <p className="student-report-page-eyebrow">Seminari ya Kikatoliki Arusha</p>
    <h1 className="student-report-page-title">Ripoti za Mwanafunzi</h1>
    <div className="student-report-page-cta">
      <Link to="/student-login" className="student-report-page-cta__btn">
        <i className="fas fa-sign-in-alt" aria-hidden />
        Ingia kuona ripoti na matokeo
      </Link>
    </div>
  </header>
);

const StudentReport = () => (
  <PublicCmsPage
    pageSlug="student_report"
    pageLabel="Ripoti za Wanafunzi"
    loadingMessage="Inapakia ukurasa wa ripoti..."
    shellClassName="student-report-page student-report-page--immersive"
    innerClassName="student-report-page__inner"
    header={<PageHeader />}
    prepareHtml={(page) => {
      const raw = prepareStudentReportHtml(page);
      return { html: DOMPurify.sanitize(raw.html), variant: raw.variant };
    }}
    cmsClassName="content-card student-report-surface student-report-surface--cms"
  />
);

export default StudentReport;
