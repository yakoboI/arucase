/**
 * Catholic Education landing — calm layout, sharp framing, filtered fallback copy.
 */
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import './CatholicEducation.css';
import DOMPurify from 'dompurify';

const CatholicEducation = () => {
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['page', 'catholic-education'],
    queryFn: () => publicAPI.getPage('catholic-education'),
    retry: false,
    staleTime: 30 * 60 * 1000,
  });

  const fallbackContent = (
    <div className="catholic-education-page">
      <div className="catholic-education-page__shell">
        <header className="ce-hero">
          <h1 className="ce-hero__title">Elimu ya Kikatoliki — Jimbo Kuu la Arusha</h1>
          <p className="ce-hero__lede">
            Seminari ya Kikatoliki Arusha (Oldonyosambu): masomo ya sekondari (O-Level na A-Level) yaliyojikita katika
            malezi ya imani na maadili.
          </p>
          <ul className="ce-hero__stats" aria-label="Muhtasari">
            <li className="ce-hero__stat">
              <span className="ce-hero__stat-value">55+</span>
              <span className="ce-hero__stat-label">miaka</span>
            </li>
            <li className="ce-hero__stat">
              <span className="ce-hero__stat-value">5000+</span>
              <span className="ce-hero__stat-label">waliopita</span>
            </li>
            <li className="ce-hero__stat">
              <span className="ce-hero__stat-value">100%</span>
              <span className="ce-hero__stat-label">malezi ya Kikatoliki</span>
            </li>
          </ul>
        </header>

        <div className="ce-stack">
          <section className="ce-panel content-card">
            <h2 className="ce-panel__title">Dhamira</h2>
            <p className="ce-panel__text">
              Tunatoa elimu bora ya kitaaluma pamoja na malezi ya kiroho ili vijana wawe na maadili, uongozi, na utumishi
              katika Kanisa na jamii.
            </p>
            <ul className="ce-pill-list">
              <li className="ce-pill">Elimu ya juu</li>
              <li className="ce-pill">Sala na misa</li>
              <li className="ce-pill">Jumuiya</li>
              <li className="ce-pill">Masomo ya Kikatoliki</li>
            </ul>
          </section>

          <section className="ce-panel content-card">
            <h2 className="ce-panel__title">Programu</h2>
            <div className="ce-programs">
              <div className="ce-program">
                <h3 className="ce-program__name">O-Level (Kidato I–IV)</h3>
                <p className="ce-program__intro">Msingi wa masomo na NECTA CSEE.</p>
                <ul className="ce-program__list">
                  <li>Sayansi: Biology, Chemistry, Physics</li>
                  <li>Msingi: Hisabati, Kiingereza, Kiswahili</li>
                  <li>Jamii: Historia, Jiografia, Siasa</li>
                  <li>Dini na malezi ya Kikatoliki</li>
                </ul>
              </div>
              <div className="ce-program">
                <h3 className="ce-program__name">A-Level (Kidato V–VI)</h3>
                <p className="ce-program__intro">Maandalizi ya ACSEE na chuo kikuu.</p>
                <ul className="ce-program__list">
                  <li>Sayansi: PCM, PCB</li>
                  <li>Biashara: EGM</li>
                  <li>Sanaa: HGL, HKL</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="ce-panel content-card">
            <h2 className="ce-panel__title">Maisha ya seminari</h2>
            <div className="ce-life">
              <div className="ce-life__block">
                <h3 className="ce-life__heading">Ratiba (mfano)</h3>
                <p className="ce-life__text">
                  Sala asubuhi · Misa · Masomo · Michezo / mapumziko · Sala jioni — ratiba kamili hutolewa ofisini.
                </p>
              </div>
              <div className="ce-life__block">
                <h3 className="ce-life__heading">Huduma</h3>
                <p className="ce-life__text">Chakula, michezo ya ndani na nje, na programu za kiroho kila wiki.</p>
              </div>
            </div>
          </section>

          <section className="ce-panel content-card">
            <h2 className="ce-panel__title">Vigezo vya kujiunga</h2>
            <div className="ce-admit">
              <div className="ce-admit__col">
                <h3 className="ce-admit__subtitle">Msingi</h3>
                <ul className="ce-admit__ul">
                  <li>Cheti cha ubatizo (Kanisa Katoliki)</li>
                  <li>Matokeo na taarifa kutoka shule</li>
                  <li>Barua kutoka padre wa parokia</li>
                  <li>Umri unaofaa (kwa maelezo — ofisi ya udahili)</li>
                </ul>
              </div>
              <div className="ce-admit__col">
                <h3 className="ce-admit__subtitle">Kiroho na tabia</h3>
                <ul className="ce-admit__ul">
                  <li>Mkristo wa Kikatoliki</li>
                  <li>Tabia na maadili mema</li>
                  <li>Ripoti na mapendekezo ya shule/parokia</li>
                </ul>
              </div>
            </div>
            <div className="cta-section">
              <Link to="/admissions/apply" className="cta-button primary">
                Maombi ya udahili
              </Link>
              <Link to="/contact" className="cta-button secondary">
                Mawasiliano
              </Link>
            </div>
          </section>

          <nav className="ce-related" aria-label="Kurasa zinazohusiana">
            <h2 className="ce-related__title">Endelea kusoma</h2>
            <div className="ce-related__links">
              <Link to="/admissions" className="related-link">Udahili</Link>
              <Link to="/about" className="related-link">Kuhusu sisi</Link>
              <Link to="/staff" className="related-link">Watumishi</Link>
              <Link to="/student-life" className="related-link">Maisha ya wanafunzi</Link>
              <Link to="/contact" className="related-link">Mawasiliano</Link>
              <Link to="/gallery" className="related-link">Picha</Link>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Inapakia..." />
      </PublicLayout>
    );
  }

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && page && (page.html_content || page.content);

  return (
    <PublicLayout>
      {isError ? (
        <div className="catholic-education-page catholic-education-page--error">
          <div className="catholic-education-page__shell">
            <p className="ce-error__text">Samahani, kuna tatizo. Tafadhali jaribu tena baadaye.</p>
            <Link to="/" className="back-link">
              Nyumbani
            </Link>
          </div>
        </div>
      ) : hasCustomContent ? (
        <div className="catholic-education-page">
          <div className="catholic-education-page__shell">
            <article
              className="content-card ce-prose"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(page.html_content || page.content || ''),
              }}
            />
          </div>
        </div>
      ) : (
        fallbackContent
      )}
    </PublicLayout>
  );
};

export default CatholicEducation;
