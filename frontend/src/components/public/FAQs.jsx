/**
 * FAQs Component - Full Functionality with Python Template Styling
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicAPI } from '../../services/public';
import './FAQs.css';

const FAQs = ({ faqs: propFAQs = [], limit = 5 }) => {
  const [openIndex, setOpenIndex] = useState(null);
  
  // Fetch FAQs if not provided
  const { data: fetchedData } = useQuery({
    queryKey: ['faqs'],
    queryFn: async () => {
      try {
        const res = await publicAPI.getFAQs();
        return res.data?.faqs || [];
      } catch (err) {
        console.error('Error fetching FAQs:', err);
        return [];
      }
    },
    enabled: propFAQs.length === 0,
    staleTime: 10 * 60 * 1000,
  });

  const faqs = propFAQs.length > 0 ? propFAQs : (fetchedData || []);
  const displayFAQs = faqs.slice(0, limit);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Always show section, even if empty
  return (
    <section className="faq-section">
      <div className="faq-container">
        {/* Section Header */}
        <div className="faq-header">
          <h2 className="faq-title">
            <i className="fas fa-question-circle faq-title-icon"></i>
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <p className="faq-subtitle">
            Get answers to common questions about Arusha Catholic Seminary
          </p>
        </div>

        {/* FAQ Accordion */}
        {displayFAQs.length > 0 ? (
          <div className="faq-list">
            {displayFAQs.map((faq, index) => (
              <div 
                key={faq.id || index} 
                className={`faq-item ${openIndex === index ? 'active' : ''}`}
              >
                <button 
                  className="faq-question" 
                  onClick={() => toggleFAQ(index)}
                >
                  <span className="faq-question-text">
                    <span className="faq-question-label">Q:</span>
                    {faq.question}
                  </span>
                  <i className={`fas fa-chevron-down faq-icon ${openIndex === index ? 'open' : ''}`}></i>
                </button>
                <div className="faq-answer">
                  <div className="faq-answer-content">
                    <p className="faq-answer-text">
                      <span className="faq-answer-label">A:</span>
                      {faq.answer}
                    </p>
                    {faq.category && faq.category !== 'General' && (
                      <span className="faq-category">
                        <i className="fas fa-tag faq-category-icon"></i>
                        {faq.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="faq-empty">
            <p>No FAQs available at this time. Please check back later.</p>
          </div>
        )}

        {/* Help Footer */}
        <div className="faq-help-footer">
          <p className="faq-help-text">
            <i className="fas fa-info-circle faq-help-icon"></i>
            Can't find what you're looking for?{' '}
            <a href="mailto:info@arushacatholicseminary.co.tz" className="faq-contact-link">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default FAQs;
