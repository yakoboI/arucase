/**
 * Privacy Policy Page - Content from server (public_pages) or static fallback
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['page', 'privacy'],
    queryFn: () => publicAPI.getPage('privacy'),
    retry: false,
    staleTime: 30 * 60 * 1000,
  });

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && page && (page.html_content || page.content);
  
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const id = hash.replace('#', '');
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hasCustomContent]);

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Inapakia sera ya faragha..." />
      </PublicLayout>
    );
  }

  if (hasCustomContent) {
    return (
      <PublicLayout>
        <div className="privacy-policy-page">
          <header className="policy-hero">
            <div className="policy-hero-inner">
              <span className="policy-eyebrow">Uwazi na Ulinzi wa Taarifa</span>
              <h1><i className="fas fa-shield-alt"></i> Sera ya Faragha</h1>
              <p>Jinsi Seminari ya Kikatoliki Arusha inavyokusanya, kutumia, na kulinda taarifa zako.</p>
            </div>
          </header>
          <div className="container policy-container">
            <article className="policy-card policy-rich-content" dangerouslySetInnerHTML={{ __html: page.html_content || page.content || '' }} />
            <div className="back-button-container">
              <Link to="/" className="back-button">
                <i className="fas fa-arrow-left"></i> Rudi Mwanzo
              </Link>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="privacy-policy-page">
        <header className="policy-hero">
          <div className="policy-hero-inner">
            <span className="policy-eyebrow">Uwazi na Ulinzi wa Taarifa</span>
            <h1><i className="fas fa-shield-alt"></i> Sera ya Faragha</h1>
            <p>Imesasishwa mwisho: 13 Oktoba 2025</p>
          </div>
        </header>

        <div className="container policy-container">
          <section className="policy-quick-facts" aria-label="Muhtasari wa sera ya faragha">
            <div className="fact-card">
              <i className="fas fa-database"></i>
              <h3>Taarifa Tunazokusanya</h3>
              <p>Maelezo ya mawasiliano, takwimu za matumizi, na shughuli za akaunti kwa uendeshaji salama.</p>
            </div>
            <div className="fact-card">
              <i className="fas fa-lock"></i>
              <h3>Jinsi Tunavyolinda</h3>
              <p>Usimbaji fiche, udhibiti wa ruhusa, hifadhi salama, na nakala rudufu za mara kwa mara.</p>
            </div>
            <div className="fact-card">
              <i className="fas fa-user-check"></i>
              <h3>Haki Zako</h3>
              <p>Unaweza kuomba kuona, kurekebisha, kufuta taarifa, au kuondoa ridhaa yako.</p>
            </div>
          </section>

          <section className="policy-card">
            <h2>Utangulizi</h2>
            <p>
              Seminari ya Kikatoliki Arusha imejizatiti kulinda faragha yako. Sera hii inaeleza taarifa
              tunazokusanya, sababu za kuzikusanya, na namna tunavyozilinda unapotumia tovuti yetu.
            </p>
            <div className="highlight-box">
              <strong>Ahadi yetu:</strong> Tunashughulikia taarifa binafsi kwa uwajibikaji na kwa kuzingatia
              sheria husika za faragha na ulinzi wa data.
            </div>
          </section>

          <section className="policy-card">
            <h2>Taarifa Tunazokusanya</h2>
            <h3>Taarifa unazotoa mwenyewe</h3>
            <ul>
              <li><strong>Maelezo ya mawasiliano:</strong> jina, barua pepe, na namba ya simu kupitia fomu.</li>
              <li><strong>Taarifa za wahitimu:</strong> mwaka wa kuhitimu, taaluma, na ushuhuda.</li>
              <li><strong>Taarifa za matukio:</strong> taarifa zinazotolewa kwa ushiriki wa matukio ya shule.</li>
            </ul>

            <h3>Taarifa zinazokusanywa kiotomatiki</h3>
            <ul>
              <li><strong>Data za kiufundi:</strong> anuani ya IP, aina ya kivinjari, na aina ya kifaa.</li>
              <li><strong>Data za matumizi:</strong> kurasa ulizotembelea, muda uliokaa, na chanzo cha rufaa.</li>
              <li><strong>Data za utendaji:</strong> idadi ya wageni na mwenendo wa trafiki.</li>
            </ul>

            <h3>Data za watumiaji wa ndani</h3>
            <ul>
              <li><strong>Data za uthibitisho:</strong> majina ya watumiaji na nywila zilizosimbwa.</li>
              <li><strong>Rekodi za majukumu na shughuli:</strong> vitendo, muda, na kurasa zilizofikiwa.</li>
              <li><strong>Data za kipindi cha matumizi:</strong> kudumisha kuingia salama kwa watumiaji wenye ruhusa.</li>
            </ul>
          </section>

          <section className="policy-card">
            <h2>Jinsi Tunavyotumia Taarifa</h2>
            <ul>
              <li>Kutoa na kuboresha huduma za tovuti.</li>
              <li>Kujibu maswali na maombi yako.</li>
              <li>Kudumisha mawasiliano ya shule na mtandao wa wahitimu.</li>
              <li>Kufuatilia usalama na kuzuia ufikiaji usioidhinishwa.</li>
              <li>Kuboresha uchambuzi wa matumizi na uzoefu wa mtumiaji.</li>
            </ul>
          </section>

          <section className="policy-card">
            <h2>Usalama na Hifadhi ya Data</h2>
            <ul>
              <li>Data huhifadhiwa kwenye mifumo salama yenye udhibiti wa ruhusa.</li>
              <li>Nywila husimbwa kwa mbinu za viwango vya kitaalamu.</li>
              <li>Nakala rudufu za mara kwa mara husaidia kuzuia upotevu wa data.</li>
              <li>Itifaki salama hutumika katika usafirishaji wa data.</li>
            </ul>
          </section>

          <section className="policy-card">
            <h2>Vidakuzi na Ufuatiliaji</h2>
            <ul>
              <li><strong>Vidakuzi vya kipindi:</strong> kudumisha kuingia kwa mtumiaji panapohitajika.</li>
              <li><strong>Hifadhi ya mapendeleo:</strong> kukumbuka mipangilio uliyochagua.</li>
              <li><strong>Ufuatiliaji wa takwimu:</strong> kutusaidia kuelewa matumizi ya tovuti kwa ujumla.</li>
            </ul>
          </section>

          <section className="policy-card" id="haki-zako">
            <h2>Haki Zako</h2>
            <p>Unaweza kuomba:</p>
            <ul>
              <li>Kupata nakala ya taarifa zako binafsi.</li>
              <li>Kurekebisha taarifa zisizo sahihi.</li>
              <li>Kufuta taarifa pale inapowezekana kisheria.</li>
              <li>Kuondoa ridhaa ya uchakataji wa data.</li>
            </ul>
            <p>
              Kutuma ombi, wasiliana kupitia <strong>arucase@gmail.com</strong>.
            </p>
          </section>

          <section className="policy-card">
            <h2>Faragha ya Watoto</h2>
            <p>
              Kama taasisi ya elimu, tunachukua tahadhari ya ziada tunaposhughulikia taarifa za wanafunzi.
              Wazazi au walezi wanaweza kuwasiliana na shule kukagua au kurekebisha data za mtoto pale
              inapokubalika.
            </p>
          </section>

          <section className="policy-card">
            <h2>Mabadiliko ya Sera</h2>
            <p>
              Tunaweza kusasisha sera hii mara kwa mara. Mabadiliko yote yatachapishwa kwenye ukurasa huu
              pamoja na tarehe mpya ya "Imesasishwa mwisho".
            </p>
          </section>

          <section className="policy-card contact-card" id="mawasiliano">
            <h2>Mawasiliano</h2>
            <ul>
              <li><strong>Barua pepe:</strong> arucase@gmail.com</li>
              <li><strong>Simu:</strong> +255 754 926 022</li>
              <li><strong>Anwani:</strong> Seminari ya Kikatoliki Arusha, Arusha, Tanzania</li>
            </ul>
          </section>

          <div className="back-button-container">
            <Link to="/" className="back-button">
              <i className="fas fa-arrow-left"></i> Rudi Mwanzo
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default PrivacyPolicy;

