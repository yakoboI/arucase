/**
 * Admissions Page — card-based layout (fallback + CMS HTML)
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import './Admissions.css';
import DOMPurify from 'dompurify';

const AdmissionsHero = ({ variant = 'full', settings }) => (
  <header className={`admissions-hero admissions-hero--${variant}`}>
    <div className="admissions-hero__inner">
      {variant === 'full' && (
        <div className="admissions-hero__text">
          <p className="admissions-hero__eyebrow">Seminari ya Kikatoliki Arusha</p>
          <h1 className="admissions-hero__title">Udahili</h1>
          <p className="admissions-hero__lead">
            Seminari inapokea vijana wa kiume wenye nia ya kweli ya malezi ya wito na ubora wa
            kitaaluma. Chagua hatua inayofuata ili uanze safari yako.
          </p>
        </div>
      )}
      {variant === 'compact' && (
        <div className="admissions-hero__text">
          <p className="admissions-hero__lead admissions-hero__lead--solo">
            Maombi ya kujiunga yanapatikana mtandaoni. Soma maelezo hapa chini, kisha jaza fomu ya
            maombi.
          </p>
        </div>
      )}
      <div className="admissions-hero__cta">
        <Link to="/admissions/apply" className="admissions-apply-button">
          <i className="fas fa-pen-to-square" aria-hidden />
          BOFYA HAPA KUJISAJILI
        </Link>
        {settings?.contact_phone && (
          <a href={`tel:${settings.contact_phone}`} className="admissions-hero__phone">
            <i className="fas fa-phone" aria-hidden />
            {settings.contact_phone}
          </a>
        )}
      </div>
    </div>
  </header>
);

const Admissions = () => {
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['page', 'admissions'],
    queryFn: () => publicAPI.getPage('admissions'),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  const { data: settings } = useQuery({
    queryKey: ['homepage'],
    queryFn: () => publicAPI.getHomepage(),
    select: (res) => res.data?.settings,
    staleTime: 10 * 60 * 1000,
  });

  const email = settings?.contact_email || 'info@arushacatholicseminary.co.tz';
  const phone = settings?.contact_phone || '+255 123 456 789';

  const fallbackContent = (
    <div className="admissions-page">
      <AdmissionsHero variant="full" settings={settings} />

      <div className="admissions-grid">
        <section className="admissions-card" aria-labelledby="admissions-criteria-heading">
          <div className="admissions-card__head">
            <span className="admissions-card__icon" aria-hidden>
              <i className="fas fa-clipboard-check" />
            </span>
            <h2 id="admissions-criteria-heading" className="admissions-card__title">
              Vigezo vya Udahili
            </h2>
          </div>
          <p className="admissions-card__intro">
            Hivi ni nyaraka na vigezo vya msingi unavyohitaji kabla ya kuwasilisha maombi:
          </p>
          <ul className="admissions-checklist">
            <li>Cheti cha ubatizo kutoka Kanisa Katoliki</li>
            <li>Nakala ya matokeo ya masomo kutoka shule aliyosoma</li>
            <li>Barua ya utambulisho kutoka kwa padre wa parokia</li>
            <li>Cheti cha uchunguzi wa afya</li>
            <li>Cheti cha kuzaliwa au kitambulisho halali</li>
            <li>Picha ndogo za pasipoti (nakala 4)</li>
          </ul>
        </section>

        <section className="admissions-card" aria-labelledby="admissions-process-heading">
          <div className="admissions-card__head">
            <span className="admissions-card__icon" aria-hidden>
              <i className="fas fa-route" />
            </span>
            <h2 id="admissions-process-heading" className="admissions-card__title">
              Utaratibu wa Maombi
            </h2>
          </div>
          <p className="admissions-card__intro">
            <strong>Jibu:</strong> Ili kuomba kujiunga na Seminari ya Kikatoliki Arusha, fuata hatua hizi 6:
          </p>
          <ol className="admissions-steps">
            <li>
              <span className="admissions-steps__num">1</span>
              <span>
                <strong>Pata Fomu ya Maombi:</strong> Pakua mtandaoni au chukua ofisini seminari
              </span>
            </li>
            <li>
              <span className="admissions-steps__num">2</span>
              <span>
                <strong>Jaza Fomu ya Maombi:</strong> Jaza taarifa zote zinazohitajika kwa usahihi
              </span>
            </li>
            <li>
              <span className="admissions-steps__num">3</span>
              <span>
                <strong>Wasilisha Nyaraka:</strong> Wasilisha nyaraka zote zinazotakiwa pamoja na fomu yako
              </span>
            </li>
            <li>
              <span className="admissions-steps__num">4</span>
              <span>
                <strong>Mtihani wa Kuingia:</strong> Hudhuria mtihani wa kuingia uliopangwa
              </span>
            </li>
            <li>
              <span className="admissions-steps__num">5</span>
              <span>
                <strong>Mahojiano:</strong> Shiriki mahojiano na kamati ya udahili
              </span>
            </li>
            <li>
              <span className="admissions-steps__num">6</span>
              <span>
                <strong>Uamuzi wa Udahili:</strong> Pokea taarifa ya matokeo ya maombi yako
              </span>
            </li>
          </ol>
        </section>

        <section className="admissions-card admissions-card--span-wide" aria-labelledby="admissions-dates-heading">
          <div className="admissions-card__head">
            <span className="admissions-card__icon" aria-hidden>
              <i className="fas fa-calendar-days" />
            </span>
            <h2 id="admissions-dates-heading" className="admissions-card__title">
              Tarehe Muhimu
            </h2>
          </div>
          <div className="admissions-timeline">
            <div className="admissions-timeline__item">
              <span className="admissions-timeline__label">Kipindi cha Maombi</span>
              <span className="admissions-timeline__value">Januari – Machi</span>
            </div>
            <div className="admissions-timeline__item">
              <span className="admissions-timeline__label">Mitihani ya Kuingia</span>
              <span className="admissions-timeline__value">Aprili</span>
            </div>
            <div className="admissions-timeline__item">
              <span className="admissions-timeline__label">Mahojiano</span>
              <span className="admissions-timeline__value">Mei</span>
            </div>
            <div className="admissions-timeline__item">
              <span className="admissions-timeline__label">Barua za Udahili</span>
              <span className="admissions-timeline__value">Juni</span>
            </div>
            <div className="admissions-timeline__item">
              <span className="admissions-timeline__label">Mafunzo ya Utangulizi</span>
              <span className="admissions-timeline__value">Mwishoni mwa Juni</span>
            </div>
            <div className="admissions-timeline__item">
              <span className="admissions-timeline__label">Mwaka wa Masomo Unaaza</span>
              <span className="admissions-timeline__value">Julai</span>
            </div>
          </div>
        </section>

        <section className="admissions-card admissions-card--contact" aria-labelledby="admissions-contact-heading">
          <div className="admissions-card__head">
            <span className="admissions-card__icon" aria-hidden>
              <i className="fas fa-address-card" />
            </span>
            <h2 id="admissions-contact-heading" className="admissions-card__title">
              Ofisi ya Udahili
            </h2>
          </div>
          <p className="admissions-card__intro">
            Kwa maelezo zaidi kuhusu udahili, wasiliana nasi kwa njia yoyote inayokufaa:
          </p>
          <ul className="admissions-contact-list">
            <li>
              <span className="admissions-contact-list__key">Barua pepe</span>
              <a href={`mailto:${email}`} className="admissions-contact-list__link">
                {email}
              </a>
            </li>
            <li>
              <span className="admissions-contact-list__key">Simu</span>
              <a href={`tel:${phone}`} className="admissions-contact-list__link">
                {phone}
              </a>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Inapakia ukurasa wa udahili..." />
      </PublicLayout>
    );
  }

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && page && (page.html_content || page.content);

  return (
    <PublicLayout>
      {hasCustomContent ? (
        <div className="admissions-page admissions-page--cms">
          <AdmissionsHero variant="compact" settings={settings} />
          <article
            className="admissions-card admissions-card--prose content-card"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(page.html_content || page.content || ''),
            }}
          />
        </div>
      ) : (
        fallbackContent
      )}
    </PublicLayout>
  );
};

export default Admissions;
