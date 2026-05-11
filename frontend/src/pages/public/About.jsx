/**
 * About Page - Full Content from Python Template
 */
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import './About.css';
import DOMPurify from 'dompurify';

const About = () => {
  const location = useLocation();
  // Try to fetch page content from database, but have fallback content
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['page', 'about'],
    queryFn: () => publicAPI.getPage('about'),
    retry: false,
    staleTime: 30 * 60 * 1000, // 30 minutes - about content rarely changes
  });

  // Fallback content from Python template
  const fallbackContent = (
    <div className="about-page">
      <Link to="/" className="home-button" aria-label="Navigate to homepage">
        <i className={`fas ${location.pathname === '/' ? 'fa-home' : 'fa-arrow-left'}`} aria-hidden="true"></i>
        <span className="sr-only">Navigate to homepage</span>
      </Link>

      <div className="content-card">
        <h1>Kuhusu Seminari ya Kikatoliki Arusha</h1>
        
        <p>
          Seminari ya Kikatoliki Arusha ni shule ya sekondari ya Kikatoliki
          iliyoanzishwa mwaka 1967 Oldonyosambu, Tanzania. Tunatoa elimu bora ya Kikatoliki na
          malezi ya kiroho kwa vijana wa kiume wanaotamani kulitumikia Kanisa na jamii.
        </p>
        
        <h2>Historia Yetu</h2>
        <p>
          Seminari ya Kikatoliki Arusha ilianzishwa mwaka <strong>1967</strong> ikiwa na dhamira ya kutoa
          elimu bora ya Kikatoliki na malezi ya kiroho kwa vijana wa kiume wanaotamani kulitumikia Kanisa
          na jamii. Kwa zaidi ya <strong>miongo mitano</strong>, tumekuwa tukilea akili na roho katikati ya Tanzania.
        </p>

        <h2>Dhamira Yetu</h2>
        <p>
          <strong>Jibu:</strong> Kuwajenga vijana wa kiume wawe wakomavu kiroho, wabora kitaaluma,
          na wenye maadili mema ili wawe viongozi wa baadaye katika Kanisa Katoliki na jamii kwa ujumla.
        </p>

        {/* Related Pages for SEO */}
        <div className="related-pages">
          <h3>Pages Zinazohusiana</h3>
          <div className="related-links">
            <Link to="/admissions" className="related-link">
              <i className="fas fa-graduation-cap"></i>
              <span>Udahili</span>
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
          </div>
        </div>

        <h2>Maono Yetu</h2>
        <p>
          <strong>Jibu:</strong> Kuwa kituo bora cha elimu ya seminari ya Kikatoliki kinachozalisha
          watu waliokamilika wanaoishi tunu za imani, maarifa, na utumishi.
        </p>

        <h2>Tunu za Msingi</h2>
        <ul>
          <li><strong>Imani:</strong> Kukuza uhusiano na Mungu kupitia sala na sakramenti</li>
          <li><strong>Ubora wa Kitaaluma:</strong> Kutafuta maarifa kwa bidii na uadilifu</li>
          <li><strong>Nidhamu:</strong> Kukuza kujitawala na kuwajibika</li>
          <li><strong>Utumishi:</strong> Kumtumikia Mungu na wanadamu kwa unyenyekevu na upendo</li>
          <li><strong>Jumuiya:</strong> Kujenga undugu na umoja miongoni mwa wanafunzi wa seminari</li>
        </ul>

        <h3>Mlinzi Wetu</h3>
        <p>
          Seminari iko chini ya ulinzi wa Mtakatifu Thomas wa Akwino.
        </p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Inapakia ukurasa wa kuhusu..." />
      </PublicLayout>
    );
  }

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && page && (page.html_content || page.content);

  return (
    <PublicLayout>
      {hasCustomContent ? (
        <div className="about-page">
          <Link to="/" className="home-button">
            <i className={`fas ${location.pathname === '/' ? 'fa-home' : 'fa-arrow-left'}`}></i>
          </Link>
          <div 
            className="content-card"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.html_content || page.content || '') }}
          />
        </div>
      ) : (
        fallbackContent
      )}
    </PublicLayout>
  );
};

export default About;
