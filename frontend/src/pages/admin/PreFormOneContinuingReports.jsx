/**
 * Pre-Form One Continuing Reports Page
 * Generate and manage continuing reports
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { preFormOneService } from '../../services/preFormOneService';
import { adminAPI } from '../../services/admin';
import { useAuth } from '../../context/AuthContext';
import './PreFormOneResults.css';

const PreFormOneContinuingReports = () => {
  const { year } = useParams();
  const { isAuthenticated } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  const getLogoUrl = (logoPath) => {
    if (!logoPath) return null;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const baseUrl = apiUrl.replace('/api', '');
    const cleanPath = logoPath.startsWith('/') ? logoPath.substring(1) : logoPath;
    return `${baseUrl}/static/${cleanPath}`;
  };

  const handleLogoError = (e) => {
    console.error('Logo image load error:', e.target.src);
    e.target.style.display = 'none';
  };

  // Fetch school logo
  const { data: schoolLogoData } = useQuery({
    queryKey: ['school-logo'],
    queryFn: async () => {
      try {
        const res = await adminAPI.getSchoolLogo();
        return res.data?.logo || null;
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const downloadPDF = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to download reports');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('🔍 DEBUG: Fetching continuing results for PDF generation, year:', year);
      const response = await preFormOneService.downloadContinuingResultsPDF(year);
      console.log('🔍 DEBUG: PDF download response:', response);
      
      // Create download link
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PreFormOne_Continuing_Reports_${year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Continuing reports downloaded successfully!');
    } catch (error) {
      console.error('Error generating continuing reports:', error);
      toast.error('Failed to generate continuing reports');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCSV = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to download reports');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('🔍 DEBUG: Fetching continuing results for CSV generation, year:', year);
      const response = await preFormOneService.getContinuingResults(year);
      console.log('🔍 DEBUG: Continuing results response:', response);
      
      if (!response.data?.results) {
        console.log('🔍 DEBUG: No continuing results found in response');
        toast.error('No continuing results found to generate reports');
        return;
      }
      
      console.log('🔍 DEBUG: Continuing results data found:', response.data.results);

      const results = response.data.results;
      const csvContent = generateCSV(results);
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const filename = `PreFormOne_Continuing_Reports_${year}.csv`;
      
      if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, filename);
      } else {
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      toast.success('Continuing reports CSV downloaded successfully!');
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast.error('Failed to generate CSV reports');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCSV = (results) => {
    const headers = [
      'S/N',
      'Admission Number',
      'First Name',
      'Middle Name',
      'Surname',
      'Parish',
      'Total Marks',
      'Average',
      'Grade',
      'Position',
      'Remarks'
    ];

    const rows = Object.keys(results).map((admissionNumber, index) => {
      const result = results[admissionNumber];
      return [
        index + 1,
        admissionNumber,
        result.first_name || '',
        result.middle_name || '',
        result.surname || '',
        result.parish || '',
        result.total_marks || 0,
        result.average || 0,
        result.grade || '',
        result.position || '',
        result.remarks || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Add BOM for Excel compatibility
    const BOM = '\uFEFF';
    return BOM + csvContent;
  };

  return (
    <div className="preform-one-results-page-container">
      <div className="excel-card preform-one-results">
        <div className="excel-card-header">
          <i className="fas fa-file-invoice"></i> PRE-FORM ONE CONTINUING REPORTS
          <div className="header-actions">
            <Link to={`/admin/pre-form-one/${year}`} className="excel-btn secondary small">
              <i className="fas fa-arrow-left"></i> Back
            </Link>
          </div>
        </div>
        <div className="excel-card-body">
          {/* Report Header */}
          <div className="report-header-section">
            <div className="report-header">
              <div className="logo-section">
                {schoolLogoData?.logo_image_path ? (
                  <img
                    src={getLogoUrl(schoolLogoData.logo_image_path)}
                    alt="Arusha Catholic Seminary official school logo"
                    className="school-logo"
                    loading="eager"
                    onError={handleLogoError}
                  />
                ) : (
                  <div className="school-logo-placeholder">
                    <i className="fas fa-school"></i>
                  </div>
                )}
              </div>
              <div className="school-info">
                <h1>CATHOLIC ARCHDIOCESE OF ARUSHA</h1>
                <h2>ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU</h2>
                <div className="contact-info">
                  <p>P.O BOX 3102 Arusha, Tanzania</p>
                  <p>+255 754 92 60 22 / +255 765 394 802</p>
                  <p>Email: arucase@gmail.com</p>
                </div>
              </div>
              <div className="logo-section-right">
                {schoolLogoData?.logo_image_path ? (
                  <img
                    src={getLogoUrl(schoolLogoData.logo_image_path)}
                    alt="Arusha Catholic Seminary official school logo"
                    className="school-logo-right"
                    loading="eager"
                    onError={handleLogoError}
                  />
                ) : (
                  <div className="school-logo-placeholder">
                    <i className="fas fa-school"></i>
                  </div>
                )}
              </div>
            </div>
            <div className="test-info-bar">
              PRE-FORM ONE CONTINUING REPORTS {year}
            </div>
          </div>

          {/* Report Actions */}
          <div className="report-actions-container">
            <div className="report-action-card">
              <h3>Generate Continuing Reports</h3>
              <p>Download comprehensive continuing reports for {year}</p>
              <div className="action-buttons">
                <button
                  type="button"
                  onClick={downloadPDF}
                  className="download-btn-monthly"
                  disabled={isGenerating}
                >
                  <i className="fas fa-file-pdf"></i>
                  {isGenerating ? 'Generating PDF...' : 'Download PDF Report'}
                </button>
                <button
                  type="button"
                  onClick={downloadCSV}
                  className="download-btn-monthly"
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
                  disabled={isGenerating}
                >
                  <i className="fas fa-file-csv"></i>
                  {isGenerating ? 'Generating CSV...' : 'Download CSV Report'}
                </button>
              </div>
            </div>
          </div>

          <div className="print-spacer-bottom"></div>

          <div className="back-margin">
            <Link to={`/admin/pre-form-one/${year}`} className="excel-btn">
              <i className="fas fa-arrow-left"></i> Back
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreFormOneContinuingReports;
