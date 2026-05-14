/**
 * Student Report Page - Full Content from Python Template
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import './StudentReport.css';
import DOMPurify from 'dompurify';

const StudentReport = () => {
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['page', 'student_report'],
    queryFn: () => publicAPI.getPage('student_report'),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  const { data: settings } = useQuery({
    queryKey: ['homepage'],
    queryFn: () => publicAPI.getHomepage(),
    select: (res) => res.data?.settings,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Loading student report page..." />
      </PublicLayout>
    );
  }

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && page && (page.html_content || page.content);

  return (
    <PublicLayout>
      <div className="student-report-page">
        <Link to="/" className="home-button">
          <i className="fas fa-home"></i> Back to Home
        </Link>
        {hasCustomContent ? (
          <div
            className="content-card"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.html_content || page.content || '') }}
          />
        ) : (
          <div className="content-card">
            <h2>Student Reports</h2>

            <h3>Academic Reporting</h3>
            <p>
              The seminary maintains a comprehensive reporting system to track student progress and
              communicate with parents and guardians about their academic and spiritual development.
            </p>

            <h3>Report Structure</h3>
            <p>Student reports include:</p>
            <ul>
              <li>Subject grades and rankings</li>
              <li>Term position and overall performance</li>
              <li>Teacher comments on each subject</li>
              <li>Class teacher&apos;s general remarks</li>
              <li>Headmaster&apos;s comments</li>
              <li>Spiritual director&apos;s assessment</li>
              <li>Conduct and discipline record</li>
            </ul>

            <h3>Reporting Schedule</h3>
            <ul>
              <li><strong>Monthly Reports:</strong> Brief academic progress updates</li>
              <li><strong>Mid-Term Reports:</strong> Comprehensive assessment at term midpoint</li>
              <li><strong>Terminal Reports:</strong> Full academic and formation report at end of each term</li>
              <li><strong>Annual Report:</strong> Comprehensive year-end report</li>
            </ul>

            <h3>Accessing Reports</h3>
            <p>Parents and guardians can access student reports through:</p>
            <ul>
              <li>Physical copies distributed at end of term</li>
              <li>Parent-teacher conferences</li>
              <li>Online portal (for registered parents)</li>
            </ul>

            <h3>Contact for Report Inquiries</h3>
            <p>
              For questions about student reports, please contact:<br />
              <strong>Email:</strong>{' '}
              <a href={`mailto:${settings?.contact_email || 'info@arushacatholicseminary.co.tz'}`} className="contact-link">
                {settings?.contact_email || 'info@arushacatholicseminary.co.tz'}
              </a>
              <br />
              <strong>Phone:</strong>{' '}
              <a href={`tel:${settings?.contact_phone || '+255 123 456 789'}`} className="contact-link">
                {settings?.contact_phone || '+255 123 456 789'}
              </a>
            </p>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default StudentReport;
