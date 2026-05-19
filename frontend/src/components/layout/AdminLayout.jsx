import { useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import './AdminLayout.css';

const AdminLayout = ({ children }) => {
  const { pathname } = useLocation();
  const studentRegistrationFrame =
    pathname === '/admin/students/registration' ||
    pathname.startsWith('/admin/students/registration/');
  const publicPagesFrame = pathname === '/admin/public-pages';

  return (
    <div className="admin-layout">
      <a href="#admin-main-content" className="admin-skip-to-content">
        Skip to main content
      </a>
      <AdminSidebar />
      <main
        id="admin-main-content"
        className={`admin-main-content${studentRegistrationFrame ? ' admin-main-content--student-registration-frame' : ''}${publicPagesFrame ? ' admin-main-content--public-pages-frame' : ''}`}
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;

