/**
 * About Page — each section in its own card
 */
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import './About.css';

const CORE_VALUES = [
  { title: 'Imani', text: 'Kukuza uhusiano na Mungu kupitia sala na sakramenti', icon: 'fa-pray' },
  { title: 'Ubora wa Kitaaluma', text: 'Kutafuta maarifa kwa bidii na uadilifu', icon: 'fa-book-open' },
  { title: 'Nidhamu', text: 'Kukuza kujitawala na kuwajibika', icon: 'fa-balance-scale' },
  { title: 'Utumishi', text: 'Kumtumikia Mungu na wanadamu kwa unyenyekevu na upendo', icon: 'fa-hands-helping' },
  { title: 'Jumuiya', text: 'Kujenga undugu na umoja miongoni mwa wanafunzi wa seminari', icon: 'fa-users' },
];

const RELATED_LINKS = [
  { path: '/admissions', label: 'Udahili', sub: 'Admissions', icon: 'fa-user-plus' },
  { path: '/staff', label: 'Watumishi', sub: 'Staff', icon: 'fa-users' },
  { path: '/student-life', label: 'Maisha ya Wanafunzi', sub: 'Student life', icon: 'fa-heart' },
  { path: '/contact', label: 'Mawasiliano', sub: 'Contact', icon: 'fa-envelope' },
];

function AboutCard({ id, icon, title, intro, children, stripe, compact }) {
  return (
    <section
      className={`about-card${compact ? ' about-card--compact' : ''}${stripe ? ` about-card--stripe-${stripe}` : ''}`}
      aria-labelledby={id}
    >
      <div className="about-card__head">
        <span className="about-card__icon" aria-hidden>
          <i className={`fas ${icon}`} />
        </span>
        <h2 id={id} className="about-card__title">
          {title}
        </h2>
      </div>
      {intro ? <p className="about-card__intro">{intro}</p> : null}
      {children}
    </section>
  );
}

function AboutContentCards() {
  return (
    <>
      <div className="about-grid">
        <AboutCard
          id="about-intro-heading"
          icon="fa-school"
          title="Utangulizi"
          intro="Karibu katika familia ya Seminari ya Kikatoliki Arusha — kituo cha malezi ya wito na ubora wa kitaaluma."
          stripe="blue"
        >
          <p className="about-card__text">
            Seminari ya Kikatoliki Arusha ni shule ya sekondari ya Kikatoliki iliyoanzishwa mwaka 1967
            Oldonyosambu, Tanzania. Tunatoa elimu bora ya Kikatoliki na malezi ya kiroho kwa vijana wa
            kiume wanaotamani kulitumikia Kanisa na jamii. Tunafundisha{' '}
            <strong>Form I hadi Form VI</strong> (O-Level na A-Level).
          </p>
        </AboutCard>

        <AboutCard id="about-history-heading" icon="fa-landmark" title="Historia Yetu" stripe="slate">
          <p className="about-card__text">
            Seminari ilianzishwa mwaka <strong>1967</strong> ikiwa na dhamira ya kutoa elimu bora ya
            Kikatoliki na malezi ya kiroho. Kwa zaidi ya <strong>miongo mitano</strong>, tumekuwa
            tukilea akili na roho katikati ya Tanzania.
          </p>
        </AboutCard>

        <AboutCard id="about-mission-heading" icon="fa-bullseye" title="Dhamira Yetu" stripe="green">
          <p className="about-card__text about-card__text--highlight">
            Kuwajenga vijana wa kiume wawe wakomavu kiroho, wabora kitaaluma, na wenye maadili mema ili
            wawe viongozi wa baadaye katika Kanisa Katoliki na jamii kwa ujumla.
          </p>
        </AboutCard>

        <AboutCard id="about-vision-heading" icon="fa-eye" title="Maono Yetu" stripe="violet">
          <p className="about-card__text about-card__text--highlight">
            Kuwa kituo bora cha elimu ya seminari ya Kikatoliki kinachozalisha watu waliokamilika
            wanaoishi tunu za imani, maarifa, na utumishi.
          </p>
        </AboutCard>

        {/* Tunu za Msingi — section intro card */}
        <AboutCard
          id="about-values-heading"
          icon="fa-gem"
          title="Tunu za Msingi"
          intro="Maadili yanayoongoza kila hatua ya malezi katika seminari:"
          stripe="navy"
        />

        {/* Each tunu in its own card */}
        <div className="about-values-cards">
          {CORE_VALUES.map((v) => (
            <AboutCard
              key={v.title}
              id={`about-value-${v.title.toLowerCase().replace(/\s+/g, '-')}`}
              icon={v.icon}
              title={v.title}
              stripe="navy"
              compact
            >
              <p className="about-card__text">{v.text}</p>
            </AboutCard>
          ))}
        </div>

        <AboutCard id="about-patron-heading" icon="fa-cross" title="Mlinzi Wetu" stripe="gold">
          <p className="about-card__text">
            Seminari iko chini ya ulinzi wa <strong>Mtakatifu Thomas wa Akwino</strong> — mwalimu wa
            imani na akili, aliyeheshimiwa katika Kanisa Katoliki.
          </p>
        </AboutCard>
      </div>

      <section className="about-related" aria-labelledby="about-related-heading">
        <div className="about-related__inner">
          <h2 id="about-related-heading" className="about-related__title">
            Kurasa Zinazohusiana
          </h2>
          <div className="about-related__grid">
            {RELATED_LINKS.map((item) => (
              <Link key={item.path} to={item.path} className="about-related-card">
                <span className="about-related-card__icon" aria-hidden>
                  <i className={`fas ${item.icon}`} />
                </span>
                <span className="about-related-card__label">{item.label}</span>
                <span className="about-related-card__sub">{item.sub}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

const About = () => (
  <PublicLayout>
    <div className="about-page">
      <header className="about-hero">
        <div className="about-hero__inner">
          <p className="about-hero__eyebrow">Seminari ya Kikatoliki Arusha</p>
          <h1 className="about-hero__title">Kuhusu Sisi</h1>
          <p className="about-hero__lead">
            Historia, dhamira, maono, tunu za msingi, na mlinzi wetu — Oldonyosambu, Arusha, Tanzania.
          </p>
        </div>
      </header>

      <AboutContentCards />
    </div>
  </PublicLayout>
);

export default About;
