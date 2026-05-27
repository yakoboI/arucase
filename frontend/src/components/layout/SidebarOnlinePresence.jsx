import { useOnlineStaffCount } from '../../hooks/useOnlineStaffCount';
import './SidebarOnlinePresence.css';

const SidebarOnlinePresence = ({ collapsed }) => {
  const count = useOnlineStaffCount();

  return (
    <div
      className={`sidebar-online-presence ${collapsed ? 'sidebar-online-presence--collapsed' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`Watumiaji waliounganishwa: ${count}`}
    >
      <span className="sidebar-online-presence__dot" aria-hidden />
      <span className="sidebar-online-presence__count">{count}</span>
    </div>
  );
};

export default SidebarOnlinePresence;
