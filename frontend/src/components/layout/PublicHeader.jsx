import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicAPI } from '../../services/public';
import { resolveStaticUrl } from '../../utils/backendUrl';
import {
  PUBLIC_HOME_ITEM,
  PUBLIC_NAV_CATEGORIES,
  getCategoryMenuId,
} from '../../constants/publicSiteNav';
import './PublicHeader.css';

const PublicHeader = () => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const location = useLocation();

  const { data: homepageData } = useQuery({
    queryKey: ['homepage'],
    queryFn: async () => {
      try {
        const res = await publicAPI.getHomepage();
        return res.data;
      } catch (err) {
        console.error('Error fetching homepage data in header:', err);
        return { settings: {} };
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const settings = homepageData?.settings || {};
  const schoolName = settings?.school_name || 'ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU';
  const tagline = settings?.tagline || 'Catholic Minor Preparatory Seminary In Arusha Tanzania';
  const bannerText = settings?.banner_text || 'ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU TANZANIA SINCE 1967';
  const schoolLogo = settings?.school_logo || '/uploads/photos/9749b4af-7e1c-454b-a482-37a0f64162f1.jpg';
  const patronSaintImage = settings?.patron_saint_image;

  const getImageUrl = (path) => (path ? resolveStaticUrl(path) : null);

  const isActive = useCallback(
    (path) => {
      if (path === '/') {
        return location.pathname === '/';
      }
      if (path === '/student-report') {
        const p = location.pathname;
        return (
          p === '/student-report' ||
          p === '/student-login' ||
          p.startsWith('/student/')
        );
      }
      return location.pathname === path || location.pathname.startsWith(path + '/');
    },
    [location.pathname]
  );

  const isCategoryActive = (category) => category.items.some((item) => isActive(item.path));

  const toggleDropdown = (id) => {
    setOpenDropdown((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    if (!openDropdown) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest('.nav-category-wrapper')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDropdown]);

  useEffect(() => {
    if (!openDropdown) return;
    const menuId = getCategoryMenuId(openDropdown);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
        return;
      }
      const menu = document.getElementById(menuId);
      if (!menu) return;
      const links = [...menu.querySelectorAll('a[role="menuitem"]')];
      if (!links.length) return;
      const currentIndex = links.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = currentIndex < links.length - 1 ? currentIndex + 1 : 0;
        links[next]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : links.length - 1;
        links[prev]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        links[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        links[links.length - 1]?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openDropdown]);

  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname]);

  const getPrefetchHandler = (path) => {
    if (path === '/gallery') return () => { import('../../pages/public/Gallery'); };
    if (path === '/student-report') return () => { import('../../pages/public/StudentReport'); };
    if (path === '/student-login') return () => { import('../../pages/public/StudentLogin'); };
    if (path === '/login') return () => { import('../../pages/auth/Login'); };
    return undefined;
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="school-branding">
          <div className="school-info">
            <h1>{schoolName}</h1>

            <div
              className="school-info__visual-row"
              role="group"
              aria-label="Nembo, maelezo ya seminari na somo la seminari"
            >
              <div className="school-crest">
                {schoolLogo ? (
                  <figure className="header-tropical-frame">
                    <div className="header-tropical-frame__leaf header-tropical-frame__leaf--tl" aria-hidden />
                    <div className="header-tropical-frame__leaf header-tropical-frame__leaf--br" aria-hidden />
                    <div className="header-tropical-frame__wood">
                      <div className="header-tropical-frame__mat">
                        <img
                          src={getImageUrl(schoolLogo)}
                          alt="Arusha Catholic Seminary official school logo"
                          className="header-tropical-frame__img header-tropical-frame__img--logo"
                          loading="eager"
                        />
                      </div>
                    </div>
                  </figure>
                ) : (
                  <i className="fas fa-school" aria-hidden />
                )}
              </div>

              <div className="school-info__motto">
                <p className="tagline">{tagline}</p>
                <div className="banner">{bannerText}</div>
              </div>

              <div className="patron-saint">
                {patronSaintImage ? (
                  <figure className="header-tropical-frame header-tropical-frame--patron">
                    <div className="header-tropical-frame__leaf header-tropical-frame__leaf--tr" aria-hidden />
                    <div className="header-tropical-frame__leaf header-tropical-frame__leaf--bl" aria-hidden />
                    <div className="header-tropical-frame__wood">
                      <div className="header-tropical-frame__mat">
                        <img
                          src={getImageUrl(patronSaintImage)}
                          alt="Picha ya somo wa seminari"
                          className="header-tropical-frame__img header-tropical-frame__img--patron"
                          loading="eager"
                        />
                      </div>
                    </div>
                  </figure>
                ) : (
                  <>
                    <i className="fas fa-user-circle" aria-hidden />
                    <span className="saint-label">Somo wa Seminari</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <nav className="navigation" aria-label="Urambazaji mkuu">
          <div className="nav-container">
            <ul className="nav-links">
              <li>
                <Link
                  to={PUBLIC_HOME_ITEM.path}
                  className={`${isActive(PUBLIC_HOME_ITEM.path) ? 'active' : ''} icon-only nav-link-home`}
                  aria-label={PUBLIC_HOME_ITEM.label}
                >
                  <i className={`fas ${PUBLIC_HOME_ITEM.icon}`} aria-hidden="true" />
                </Link>
              </li>
              {PUBLIC_NAV_CATEGORIES.map((category) => {
                const menuId = getCategoryMenuId(category.id);
                const isOpen = openDropdown === category.id;
                return (
                  <li key={category.id} className="nav-category-wrapper">
                    <button
                      type="button"
                      className={`nav-category-btn ${isCategoryActive(category) ? 'category-active' : ''} ${isOpen ? 'open' : ''}`}
                      onClick={() => toggleDropdown(category.id)}
                      aria-expanded={isOpen}
                      aria-haspopup="true"
                      aria-controls={menuId}
                      id={`${menuId}-button`}
                    >
                      <i className={`fas ${category.icon}`} aria-hidden="true" />
                      <span className="nav-link-text">{category.label}</span>
                      <i
                        className={`fas fa-chevron-down nav-category-chevron ${isOpen ? 'rotated' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                    {isOpen && (
                      <ul
                        className="nav-category-dropdown"
                        id={menuId}
                        role="menu"
                        aria-labelledby={`${menuId}-button`}
                      >
                        {category.items.map((item) => (
                          <li key={item.path} role="none">
                            <Link
                              to={item.path}
                              className={isActive(item.path) ? 'active' : ''}
                              onClick={() => setOpenDropdown(null)}
                              onMouseEnter={getPrefetchHandler(item.path)}
                              role="menuitem"
                            >
                              <i className={`fas ${item.icon}`} aria-hidden="true" />
                              <span className="nav-dropdown-item__text">
                                <span className="nav-dropdown-item__label">{item.label}</span>
                                {item.subLabel ? (
                                  <span className="nav-dropdown-item__sub">{item.subLabel}</span>
                                ) : null}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default PublicHeader;

