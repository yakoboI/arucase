/**
 * NECTA Results Page - Full Content with Direct Links from Python Template
 */
import { useState, useEffect } from 'react';
import PublicLayout from '../../components/layout/PublicLayout';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import api from '../../services/api';
import './NECTAResults.css';

const NECTAResults = () => {
  const [activeTab, setActiveTab] = useState('form2');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [examType, setExamType] = useState('');
  const [year, setYear] = useState('');
  const [urlCache, setUrlCache] = useState({}); // Cache for custom URLs

  const SCHOOL_CODE = 'S0171'; // Arusha Catholic Seminary

  // Get NECTA URL - check custom URL first, then fallback to generated
  const getNECTAUrl = async (examTypeParam, yearParam) => {
    const cacheKey = `${examTypeParam}-${yearParam}`;
    
    // Check cache first
    if (urlCache[cacheKey]) {
      return urlCache[cacheKey];
    }
    
    try {
      // Try to get custom URL from database
      const res = await api.get(`/public/necta-url/${examTypeParam}/${yearParam}`);
      if (res.data.url) {
        setUrlCache((prev) => ({ ...prev, [cacheKey]: res.data.url }));
        return res.data.url;
      }
    } catch (err) {
      // If custom URL doesn't exist, fallback to generated
      console.log('No custom URL found, using generated URL');
    }
    
    // Fallback to generated URL
    const year = parseInt(yearParam);
    let generatedUrl;
    if (year >= 2020 && year <= 2021) {
      // Use TETEA archive for 2020 and 2021
      // CSEE uses lowercase s0171, FTNA and ACSEE use uppercase S0171
      const examUpper = examTypeParam.toUpperCase();
      const schoolCode = examTypeParam === 'csee' ? 's0171' : 'S0171';
      generatedUrl = `https://maktaba.tetea.org/exam-results/${examUpper}${year}/${schoolCode}.htm`;
    } else {
      // Use current NECTA system for 2022+
      // School code: 'S0171' for ftna, 's0171' for csee/acsee
      const schoolCode = examTypeParam === 'ftna' ? 'S0171' : 's0171';
      generatedUrl = `https://onlinesys.necta.go.tz/results/${yearParam}/${examTypeParam}/results/${schoolCode}.htm`;
    }
    
    setUrlCache((prev) => ({ ...prev, [cacheKey]: generatedUrl }));
    return generatedUrl;
  };

  const fetchResults = async (examTypeParam, yearParam) => {
    setLoading(true);
    setError('');
    setStats(null);
    setExamType(examTypeParam);
    setYear(yearParam);

    try {
      const res = await api.post('/public/necta-results', {
        exam_type: examTypeParam,
        year: yearParam
      });

      if (res.data.success) {
        setStats(res.data.stats);
      } else {
        setError(res.data.message || 'Could not fetch results from NECTA');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch results. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const generateYearButtons = () => {
    const currentYear = new Date().getFullYear();
    const endYear = currentYear + 2; // current + 1 (exclusive upper bound)
    
    // Determine start year based on active tab
    // Form II (ftna) and Form IV (csee): start from 2020
    // Form VI (acsee): start from 2026
    const startYear = activeTab === 'form6' ? 2026 : 2020;
    
    const years = [];
    for (let year = startYear; year < endYear; year++) {
      years.push(year);
    }
    return years;
  };

  const handleYearClick = async (examTypeParam, yearParam) => {
    // Get NECTA URL (custom or generated)
    const nectaUrl = await getNECTAUrl(examTypeParam, yearParam);
    window.open(nectaUrl, '_blank', 'noopener,noreferrer');
    
    // Also try to fetch stats in background (optional, won't break if it fails)
    // This is just for displaying summary stats, the direct link always works
    fetchResults(examTypeParam, yearParam).catch((err) => {
      // Silently fail - user can still access NECTA directly
      console.log('Stats fetch failed (non-critical):', err);
    });
  };

  const tabConfig = [
    { id: 'form2', examType: 'ftna', label: 'FTNA', sub: 'Form II' },
    { id: 'form4', examType: 'csee', label: 'CSEE', sub: 'Form IV' },
    { id: 'form6', examType: 'acsee', label: 'ACSEE', sub: 'Form VI' },
  ];
  const activeConfig = tabConfig.find(t => t.id === activeTab) || tabConfig[0];

  return (
    <PublicLayout>
      <div className="necta-results">
        <header className="necta-header">
          <h1 className="necta-title">NECTA Examination Results</h1>
        </header>

        <div className="necta-tabs">
          {tabConfig.map(({ id, label, sub }) => (
            <button
              key={id}
              type="button"
              className={`necta-tab ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <span className="necta-tab-label">{label}</span>
              <span className="necta-tab-sub">{sub}</span>
            </button>
          ))}
        </div>

        <section className="necta-year-section">
          <p className="necta-year-label">Year — {activeConfig.label}</p>
          <div className="necta-years">
            {generateYearButtons().map((y) => (
              <button
                key={y}
                type="button"
                className="necta-year-btn"
                onClick={() => handleYearClick(activeConfig.examType, y)}
                disabled={loading}
                title={`${y} results on NECTA`}
              >
                {y}
                <i className="fas fa-external-link-alt necta-year-icon" aria-hidden />
              </button>
            ))}
          </div>
        </section>

        {loading && (
          <div className="necta-loading">
            <div className="necta-stats-skeleton">
              <SkeletonLoader type="text" lines={1} width="60%" height="1.5rem" className="mb-2" />
              <div className="necta-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <SkeletonLoader key={i} type="card" height="60px" />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && !stats && (
          <div className="necta-note" role="status">
            <i className="fas fa-info-circle" aria-hidden />
            <span>Summary unavailable. Click any year above to view full results on NECTA.</span>
          </div>
        )}

        {stats && (
          <div className="necta-stats">
            <h2 className="necta-stats-title">{examType.toUpperCase()} {year} — Arusha Catholic Seminary</h2>
            <div className="necta-stats-grid">
              <div className="necta-stat necta-stat-total">
                <span className="necta-stat-label">Total</span>
                <span className="necta-stat-num">{stats.total_registered || 0}</span>
              </div>
              <div className="necta-stat necta-stat-div1"><span className="necta-stat-label">Div I</span><span className="necta-stat-num">{stats.division_i || 0}</span></div>
              <div className="necta-stat necta-stat-div2"><span className="necta-stat-label">Div II</span><span className="necta-stat-num">{stats.division_ii || 0}</span></div>
              <div className="necta-stat necta-stat-div3"><span className="necta-stat-label">Div III</span><span className="necta-stat-num">{stats.division_iii || 0}</span></div>
              <div className="necta-stat necta-stat-div4"><span className="necta-stat-label">Div IV</span><span className="necta-stat-num">{stats.division_iv || 0}</span></div>
              <div className="necta-stat necta-stat-div0"><span className="necta-stat-label">Div 0</span><span className="necta-stat-num">{stats.division_0 || 0}</span></div>
            </div>
            <a
              href="#"
              className="necta-open-btn"
              onClick={async (e) => {
                e.preventDefault();
                const url = await getNECTAUrl(examType, year);
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
            >
              <i className="fas fa-external-link-alt" aria-hidden /> Open on NECTA
            </a>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default NECTAResults;
