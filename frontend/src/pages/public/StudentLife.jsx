/**
 * Student Life Page — sharp cards, gray shell, centred page header
 */
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import './StudentLife.css';
import DOMPurify from 'dompurify';

const PageHeader = () => (
  <header className="student-life-page-header">
    <p className="student-life-page-eyebrow">Seminari ya Kikatoliki Arusha</p>
    <h1 className="student-life-page-title">Maisha ya Wanafunzi</h1>
    <p className="student-life-page-lead">
      Ratiba ya kila siku, malezi ya kiroho, na mazingira ya kujifunza na kukua katika jumuiya ya seminari.
    </p>
  </header>
);

const StudentLife = () => {
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['page', 'student-life'],
    queryFn: () => publicAPI.getPage('student-life'),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  const fallbackContent = (
    <div className="student-life-page">
      <PageHeader />

      <div className="student-life-inner">
        <section className="student-life-card" aria-labelledby="sl-routine-heading">
          <div className="student-life-card__head">
            <span className="student-life-card__icon" aria-hidden>
              <i className="fas fa-clock" />
            </span>
            <h2 id="sl-routine-heading" className="student-life-card__title">
              Ratiba ya Kila Siku
            </h2>
          </div>
          <p className="student-life-card__intro">
            Maisha ya seminari yanafuata ratiba iliyopangiliwa inayoweka uwiano kati ya sala, masomo, kazi na
            mapumziko:
          </p>
          <ul className="student-life-list">
            <li><strong>5:30 Asubuhi:</strong> Sala ya Asubuhi na Misa</li>
            <li><strong>7:00 Asubuhi:</strong> Kiamsha kinywa</li>
            <li><strong>8:00 Asubuhi - 1:00 Mchana:</strong> Vipindi vya masomo</li>
            <li><strong>1:00 Mchana:</strong> Chakula cha mchana</li>
            <li><strong>2:00 - 4:00 Mchana:</strong> Kujisomea / shughuli binafsi</li>
            <li><strong>4:00 - 6:00 Jioni:</strong> Michezo na mapumziko</li>
            <li><strong>6:30 Jioni:</strong> Chakula cha jioni</li>
            <li><strong>7:30 Jioni:</strong> Kujisomea jioni</li>
            <li><strong>9:00 Usiku:</strong> Sala ya usiku</li>
            <li><strong>10:00 Usiku:</strong> Kulala</li>
          </ul>
        </section>

        <section className="student-life-card" aria-labelledby="sl-spiritual-heading">
          <div className="student-life-card__head">
            <span className="student-life-card__icon" aria-hidden>
              <i className="fas fa-church" />
            </span>
            <h2 id="sl-spiritual-heading" className="student-life-card__title">
              Maisha ya Kiroho
            </h2>
          </div>
          <p className="student-life-card__intro">Malezi ya kiroho ndiyo msingi wa maisha ya seminari:</p>
          <ul className="student-life-list">
            <li>Misa ya kila siku na ibada ya Ekaristi</li>
            <li>Sala za asubuhi na jioni</li>
            <li>Kitubio cha kila wiki</li>
            <li>Uongozi wa kiroho na ushauri</li>
            <li>Mafungo na tafakari za kiroho</li>
          </ul>
        </section>

        <section className="student-life-card" aria-labelledby="sl-activities-heading">
          <div className="student-life-card__head">
            <span className="student-life-card__icon" aria-hidden>
              <i className="fas fa-users" />
            </span>
            <h2 id="sl-activities-heading" className="student-life-card__title">
              Shughuli za Ziada
            </h2>
          </div>
          <ul className="student-life-list">
            <li>Kwaya na huduma ya muziki</li>
            <li>Michezo (mpira wa miguu, mpira wa wavu, mpira wa kikapu)</li>
            <li>Tamthilia na maigizo</li>
            <li>Klabu ya mdahalo</li>
            <li>Uhifadhi wa mazingira</li>
            <li>Miradi ya huduma kwa jamii</li>
          </ul>
        </section>

        <section className="student-life-card student-life-card--wide" aria-labelledby="sl-facilities-heading">
          <div className="student-life-card__head">
            <span className="student-life-card__icon" aria-hidden>
              <i className="fas fa-building" />
            </span>
            <h2 id="sl-facilities-heading" className="student-life-card__title">
              Miundombinu na Huduma
            </h2>
          </div>
          <ul className="student-life-list student-life-list--columns">
            <li>Kanisa dogo na sehemu za sala</li>
            <li>Madarasa yenye vifaa vya kutosha</li>
            <li>Maktaba na maabara ya kompyuta</li>
            <li>Viwanja na kumbi za michezo</li>
            <li>Mabweni</li>
            <li>Ukumbi wa chakula</li>
            <li>Kituo cha afya</li>
          </ul>
        </section>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Inapakia ukurasa wa maisha ya wanafunzi..." />
      </PublicLayout>
    );
  }

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && page && (page.html_content || page.content);

  return (
    <PublicLayout>
      {hasCustomContent ? (
        <div className="student-life-page student-life-page--cms">
          <PageHeader />
          <article
            className="student-life-card student-life-card--prose content-card"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.html_content || page.content || '') }}
          />
        </div>
      ) : (
        fallbackContent
      )}
    </PublicLayout>
  );
};

export default StudentLife;
