/**
 * Fees Page — grey immersive shell, sharp multi-card layout (CMS or fallback)
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import { prepareSchoolFeeHtml } from './feesCms';
import './Fees.css';

const Fees = () => {
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['page', 'school-fee'],
    queryFn: () => publicAPI.getPage('school-fee'),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  const { data: settings } = useQuery({
    queryKey: ['homepage'],
    queryFn: () => publicAPI.getHomepage(),
    select: (res) => res.data?.settings,
    staleTime: 10 * 60 * 1000,
  });

  const contactEmail = settings?.contact_email || 'info@arushacatholicseminary.co.tz';
  const contactPhone = settings?.contact_phone || '+255 123 456 789';

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && page && (page.html_content || page.content);
  const preparedFees = useMemo(() => prepareSchoolFeeHtml(page ?? null), [page?.html_content, page?.content]);

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Inapakia ukurasa wa ada…" />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="fees-page fees-page--immersive">
        <div className="fees-page__bg" aria-hidden />
        <div className="fees-page__inner">
          <header className="content-card fees-surface fees-surface--hero">
            <p className="fees-hero__eyebrow">Seminari ya Kikatoliki Arusha</p>
            <h1 className="fees-hero__title">Ada ya shule</h1>
            <p className="fees-hero__lead">
              Muundo wa malipo, ratiba, njia za kulipa, na mawasiliano — taarifa rasmi zinazosasishwa na ofisi ya
              utawala.
            </p>
          </header>

          {hasCustomContent ? (
            preparedFees.variant === 'grid' ? (
              <div className="fees-cms-grid-host" dangerouslySetInnerHTML={{ __html: preparedFees.html }} />
            ) : (
              <article
                className="content-card fees-surface fees-surface--cms"
                dangerouslySetInnerHTML={{ __html: preparedFees.html }}
              />
            )
          ) : (
            <div className="fees-grid">
              <section
                className="content-card fees-surface fees-surface--chunk fees-surface--stripe-navy"
                aria-labelledby="fees-overview-heading"
              >
                <div className="fees-card__head">
                  <span className="fees-card__icon" aria-hidden>
                    <i className="fas fa-info-circle" />
                  </span>
                  <h2 id="fees-overview-heading" className="fees-card__title">
                    Muundo wa ada
                  </h2>
                </div>
                <p className="fees-chunk__text">
                  <strong>Jibu:</strong> Ada za Seminari ya Kikatoliki Arusha zinajumuisha masomo, malazi, chakula, vifaa
                  vya kujifunzia, huduma za afya, programu za malezi ya kiroho, na shughuli za ziada. Malipo yanaweza
                  kufanywa kwa mara moja, kwa muhula, au kwa awamu za kila mwezi.
                </p>
              </section>

              <section
                className="content-card fees-surface fees-surface--chunk fees-surface--stripe-slate"
                aria-labelledby="fees-annual-heading"
              >
                <div className="fees-card__head">
                  <span className="fees-card__icon" aria-hidden>
                    <i className="fas fa-calendar-check" />
                  </span>
                  <h2 id="fees-annual-heading" className="fees-card__title">
                    Ada ya mwaka
                  </h2>
                </div>
                <p className="fees-chunk__text">
                  Seminari inajitahidi kudumisha ada zinazomudu kwa wazazi huku ikihakikisha ubora wa elimu na malezi.
                  Muundo wa ada unahusisha masomo, malazi, chakula, vifaa, huduma za afya, malezi ya kiroho, na shughuli
                  za ziada.
                </p>
              </section>

              <section
                className="content-card fees-surface fees-surface--chunk fees-surface--stripe-gold"
                aria-labelledby="fees-components-heading"
              >
                <div className="fees-card__head">
                  <span className="fees-card__icon" aria-hidden>
                    <i className="fas fa-list" />
                  </span>
                  <h2 id="fees-components-heading" className="fees-card__title">
                    Vipengele vya ada
                  </h2>
                </div>
                <ul className="fees-chunk__list">
                  <li>Masomo na ufundishaji</li>
                  <li>Malazi (bweni)</li>
                  <li>Chakula (milo mitatu kwa siku)</li>
                  <li>Vifaa vya kujifunzia</li>
                  <li>Huduma za afya</li>
                  <li>Programu za malezi ya kiroho</li>
                  <li>Shughuli za ziada</li>
                </ul>
              </section>

              <section
                className="content-card fees-surface fees-surface--chunk fees-surface--stripe-teal"
                aria-labelledby="fees-schedule-heading"
              >
                <div className="fees-card__head">
                  <span className="fees-card__icon" aria-hidden>
                    <i className="fas fa-list-ol" />
                  </span>
                  <h2 id="fees-schedule-heading" className="fees-card__title">
                    Ratiba ya malipo
                  </h2>
                </div>
                <p className="fees-chunk__text">Ada zinaweza kulipwa kwa utaratibu ufuatao:</p>
                <ul className="fees-chunk__list">
                  <li>
                    <strong>Malipo yote kwa pamoja:</strong> Mwanzo wa mwaka wa masomo (kwa punguzo dogo)
                  </li>
                  <li>
                    <strong>Malipo kwa muhula:</strong> Mwanzo wa kila muhula (awamu 3)
                  </li>
                  <li>
                    <strong>Malipo ya mwezi:</strong> Kwa awamu za mwezi (kwa makubaliano na mhasibu)
                  </li>
                </ul>
              </section>

              <section
                className="content-card fees-surface fees-surface--chunk fees-surface--stripe-gold"
                aria-labelledby="fees-methods-heading"
              >
                <div className="fees-card__head">
                  <span className="fees-card__icon" aria-hidden>
                    <i className="fas fa-money-bill-wave" />
                  </span>
                  <h2 id="fees-methods-heading" className="fees-card__title">
                    Njia za malipo
                  </h2>
                </div>
                <ul className="fees-chunk__list">
                  <li>Uhamisho wa benki kwenda akaunti ya seminari</li>
                  <li>Malipo ya simu (M-Pesa, Tigo Pesa, Airtel Money)</li>
                  <li>Fedha taslimu ofisini kwa mhasibu</li>
                  <li>Hundi (kwa jina la Arusha Catholic Seminary)</li>
                </ul>
              </section>

              <section
                className="content-card fees-surface fees-surface--chunk fees-surface--stripe-navy"
                aria-labelledby="fees-aid-heading"
              >
                <div className="fees-card__head">
                  <span className="fees-card__icon" aria-hidden>
                    <i className="fas fa-hand-holding-heart" />
                  </span>
                  <h2 id="fees-aid-heading" className="fees-card__title">
                    Ufadhili na msaada wa kifedha
                  </h2>
                </div>
                <p className="fees-chunk__text">
                  Seminari hutoa ufadhili na msaada wa kifedha kwa wanafunzi wanaostahili wanaoonyesha:
                </p>
                <ul className="fees-chunk__list">
                  <li>Ubora wa kitaaluma</li>
                  <li>Mahitaji ya kifedha</li>
                  <li>Tabia njema na nidhamu</li>
                  <li>Kujitoa kwa dhati katika wito wao</li>
                </ul>
              </section>

              <section
                className="content-card fees-surface fees-surface--chunk fees-surface--stripe-slate"
                aria-labelledby="fees-extra-heading"
              >
                <div className="fees-card__head">
                  <span className="fees-card__icon" aria-hidden>
                    <i className="fas fa-plus-circle" />
                  </span>
                  <h2 id="fees-extra-heading" className="fees-card__title">
                    Gharama za ziada
                  </h2>
                </div>
                <p className="fees-chunk__text">Wanafunzi wanaweza kuwa na gharama za ziada kwa:</p>
                <ul className="fees-chunk__list">
                  <li>Sare za shule na mahitaji binafsi</li>
                  <li>Ada za mitihani (mitihani ya serikali)</li>
                  <li>Ziara za masomo na matembezi ya hiari</li>
                  <li>Gharama binafsi za matibabu</li>
                </ul>
              </section>

              <section
                className="content-card fees-surface fees-surface--chunk fees-surface--stripe-gold fees-surface--span-full"
                aria-labelledby="fees-contact-heading"
              >
                <div className="fees-card__head">
                  <span className="fees-card__icon" aria-hidden>
                    <i className="fas fa-phone" />
                  </span>
                  <h2 id="fees-contact-heading" className="fees-card__title">
                    Maulizo ya ada
                  </h2>
                </div>
                <p className="fees-chunk__text">
                  Kwa maelezo ya kina kuhusu ada na utaratibu wa malipo, tafadhali wasiliana nasi:
                </p>
                <ul className="fees-chunk__contacts">
                  <li>
                    <strong>Barua pepe:</strong>{' '}
                    <a href={`mailto:${contactEmail}`} className="fees-contact-link">
                      {contactEmail}
                    </a>
                  </li>
                  <li>
                    <strong>Simu:</strong>{' '}
                    <a href={`tel:${contactPhone}`} className="fees-contact-link">
                      {contactPhone}
                    </a>
                  </li>
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default Fees;
