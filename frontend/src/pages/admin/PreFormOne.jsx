import { useState } from 'react';
import { Link } from 'react-router-dom';
import './PreFormOne.css';

const PreFormOne = () => {
  // Generate year cards from 2025 to current year + 1
  const currentYear = new Date().getFullYear();
  const startYear = 2025;
  const endYear = currentYear + 1;
  
  const years = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }

  return (
    <div className="pre-form-one-page">
      <div className="pre-form-one-header">
        <h1>Pre-Form One Management</h1>
        <p>Select a year to view and manage Pre-Form One student data</p>
      </div>

      <div className="years-grid">
        {years.map((year) => (
          <Link 
            key={year} 
            to={`/admin/pre-form-one/${year}`}
            className="year-card"
          >
            <div className="year-card-content">
              <div className="year-icon">
                <i className="fas fa-child"></i>
              </div>
              <div className="year-info">
                <h3>{year}</h3>
                <p>View Pre-Form One data</p>
              </div>
              <div className="year-arrow">
                <i className="fas fa-arrow-right"></i>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="back-navigation-bottom">
        <Link to="/admin" className="back-button">
          <i className="fas fa-arrow-left"></i>
          Back to Admin
        </Link>
      </div>
    </div>
  );
};

export default PreFormOne;
