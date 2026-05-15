/**
 * Announcements page — immersive shell + sharp cards (aligned with /school-fee, /student-life)
 */
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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

  useEffect(() => {
    if (isLoading) return;
    const id = location.hash?.replace(/^#/, '').trim();
    if (!id) return;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => window.clearTimeout(t);
  }, [isLoading, location.hash, filteredAnnouncements.length]);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="announcements-page announcements-page--immersive">
          <div className="announcements-page__bg" aria-hidden />
          <div className="announcements-page__inner">
            <div className="content-card announcements-surface announcements-surface--hero">
              <SkeletonLoader type="text" lines={1} width="45%" height="1.75rem" className="mb-2" />
              <SkeletonLoader type="text" lines={2} width="90%" />
            </div>
            <div className="content-card announcements-surface announcements-surface--filters">
              <SkeletonLoader type="text" lines={1} height="2.75rem" className="mb-2" />
              <SkeletonLoader type="text" lines={1} height="2.75rem" />
            </div>
            <div className="announcements-skeleton-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonLoader key={i} type="card" height="120px" />
              ))}
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="announcements-page announcements-page--immersive">
        <div className="announcements-page__bg" aria-hidden />
        <div className="announcements-page__inner">
          <header className="content-card announcements-surface announcements-surface--hero">
            <p className="announcements-hero__eyebrow">Seminari ya Kikatoliki Arusha</p>
            <h1 className="announcements-hero__title">Matangazo</h1>
            <p className="announcements-hero__lead">
              Habari na matangazo mapya — tafuta au chuja kwa mwaka.
            </p>
          </header>

          <section className="content-card announcements-surface announcements-surface--filters">
            <div className="announcements-filters">
              <div className="announcement-input-wrap">
                <i className="fas fa-search" aria-hidden="true" />
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
          </section>

          {isError ? (
            <div className="content-card announcements-surface announcements-surface--notice">
              <p className="announcements-notice__text">
                Imeshindikana kupakia matangazo kwa sasa. Tafadhali jaribu tena baadaye.
              </p>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="content-card announcements-surface announcements-surface--notice">
              <p className="announcements-notice__text">
                Hakuna matangazo kwa sasa. Tafadhali tembelea tena baadaye.
              </p>
            </div>
          ) : (
            <ul className="announcements-list">
              {filteredAnnouncements.map((ann, idx) => (
                <li
                  key={ann.id}
                  id={ann.id != null ? String(ann.id) : undefined}
                  className={`announcement-card announcement-card--stripe-${idx % 4}`}
                >
                  <div className="announcement-head">
                    <strong className="announcement-title">{ann.title || 'Tangazo'}</strong>
                    {ann.created_at ? (
                      <span className="announcement-date">
                        {new Date(ann.created_at).toLocaleDateString('sw-TZ')}
                      </span>
                    ) : null}
                  </div>
                  {ann.content ? (
                    <div
                      className="announcement-content"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ann.content) }}
                    />
                  ) : ann.body ? (
                    <p className="announcement-content announcement-content--plain">{ann.body}</p>
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
