/**
 * Student Report page — CMS from Admin → Public Pages (slug: student_report)
 */
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import PublicCmsPage from '../../components/public/PublicCmsPage';
import { prepareStudentReportHtml } from './studentReportCms';
import './StudentReport.css';

const StudentReportCta = () => (
  <div className="student-report-page-cta">
    <Link to="/student-login" className="student-report-page-cta__btn">
      <i className="fas fa-sign-in-alt" aria-hidden />
      Ingia kuona ripoti na matokeo
    </Link>
  </div>
);

const StudentReport = () => (
  <PublicCmsPage
    pageSlug="student_report"
    pageLabel="Ripoti za Wanafunzi"
    loadingMessage="Inapakia ukurasa wa ripoti..."
    shellClassName="student-report-page student-report-page--immersive"
    innerClassName="student-report-page__inner"
    showPageHero
    heroVariant="student-report"
    afterHero={<StudentReportCta />}
    prepareHtml={(page) => {
      const raw = prepareStudentReportHtml(page);
      return { html: DOMPurify.sanitize(raw.html), variant: raw.variant };
    }}
    cmsClassName="content-card student-report-surface student-report-surface--cms"
  />
);

export default StudentReport;
