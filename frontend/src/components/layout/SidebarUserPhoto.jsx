import { useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/auth';
import { resolveStaticUrl } from '../../utils/backendUrl';
import { toast } from '../../utils/toast';
import './SidebarUserPhoto.css';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;

const SidebarUserPhoto = ({ collapsed }) => {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const photoUrl = user?.profile_picture
    ? resolveStaticUrl(user.profile_picture)
    : null;

  const openFilePicker = () => {
    if (busy) return;
    inputRef.current?.click();
  };

  const handleAreaClick = () => {
    if (busy) return;
    if (photoUrl) {
      setMenuOpen((v) => !v);
      return;
    }
    openFilePicker();
  };

  const handleDelete = async () => {
    const ok = window.confirm(
      'Delete your profile photo permanently? This cannot be undone.'
    );
    if (!ok) return;

    setMenuOpen(false);
    setBusy(true);
    try {
      await authAPI.deleteProfilePicture();
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['public-staff-profiles'] });
      toast.success('Photo deleted. You can upload a new one.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete photo.');
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (photoUrl) {
      toast.error('Delete your current photo before uploading a new one.');
      return;
    }

    if (!ACCEPT.split(',').includes(file.type)) {
      toast.error('Use a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Image must be 5 MB or smaller.');
      return;
    }

    setBusy(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await authAPI.uploadProfilePicture(formData);
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['public-staff-profiles'] });
      if (res.data?.synced_to_public_staff) {
        toast.success('Profile photo saved and synced to the public staff page.');
      } else {
        toast.success(
          'Profile photo saved. Ask admin to link your account in Staff Profiles for it to appear on /staff.'
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`sidebar-user-photo ${collapsed ? 'sidebar-user-photo--collapsed' : ''} ${busy ? 'sidebar-user-photo--busy' : ''}`}
    >
      <button
        type="button"
        className="sidebar-user-photo__area"
        onClick={handleAreaClick}
        disabled={busy}
        aria-label={
          photoUrl
            ? 'Profile photo options'
            : 'Upload profile photo'
        }
        aria-expanded={menuOpen}
        aria-haspopup={photoUrl ? 'true' : undefined}
      >
        {photoUrl ? (
          <img src={photoUrl} alt="" className="sidebar-user-photo__img" />
        ) : (
          <span className="sidebar-user-photo__placeholder" aria-hidden="true">
            <i className="fas fa-user" />
            <span className="sidebar-user-photo__hint">Add photo</span>
          </span>
        )}
        {busy ? (
          <span className="sidebar-user-photo__overlay" aria-hidden="true">
            <i className="fas fa-spinner fa-spin" />
          </span>
        ) : null}
      </button>

      {menuOpen && photoUrl ? (
        <div className="sidebar-user-photo__menu" role="menu">
          <p className="sidebar-user-photo__menu-note">
            To change your photo, delete this one first, then upload again.
          </p>
          <button
            type="button"
            className="sidebar-user-photo__menu-btn sidebar-user-photo__menu-btn--danger"
            role="menuitem"
            onClick={handleDelete}
          >
            Delete permanently
          </button>
          <button
            type="button"
            className="sidebar-user-photo__menu-btn"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            Cancel
          </button>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sidebar-user-photo__file"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default SidebarUserPhoto;
