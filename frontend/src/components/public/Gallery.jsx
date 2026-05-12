/**
 * Gallery Component - Full Functionality
 */
import { useState } from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { Link } from 'react-router-dom';
import { getImageLoadingStrategy } from '../../utils/networkUtils';
import { resolveStaticUrl } from '../../utils/backendUrl';
import './Gallery.css';

const Gallery = ({ photos = [], limit = 12 }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const displayPhotos = photos.slice(0, limit);
  
  // Get network-aware image loading strategy
  const imageStrategy = getImageLoadingStrategy();

  const getImageUrl = (path) => resolveStaticUrl(path);

  if (displayPhotos.length === 0) {
    return null;
  }

  return (
    <section className="gallery-section">
      <div className="section-header">
        <h2>Photo Gallery</h2>
        <Link to="/gallery" className="view-all-link">
          View All →
        </Link>
      </div>
      
      <div className="gallery-grid">
        {displayPhotos.map((photo) => {
          const imageUrl = getImageUrl(photo.path);
          return (
            <div
              key={photo.id}
              className="gallery-item"
              onClick={() => setSelectedPhoto(photo)}
            >
              <LazyLoadImage
                src={imageUrl}
                alt={photo.caption || 'Gallery photo'}
                effect={imageStrategy.useBlur ? "blur" : undefined}
                className="gallery-image"
                threshold={imageStrategy.threshold}
                placeholder={<div className="image-placeholder">Loading...</div>}
                loading="lazy"
                onError={(e) => {
                  // Silently handle missing images - suppress console errors
                  e.target.style.display = 'none';
                  const placeholder = e.target.nextElementSibling;
                  if (placeholder) {
                    placeholder.style.display = 'flex';
                  }
                  // Prevent error from bubbling to console
                  e.stopPropagation();
                  return false;
                }}
              />
              <div className="image-placeholder" style={{ display: 'none' }}>
                <i className="fas fa-image"></i>
              </div>
              {photo.caption && (
                <div className="gallery-caption">{photo.caption}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div className="lightbox" onClick={() => setSelectedPhoto(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox-close"
              onClick={() => setSelectedPhoto(null)}
              aria-label="Close"
            >
              <i className="fas fa-times"></i>
            </button>
            <img 
              src={getImageUrl(selectedPhoto.path)} 
              alt={selectedPhoto.caption || 'Gallery photo'}
              onError={(e) => {
                e.target.style.display = 'none';
                const placeholder = e.target.nextElementSibling;
                if (placeholder) {
                  placeholder.style.display = 'flex';
                }
              }}
            />
            <div className="image-placeholder" style={{ display: 'none' }}>
              <i className="fas fa-image"></i>
              <p>Image not available</p>
            </div>
            {selectedPhoto.caption && (
              <p className="lightbox-caption">{selectedPhoto.caption}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default Gallery;
