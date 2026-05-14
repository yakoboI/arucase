import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicAPI } from '../../services/public';
import { resolveStaticUrl } from '../../utils/backendUrl';
import './PublicHeader.css';

const PublicHeader = () => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const location = useLocation();

  // Fetch settings for dynamic content
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

  // Navigation: Home standalone + 3 category dropdowns
  const homeItem = { path: '/', label: 'Nyumbani', icon: 'fa-home' };

  const navCategories = [
    {
      id: 'shule',
      label: 'Shule Yetu',
      icon: 'fa-school',
      items: [
        { path: '/about', label: 'Kuhusu Sisi', icon: 'fa-info-circle' },
        { path: '/staff', label: 'Watumishi', icon: 'fa-users' },
        { path: '/necta-results', label: 'Matokeo ya NECTA', icon: 'fa-certificate' },
        { path: '/contact', label: 'Mawasiliano', icon: 'fa-envelope' },
      ],
    },
    {
      id: 'wanafunzi',
      label: 'Wanafunzi',
      icon: 'fa-graduation-cap',
      items: [
        { path: '/admissions', label: 'Udahili', icon: 'fa-user-plus' },
        { path: '/student-life', label: 'Maisha ya Wanafunzi', icon: 'fa-heart' },
        { path: '/student-login', label: 'Ripoti za Mwanafunzi', icon: 'fa-file-alt' },
        { path: '/school-fee', label: 'Ada ya Shule', icon: 'fa-money-bill-wave' },
      ],
    },
    {
      id: 'habari',
      label: 'Habari',
      icon: 'fa-newspaper',
      items: [
        { path: '/gallery', label: 'Picha', icon: 'fa-images' },
        { path: '/announcements', label: 'Matangazo', icon: 'fa-bullhorn' },
      ],
    },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isCategoryActive = (category) =>
    category.items.some((item) => isActive(item.path));

  const toggleDropdown = (id) => {
    setOpenDropdown((prev) => (prev === id ? null : id));
  };

  // Close dropdown on outside click
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

  // Close menus on route change
  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname]);

  // Prefetch likely next pages on hover for faster navigation (fast-loading plan)
  const getPrefetchHandler = (path) => {
    if (path === '/gallery') return () => { import('../../pages/public/Gallery'); };
    if (path === '/student-login') return () => { import('../../pages/public/StudentLogin'); };
    if (path === '/login') return () => { import('../../pages/auth/Login'); };
    return undefined;
  };

  return (
    <header className="header">
      <div className="header-content">
        {/* School Branding Section */}
        <div className="school-branding">
          <div className="school-info">
            {/* School name — above crest, motto, and patron */}
            <h1>{schoolName}</h1>

            <div
              className="school-info__visual-row"
              role="group"
              aria-label="Nembo, maelezo ya seminari na somo la seminari"
            >
              {/* School Crest/Logo */}
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
                  <i className="fas fa-school"></i>
                )}
              </div>

              <div className="school-info__motto">
                <p className="tagline">{tagline}</p>
                <div className="banner">{bannerText}</div>
              </div>

              {/* Patron Saint */}
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
                    <i className="fas fa-user-circle"></i>
                    <span className="saint-label">Somo wa Seminari</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="navigation">
          <div className="nav-container">
            <ul className="nav-links">
              <li>
                <Link
                  to={homeItem.path}
                  className={`${isActive(homeItem.path) ? 'active' : ''} icon-only nav-link-home`}
                  aria-label={homeItem.label}
                >
                  <i className={`fas ${homeItem.icon}`} aria-hidden="true"></i>
                </Link>
              </li>
              {navCategories.map((category) => (
                <li key={category.id} className="nav-category-wrapper">
                  <button
                    type="button"
                    className={`nav-category-btn ${isCategoryActive(category) ? 'category-active' : ''} ${openDropdown === category.id ? 'open' : ''}`}
                    onClick={() => toggleDropdown(category.id)}
                    aria-expanded={openDropdown === category.id}
                    aria-haspopup="true"
                  >
                    <i className={`fas ${category.icon}`}></i>
                    <span className="nav-link-text">{category.label}</span>
                    <i className={`fas fa-chevron-down nav-category-chevron ${openDropdown === category.id ? 'rotated' : ''}`}></i>
                  </button>
                  {openDropdown === category.id && (
                    <ul className="nav-category-dropdown" role="menu">
                      {category.items.map((item) => (
                        <li key={item.path} role="none">
                          <Link
                            to={item.path}
                            className={isActive(item.path) ? 'active' : ''}
                            onClick={() => setOpenDropdown(null)}
                            onMouseEnter={getPrefetchHandler(item.path)}
                            role="menuitem"
                          >
                            <i className={`fas ${item.icon}`}></i>
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default PublicHeader;
