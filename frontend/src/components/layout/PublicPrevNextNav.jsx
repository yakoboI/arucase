import { Link, useLocation } from 'react-router-dom';
import {
  PUBLIC_SITE_NAV_ORDER,
  PUBLIC_HOME_PATH,
  getPublicNavIndex,
} from '../../constants/publicSiteNavOrder';
import './PublicPrevNextNav.css';

const PublicPrevNextNav = () => {
  const { pathname } = useLocation();

  if (pathname === PUBLIC_HOME_PATH) {
    return null;
  }

  const index = getPublicNavIndex(pathname);
  if (index === -1) {
    return null;
  }

  const prev =
    index === 0
      ? { path: PUBLIC_HOME_PATH, label: 'Nyumbani' }
      : PUBLIC_SITE_NAV_ORDER[index - 1];
  const next =
    index < PUBLIC_SITE_NAV_ORDER.length - 1
      ? PUBLIC_SITE_NAV_ORDER[index + 1]
      : null;

  return (
    <nav className="public-prev-next-nav" aria-label="Urambazaji wa kurasa">
      <div className="public-prev-next-nav__inner">
        <Link
          className="public-prev-next-nav__btn public-prev-next-nav__btn--prev"
          to={prev.path}
          title={prev.label}
        >
          <span className="public-prev-next-nav__row">
            <i className="fas fa-chevron-left" aria-hidden="true" />
            <span className="public-prev-next-nav__label">Nyuma</span>
          </span>
          <span className="public-prev-next-nav__hint">{prev.label}</span>
        </Link>
        {next ? (
          <Link
            className="public-prev-next-nav__btn public-prev-next-nav__btn--next"
            to={next.path}
            title={next.label}
          >
            <span className="public-prev-next-nav__row">
              <span className="public-prev-next-nav__label">Mbele</span>
              <i className="fas fa-chevron-right" aria-hidden="true" />
            </span>
            <span className="public-prev-next-nav__hint">{next.label}</span>
          </Link>
        ) : (
          <span
            className="public-prev-next-nav__btn public-prev-next-nav__btn--next public-prev-next-nav__btn--disabled"
            aria-disabled="true"
          >
            <span className="public-prev-next-nav__row">
              <span className="public-prev-next-nav__label">Mbele</span>
              <i className="fas fa-chevron-right" aria-hidden="true" />
            </span>
            <span className="public-prev-next-nav__hint">Mwisho wa urambazaji</span>
          </span>
        )}
      </div>
    </nav>
  );
};

export default PublicPrevNextNav;
