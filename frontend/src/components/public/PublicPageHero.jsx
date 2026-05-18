/**
 * Page hero: school name (eyebrow) from School Branding; title from Public Pages row title.
 */
import { settingValue } from '../../utils/publicPageContent';

export default function PublicPageHero({ page, fallbackTitle, settings, variant = 'default' }) {
  const eyebrow = settingValue(settings, 'school_name');
  const title =
    (page?.title && String(page.title).trim()) ||
    (fallbackTitle && String(fallbackTitle).trim()) ||
    '';

  if (!title && !eyebrow) return null;

  switch (variant) {
    case 'staff':
      return (
        <header className="content-card staff-surface staff-surface--hero">
          {eyebrow ? <p className="staff-hero__eyebrow">{eyebrow}</p> : null}
          {title ? <h1 className="staff-hero__title">{title}</h1> : null}
        </header>
      );
    case 'fees':
      return (
        <header className="content-card fees-surface fees-surface--hero">
          {eyebrow ? <p className="fees-hero__eyebrow">{eyebrow}</p> : null}
          {title ? <h1 className="fees-hero__title">{title}</h1> : null}
        </header>
      );
    case 'admissions':
      return (
        <header className="admissions-hero admissions-hero--compact">
          <div className="admissions-hero__inner">
            <div className="admissions-hero__text">
              {eyebrow ? <p className="admissions-hero__eyebrow">{eyebrow}</p> : null}
              {title ? <h1 className="admissions-hero__title">{title}</h1> : null}
            </div>
          </div>
        </header>
      );
    case 'about':
      return (
        <header className="about-hero">
          <div className="about-hero__inner">
            {eyebrow ? <p className="about-hero__eyebrow">{eyebrow}</p> : null}
            {title ? <h1 className="about-hero__title">{title}</h1> : null}
          </div>
        </header>
      );
    case 'contact':
      return (
        <header className="contact-card contact-card--intro contact-card--hero">
          {eyebrow ? <p className="contact-page-eyebrow">{eyebrow}</p> : null}
          {title ? <h1 className="contact-page-title">{title}</h1> : null}
        </header>
      );
    case 'student-life':
      return (
        <header className="content-card sl-surface sl-surface--hero">
          {eyebrow ? <p className="sl-hero__eyebrow">{eyebrow}</p> : null}
          {title ? <h1 className="sl-hero__title">{title}</h1> : null}
        </header>
      );
    case 'privacy':
      return (
        <header className="content-card policy-surface policy-surface--hero">
          {eyebrow ? <p className="policy-hero__eyebrow">{eyebrow}</p> : null}
          {title ? (
            <h1 className="policy-hero__title">
              <i className="fas fa-shield-alt" aria-hidden /> {title}
            </h1>
          ) : null}
        </header>
      );
    case 'student-report':
      return (
        <header className="student-report-page-header">
          {eyebrow ? <p className="student-report-page-eyebrow">{eyebrow}</p> : null}
          {title ? <h1 className="student-report-page-title">{title}</h1> : null}
        </header>
      );
    default:
      return (
        <header className="public-page-hero public-page-hero--default">
          {eyebrow ? <p className="public-page-hero__eyebrow">{eyebrow}</p> : null}
          {title ? <h1 className="public-page-hero__title">{title}</h1> : null}
        </header>
      );
  }
}
