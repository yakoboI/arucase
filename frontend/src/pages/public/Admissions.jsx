/**
 * Admissions Page - Full Content from Python Template
 */
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import './Admissions.css';
import DOMPurify from 'dompurify';

const Admissions = () => {
  const location = useLocation();
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

  const fallbackContent = (
    <div className="admissions-page">
      <Link to="/" className="home-button">
        <i className={`fas ${location.pathname === '/' ? 'fa-home' : 'fa-arrow-left'}`}></i>
      </Link>

      <div className="admissions-actions">
        <Link to="/admissions/apply" className="admissions-apply-button">
          BOFYA HAPA KUJISAJILI
        </Link>
      </div>

      <div className="content-card">
        <h1>Udahili</h1>
        
        <h2>Vigezo vya Udahili</h2>
        <p>
          Seminari ya Kikatoliki Arusha inapokea vijana wa kiume wenye nia ya kweli ya malezi ya wito
          na ubora wa kitaaluma. Hivi ni vigezo vya msingi vya udahili:
        </p>

        <ul>
          <li>Cheti cha ubatizo kutoka Kanisa Katoliki</li>
          <li>Nakala ya matokeo ya masomo kutoka shule aliyosoma</li>
          <li>Barua ya utambulisho kutoka kwa padre wa parokia</li>
          <li>Cheti cha uchunguzi wa afya</li>
          <li>Cheti cha kuzaliwa au kitambulisho halali</li>
          <li>Picha ndogo za pasipoti (nakala 4)</li>
        </ul>

        <h2>Utaratibu wa Kutuma Maombi</h2>
        <p><strong>Jibu:</strong> Ili kuomba kujiunga na Seminari ya Kikatoliki Arusha, fuata hatua hizi 6:</p>
        <ol>
          <li><strong>Pata Fomu ya Maombi:</strong> Pakua mtandaoni au chukua ofisini seminari</li>
          <li><strong>Jaza Fomu ya Maombi:</strong> Jaza taarifa zote zinazohitajika kwa usahihi</li>
          <li><strong>Wasilisha Nyaraka:</strong> Wasilisha nyaraka zote zinazotakiwa pamoja na fomu yako</li>
          <li><strong>Mtihani wa Kuingia:</strong> Hudhuria mtihani wa kuingia uliopangwa</li>
          <li><strong>Mahojiano:</strong> Shiriki mahojiano na kamati ya udahili</li>
          <li><strong>Uamuzi wa Udahili:</strong> Pokea taarifa ya matokeo ya maombi yako</li>
        </ol>

        <h2>Tarehe Muhimu</h2>
        <ul>
          <li><strong>Kipindi cha Maombi:</strong> Januari - Machi</li>
          <li><strong>Mitihani ya Kuingia:</strong> Aprili</li>
          <li><strong>Mahojiano:</strong> Mei</li>
          <li><strong>Barua za Udahili:</strong> Juni</li>
          <li><strong>Mafunzo ya Utangulizi:</strong> Mwishoni mwa Juni</li>
          <li><strong>Mwaka wa Masomo Unaaza:</strong> Julai</li>
        </ul>

        <h3>Wasiliana na Ofisi ya Udahili</h3>
        <p>
          Kwa maelezo zaidi kuhusu udahili, tafadhali wasiliana nasi:<br />
          <strong>Barua pepe:</strong>{' '}
          <a href={`mailto:${settings?.contact_email || 'info@arushacatholicseminary.co.tz'}`} className="contact-link">
            {settings?.contact_email || 'info@arushacatholicseminary.co.tz'}
          </a>
          <br />
          <strong>Simu:</strong>{' '}
          <a href={`tel:${settings?.contact_phone || '+255 123 456 789'}`} className="contact-link">
            {settings?.contact_phone || '+255 123 456 789'}
          </a>
        </p>
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
        <div className="admissions-page">
          <Link to="/" className="home-button">
            <i className={`fas ${location.pathname === '/' ? 'fa-home' : 'fa-arrow-left'}`}></i>
          </Link>
          <div className="admissions-actions">
            <Link to="/admissions/apply" className="admissions-apply-button">
              BOFYA HAPA KUJISAJILI
            </Link>
          </div>
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

export default Admissions;
