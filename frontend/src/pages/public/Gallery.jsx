/**
 * Public Gallery Page - Full Photo Gallery
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import PublicLayout from '../../components/layout/PublicLayout';
import { publicAPI } from '../../services/public';
import Loading from '../../components/common/Loading';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { getImageLoadingStrategy, getNetworkInfo } from '../../utils/networkUtils';
import { resolveStaticUrl } from '../../utils/backendUrl';
import '../../components/public/Gallery.css';
import './GalleryPage.css';

const Gallery = () => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch gallery photos - fewer on slow networks to save data
  const galleryLimit = getNetworkInfo().isSlow ? 30 : 100;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['public-gallery', galleryLimit],
    queryFn: async () => {
      const res = await publicAPI.getGallery(galleryLimit);
      return res.data.photos || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - increased for better caching
  });

  const photos = data || [];

  const formatCategory = useCallback((category) => {
    const value = (category || 'general').toString().trim().toLowerCase();
    const map = {
      all: 'Picha Zote',
      general: 'Mengineyo',
      events: 'Matukio',
      students: 'Wanafunzi',
      staff: 'Watumishi',
      campus: 'Mazingira ya Shule',
      worship: 'Ibada',
      sports: 'Michezo',
      academics: 'Masomo',
    };
    return map[value] || category;
  }, []);
  
  // Get network-aware image loading strategy
  const imageStrategy = getImageLoadingStrategy();

  const getImageUrl = useCallback((path) => resolveStaticUrl(path), []);

  // Get unique categories from photos
  const categories = useMemo(() => ['all', ...new Set(photos.map(photo => photo.category || 'general'))], [photos]);

  // Filter photos by category
  const filteredPhotos = useMemo(() => {
    return selectedCategory === 'all' 
      ? photos 
      : photos.filter(photo => (photo.category || 'general') === selectedCategory);
  }, [photos, selectedCategory]);

  // Navigation functions for lightbox
  const handlePrevious = useCallback((e) => {
    e.stopPropagation();
    const newIndex = currentIndex > 0 ? currentIndex - 1 : filteredPhotos.length - 1;
    setCurrentIndex(newIndex);
    setSelectedPhoto(filteredPhotos[newIndex]);
  }, [currentIndex, filteredPhotos]);

  const handleNext = useCallback((e) => {
    e.stopPropagation();
    const newIndex = currentIndex < filteredPhotos.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    setSelectedPhoto(filteredPhotos[newIndex]);
  }, [currentIndex, filteredPhotos]);

  const handlePhotoClick = useCallback((photo, index) => {
    setCurrentIndex(index);
    setSelectedPhoto(photo);
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!selectedPhoto) return;

    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const newIndex = currentIndex > 0 ? currentIndex - 1 : filteredPhotos.length - 1;
        setCurrentIndex(newIndex);
        setSelectedPhoto(filteredPhotos[newIndex]);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const newIndex = currentIndex < filteredPhotos.length - 1 ? currentIndex + 1 : 0;
        setCurrentIndex(newIndex);
        setSelectedPhoto(filteredPhotos[newIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedPhoto(null);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedPhoto, currentIndex, filteredPhotos.length]);

  // Show skeleton loader instead of blocking page - better UX
  // Content will appear progressively as it loads

  if (error) {
    return (
      <PublicLayout>
        <div className="gallery-page-container">
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            <p>Imeshindikana kupakia picha za galeria. Angalia mtandao wako kisha ujaribu tena.</p>
            <button
              type="button"
              className="gallery-retry-btn"
              onClick={() => refetch()}
            >
              <i className="fas fa-sync-alt"></i> Jaribu Tena
            </button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="gallery-page-container">
        <div className="gallery-page-header">
          <h1>
            <i className="fas fa-images"></i>
            Galeria ya Picha
          </h1>
          <p>Tazama mkusanyiko wa picha zinazoonesha maisha ya Seminari ya Kikatoliki Arusha.</p>
        </div>

        {/* Category Filter */}
        {categories.length > 1 && (
          <div className="gallery-filters">
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCategory(category);
                  setSelectedPhoto(null);
                }}
              >
                {formatCategory(category)}
                {category !== 'all' && (
                  <span className="filter-count">
                    ({photos.filter(p => (p.category || 'general') === category).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Gallery Grid */}
        {isLoading && filteredPhotos.length === 0 ? (
          <SkeletonLoader type="gallery" />
        ) : filteredPhotos.length === 0 ? (
          <div className="empty-gallery">
            <i className="fas fa-images"></i>
            <p>Galeria bado haina picha. Tafadhali tembelea tena baadaye.</p>
            <button
              type="button"
              className="gallery-retry-btn"
              onClick={() => setSelectedCategory('all')}
            >
              <i className="fas fa-layer-group"></i> Onesha Picha Zote
            </button>
          </div>
        ) : (
          <div className="gallery-grid">
            {filteredPhotos.map((photo, index) => (
              <div
                key={photo.id}
                className="gallery-item-card"
                onClick={() => handlePhotoClick(photo, index)}
              >
                <div className="gallery-item-image-wrapper">
                  <LazyLoadImage
                    src={getImageUrl(photo.path)}
                    alt={photo.caption || 'Picha ya galeria'}
                    effect={imageStrategy.useBlur ? "blur" : undefined}
                    className="gallery-image"
                    threshold={imageStrategy.threshold}
                    placeholder={<div className="image-placeholder">Loading...</div>}
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextElementSibling) {
                        e.target.nextElementSibling.style.display = 'flex';
                      }
                    }}
                  />
                  <div className="image-placeholder" style={{ display: 'none' }}>
                    <i className="fas fa-image"></i>
                  </div>
                  <div className="gallery-item-overlay">
                    <div className="gallery-item-category-badge">
                      <i className="fas fa-tag"></i>
                      {formatCategory(photo.category || 'general')}
                    </div>
                    <div className="gallery-item-view-icon">
                      <i className="fas fa-search-plus"></i>
                    </div>
                  </div>
                </div>
                <div className="gallery-item-info">
                  {photo.caption && (
                    <h3 className="gallery-item-title">{photo.caption}</h3>
                  )}
                  {photo.date && (
                    <div className="gallery-item-meta">
                      <span className="gallery-item-date">
                        <i className="fas fa-calendar-alt"></i>
                        {new Date(photo.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long',
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Photo Count */}
        <div className="gallery-stats">
          <p>
            Inaonesha picha {filteredPhotos.length}
            {selectedCategory !== 'all' && ` katika ${formatCategory(selectedCategory)}`}
          </p>
        </div>

        {/* Lightbox Modal */}
        {selectedPhoto && (
          <div className="lightbox" onClick={() => setSelectedPhoto(null)}>
            <button
              type="button"
              className="lightbox-close"
              onClick={() => setSelectedPhoto(null)}
              aria-label="Funga"
            >
              <i className="fas fa-times"></i>
            </button>
            {filteredPhotos.length > 1 && (
              <>
                <button
                  type="button"
                  className="lightbox-nav lightbox-prev"
                  onClick={handlePrevious}
                  aria-label="Picha iliyopita"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <button
                  type="button"
                  className="lightbox-nav lightbox-next"
                  onClick={handleNext}
                  aria-label="Picha inayofuata"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </>
            )}
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <img 
                src={getImageUrl(selectedPhoto.path)} 
                alt={selectedPhoto.caption || 'Picha ya galeria'}
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextElementSibling) {
                    e.target.nextElementSibling.style.display = 'flex';
                  }
                }}
              />
              <div className="image-placeholder" style={{ display: 'none' }}>
                <i className="fas fa-image"></i>
                <p>Picha haipatikani</p>
              </div>
              {(selectedPhoto.caption || selectedPhoto.date) && (
                <div className="lightbox-info">
                  {selectedPhoto.caption && (
                    <p className="lightbox-caption">{selectedPhoto.caption}</p>
                  )}
                  {selectedPhoto.date && (
                    <p className="lightbox-date">
                      <i className="fas fa-calendar"></i> {new Date(selectedPhoto.date).toLocaleDateString()}
                    </p>
                  )}
                  {selectedPhoto.category && (
                    <p className="lightbox-category">
                      <i className="fas fa-tag"></i> {selectedPhoto.category}
                    </p>
                  )}
                </div>
              )}
              {filteredPhotos.length > 1 && (
                <div className="lightbox-counter">
                  {currentIndex + 1} / {filteredPhotos.length}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default Gallery;
