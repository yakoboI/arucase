import AdminSidebar from './AdminSidebar';
import './AdminLayout.css';

const AdminLayout = ({ children }) => {
  return (
    <div className="admin-layout">
      <a href="#admin-main-content" className="admin-skip-to-content">
        Skip to main content
      </a>
      <AdminSidebar />
      <main id="admin-main-content" className="admin-main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;

