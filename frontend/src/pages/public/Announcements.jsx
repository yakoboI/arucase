/**
 * Announcements Page - Data from server (publicAPI.getAnnouncements)
 */
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { publicAPI } from '../../services/public';
import './Announcements.css';
import DOMPurify from 'dompurify';

const Announcements = () => {
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-announcements'],
    queryFn: () => publicAPI.getAnnouncements(50),
    select: (res) => res.data?.announcements || [],
    staleTime: 5 * 60 * 1000,
  });

  const announcements = data || [];
  const availableYears = useMemo(() => {
    const years = new Set();
    announcements.forEach((ann) => {
      if (ann.created_at) years.add(String(new Date(ann.created_at).getFullYear()));
    });
    return ['all', ...Array.from(years).sort((a, b) => Number(b) - Number(a))];
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    const q = search.trim().toLowerCase();
    return announcements.filter((ann) => {
      const annYear = ann.created_at ? String(new Date(ann.created_at).getFullYear()) : '';
      if (yearFilter !== 'all' && annYear !== yearFilter) return false;
      if (!q) return true;
      const hay = [ann.title, ann.content, ann.body].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [announcements, search, yearFilter]);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="announcements-page">
          <Link to="/" className="home-button">
            <i className={`fas ${location.pathname === '/' ? 'fa-home' : 'fa-arrow-left'}`}></i>
          </Link>
          <div className="content-card">
            <SkeletonLoader type="text" lines={1} width="40%" height="2rem" className="mb-3" />
            <SkeletonLoader type="text" lines={2} />
            <div style={{ marginTop: '1.5rem' }}>
              {[1, 2, 3].map((i) => (
                <SkeletonLoader key={i} type="card" height="80px" className="mb-3" />
              ))}
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="announcements-page">
        <Link to="/" className="home-button">
          <i className={`fas ${location.pathname === '/' ? 'fa-home' : 'fa-arrow-left'}`}></i>
        </Link>

        <div className="content-card">
          <div className="announcements-hero">
            <h1>Matangazo</h1>
            <p>Habari na matangazo mapya kutoka Seminari ya Kikatoliki Arusha.</p>
          </div>
          <div className="announcements-filters">
            <div className="announcement-input-wrap">
              <i className="fas fa-magnifying-glass" aria-hidden="true" />
              <input
                type="text"
                className="announcement-search"
                placeholder="Tafuta tangazo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Tafuta tangazo"
              />
            </div>
            <div className="announcement-select-wrap">
              <i className="fas fa-calendar" aria-hidden="true" />
              <select
                className="announcement-year-filter"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                aria-label="Chuja kwa mwaka"
              >
                {availableYears.map((year) => (
                  <option key={`announcement-${year}`} value={year}>
                    {year === 'all' ? 'Miaka yote' : year}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="announcements-toolbar-meta">
            <span className="results-chip">
              <i className="fas fa-list-ul" aria-hidden="true" /> Matokeo: {filteredAnnouncements.length}
            </span>
          </div>

          {isError ? (
            <p className="text-muted">Imeshindikana kupakia matangazo kwa sasa. Tafadhali jaribu tena baadaye.</p>
          ) : filteredAnnouncements.length === 0 ? (
            <p className="text-muted">Hakuna matangazo kwa sasa. Tafadhali tembelea tena baadaye.</p>
          ) : (
            <ul className="announcements-list">
              {filteredAnnouncements.map((ann) => (
                <li key={ann.id} className="announcement-card">
                  <div className="announcement-head">
                    <strong className="announcement-title">{ann.title || 'Tangazo'}</strong>
                    {ann.created_at ? (
                      <span className="announcement-date">
                        {new Date(ann.created_at).toLocaleDateString('sw-TZ')}
                      </span>
                    ) : null}
                  </div>
                  {ann.content ? (
                    <div className="announcement-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ann.content) }} />
                  ) : ann.body ? (
                    <p className="announcement-content">{ann.body}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default Announcements;
