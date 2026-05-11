/**
 * Student Life Page - Full Content from Python Template
 */
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import './StudentLife.css';
import DOMPurify from 'dompurify';

const StudentLife = () => {
  const location = useLocation();
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['page', 'student-life'],
    queryFn: () => publicAPI.getPage('student-life'),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  const fallbackContent = (
    <div className="student-life-page">
      <Link to="/" className="home-button">
        <i className={`fas ${location.pathname === '/' ? 'fa-home' : 'fa-arrow-left'}`}></i>
      </Link>

      <div className="content-card">
        <h2>Maisha ya Wanafunzi</h2>
        
        <h3>Ratiba ya Kila Siku</h3>
        <p>
          Maisha ya seminari yanafuata ratiba iliyopangiliwa inayoweka uwiano kati ya sala, masomo,
          kazi na mapumziko:
        </p>
        <ul>
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

        <h3>Maisha ya Kiroho</h3>
        <p>Malezi ya kiroho ndiyo msingi wa maisha ya seminari:</p>
        <ul>
          <li>Misa ya kila siku na ibada ya Ekaristi</li>
          <li>Sala za asubuhi na jioni</li>
          <li>Kitubio cha kila wiki</li>
          <li>Uongozi wa kiroho na ushauri</li>
          <li>Mafungo na tafakari za kiroho</li>
        </ul>

        <h3>Shughuli za Ziada</h3>
        <ul>
          <li>Kwaya na huduma ya muziki</li>
          <li>Michezo (mpira wa miguu, mpira wa wavu, mpira wa kikapu)</li>
          <li>Tamthilia na maigizo</li>
          <li>Klabu ya mdahalo</li>
          <li>Uhifadhi wa mazingira</li>
          <li>Miradi ya huduma kwa jamii</li>
        </ul>

        <h3>Miundombinu na Huduma</h3>
        <ul>
          <li>Kanisa dogo na sehemu za sala</li>
          <li>Madarasa yenye vifaa vya kutosha</li>
          <li>Maktaba na maabara ya kompyuta</li>
          <li>Viwanja na kumbi za michezo</li>
          <li>Mabweni</li>
          <li>Ukumbi wa chakula</li>
          <li>Kituo cha afya</li>
        </ul>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Loading student life page..." />
      </PublicLayout>
    );
  }

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && page && (page.html_content || page.content);

  return (
    <PublicLayout>
      {hasCustomContent ? (
        <div className="student-life-page">
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

export default StudentLife;
