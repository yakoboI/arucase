/**
 * Catholic Education Landing Page - Optimized for Religious School Searches
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import './CatholicEducation.css';
import DOMPurify from 'dompurify';

const CatholicEducation = () => {
  const location = useLocation();
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['page', 'catholic-education'],
    queryFn: () => publicAPI.getPage('catholic-education'),
    retry: false,
    staleTime: 30 * 60 * 1000,
  });

  const fallbackContent = (
    <div className="catholic-education-page">
      <Link to="/" className="home-button" aria-label="Navigate to homepage">
        <i className={`fas ${location.pathname === '/' ? 'fa-home' : 'fa-arrow-left'}`} aria-hidden="true"></i>
        <span className="sr-only">Navigate to homepage</span>
      </Link>

      <div className="hero-section">
        <div className="hero-content">
          <h1>Jimbo Kuu la Arusha Catholic Schools</h1>
          <p className="hero-subtitle">
            Oldonyosambu Seminary - Catholic Schools Tanzania, A-Level Schools & O-Level Schools - Seminari ya Jimbo Kuu la Arusha
          </p>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">55+</span>
              <span className="stat-label">Miaka ya Utendaji</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">5000+</span>
              <span className="stat-label">Wanafunzi Waliopata</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">100%</span>
              <span className="stat-label">Mafanikio wa Kikatoliki</span>
            </div>
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <h2>
            <i className="fas fa-cross"></i>
            Dhamira ya Kiroho na Malezi - Catholic Schools Tanzania
          </h2>
          <p>
            Seminari ya Kikatoliki Arusha - Jimbo Kuu la Arusha Catholic schools inalenga kutoa elimu bora ya kitaaluma pamoja na 
            malezi ya kiroho yenye msingi wa kikatoliki. Tunajenga vijana wenye 
            maadili mema, uwezo wa kiroho, na bidii za kuwa viongozi wa kanisa na jamii.
            Catholic schools Oldonyosambu zina uwezo wa kufundisha viongozi bora Tanzania.
          </p>
          <p>
            <strong>Catholic Schools Arusha:</strong> Jimbo Kuu la Arusha Catholic schools ni miongoni mwa Catholic schools Tanzania.
            <strong>Oldonyosambu Seminary:</strong> Seminari ya Oldonyosambu inatoa A-Level schools na O-Level schools bora.
            <strong>A-Level Schools:</strong> A-Level schools za Jimbo Kuu la Arusha zina matokeo mazuri.
            <strong>O-Level Schools:</strong> O-Level schools za Oldonyosambu zina mafanikio ya kipekee.
          </p>
          <div className="features-grid">
            <div className="feature-item">
              <i className="fas fa-graduation-cap"></i>
              <h3>Elimu ya Juu</h3>
              <p>Kufundishwa na walimu wazuri na mitihara ya kisasa</p>
            </div>
            <div className="feature-item">
              <i className="fas fa-pray"></i>
              <h3>Malezi ya Kiroho</h3>
              <p>Sala ya kila siku, misa, na maadili ya kiroho</p>
            </div>
            <div className="feature-item">
              <i className="fas fa-users"></i>
              <h3>Ujumbe wa Jamii</h3>
              <p>Kukuza uhusiano wa dini na maisha ya pamoja</p>
            </div>
            <div className="feature-item">
              <i className="fas fa-book"></i>
              <h3>Masomo ya Kikatoliki</h3>
              <p>Teolojia, maadili, na historia ya Kanisa</p>
            </div>
          </div>
        </div>

        <div className="content-card">
          <h2>
            <i className="fas fa-school"></i>
            Programu za Elimu
          </h2>
          <div className="programs-list">
            <div className="program-item">
              <h3>O-Level Schools - Form I-IV</h3>
              <p>Hati milingi kwa wanafunzi wanaoanza elimu ya sekondari - O-Level Schools Tanzania</p>
              <ul>
                <li><strong>Science Subjects:</strong> Biology, Chemistry, Physics</li>
                <li><strong>Core Subjects:</strong> Mathematics, English, Kiswahili</li>
                <li><strong>Social Sciences:</strong> History, Geography, Civics</li>
                <li><strong>Religious Education:</strong> Religious Studies, Catholic Formation</li>
                <li><strong>NECTA Preparation:</strong> CSEE (Form IV Exams)</li>
              </ul>
              <p><em>Miongoni mwa O-Level schools ya Jimbo Kuu la Arusha, tunatoa mafunzo bora ya kitaaluma na kiroho.</em></p>
            </div>
            <div className="program-item">
              <h3>A-Level Schools - Form V-VI</h3>
              <p>Elimu ya juu kwa wanafunzi wataotimia vyuo vikuu - A-Level Schools Tanzania</p>
              <ul>
                <li><strong>Science Combinations:</strong> PCM (Physics, Chemistry, Mathematics), PCB (Physics, Chemistry, Biology)</li>
                <li><strong>Business Combinations:</strong> EGM (Economics, Geography, Mathematics)</li>
                <li><strong>Arts Combinations:</strong> HGL (History, Geography, Language), HKL (History, Kiswahili, Literature)</li>
                <li><strong>Advanced Studies:</strong> Form Five & Form Six preparation</li>
                <li><strong>University Entry:</strong> ACSEE (Form VI Exams) preparation</li>
              </ul>
              <p><em>A-Level schools za Oldonyosambu Seminary zinazoandaa wanafunzi kwa ajira na vyuo vikuu vikuu Tanzania.</em></p>
            </div>
          </div>
        </div>

        <div className="content-card">
          <h2>
            <i className="fas fa-church"></i>
            Maisha ya Seminari
          </h2>
          <div className="life-grid">
            <div className="life-item">
              <i className="fas fa-clock"></i>
              <h3>Ratiba ya Kila Siku</h3>
              <p>5:30 AM - Sala ya asubuhi<br/>
                 6:00 AM - Misa<br/>
                 7:00 AM - Kifungua cha masomo<br/>
                 8:00 PM - Masomo<br/>
                 9:30 PM - Chakula cha jioni<br/>
                10:00 PM - Mapumziko</p>
            </div>
            <div className="life-item">
              <i className="fas fa-utensils"></i>
              <h3>Chakula</h3>
              <p>Chakula cha kibubu kwa wanafunzi wote</p>
            </div>
            <div className="life-item">
              <i className="fas fa-football"></i>
              <h3>Michezo</h3>
              <p>Michezo ya ndani na riadha</p>
            </div>
            <div className="life-item">
              <i className="fas fa-hands-helping"></i>
              <h3>Masomo ya Kiroho</h3>
              <p>Kila jumamoso na maadili ya kiroho</p>
            </div>
          </div>
        </div>

        <div className="content-card">
          <h2>
            <i className="fas fa-user-graduate"></i>
            Vigezo vya Kujiunga
          </h2>
          <div className="admission-requirements">
            <h3>Vigezo vya Msingi</h3>
            <ul>
              <li><strong>Cheti cha Ubatizo:</strong> Kutoka Kanisa Katoliki</li>
              <li><strong>Kiswahili:</strong> Alama nzuri za Kiswahili</li>
              <li><strong>English:</strong> Uwezo wa kutosha na kuelewa</li>
              <li><strong>Hisabati:</strong> Alama nzuri katika masomo yote</li>
              <li><strong>Umri:</strong> Kati ya miaka 13-18</li>
            </ul>
            
            <h3>Vigezo vya Kiroho</h3>
            <ul>
              <li><strong>Dini:</strong> Mkristo wa Kikatoliki</li>
              <li><strong>Hofuma:</strong> Barua pepe na maadili mema</li>
              <li><strong>Ripoti ya Kichwa:</strong> Kwa parokia na shule za awali</li>
              <li><strong>Mapendekezo:</strong> Kwa shule za awali</li>
            </ul>
          </div>
          
          <div className="cta-section">
            <Link to="/admissions/apply" className="cta-button primary">
              <i className="fas fa-edit"></i>
              Jisajili Sasa
            </Link>
            <Link to="/contact" className="cta-button secondary">
              <i className="fas fa-phone"></i>
              Wasiliana Nasi
            </Link>
          </div>
        </div>
      </div>

      <div className="related-section">
        <h2>Njia Zinazohusiana</h2>
        <div className="related-links">
          <Link to="/admissions" className="related-link">
            <i className="fas fa-graduation-cap"></i>
            <span>Udahili</span>
          </Link>
          <Link to="/about" className="related-link">
            <i className="fas fa-info-circle"></i>
            <span>Kuhusu Sisi</span>
          </Link>
          <Link to="/staff" className="related-link">
            <i className="fas fa-users"></i>
            <span>Wafanyakazi</span>
          </Link>
          <Link to="/student-life" className="related-link">
            <i className="fas fa-heart"></i>
            <span>Maisha ya Mwanafunzi</span>
          </Link>
          <Link to="/contact" className="related-link">
            <i className="fas fa-envelope"></i>
            <span>Mawasiliano</span>
          </Link>
          <Link to="/gallery" className="related-link">
            <i className="fas fa-images"></i>
            <span>Picha</span>
          </Link>
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
        <div className="error-message catholic-education-page">
          <p>Samahani, kuna tatizo. Tafadhali jaribu tena baadaye.</p>
          <Link to="/" className="back-link">
            <i className="fas fa-arrow-left" aria-hidden="true" />
            Nyumbani
          </Link>
        </div>
      ) : hasCustomContent ? (
        <div className="catholic-education-page">
          <Link to="/" className="home-button" aria-label="Navigate to homepage">
            <i className={`fas ${location.pathname === '/' ? 'fa-home' : 'fa-arrow-left'}`} aria-hidden="true" />
          </Link>
          <div
            className="content-card"
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

export default CatholicEducation;
