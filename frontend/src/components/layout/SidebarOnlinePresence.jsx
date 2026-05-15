import { useMemo } from 'react';
import { useOnlineStaffCount } from '../../hooks/useOnlineStaffCount';
import './SidebarOnlinePresence.css';

/** Bar fill: visible at 1 user, scales up to 100% around ~12 concurrent staff */
function barWidthPercent(count) {
  if (count <= 0) return 0;
  return Math.min(100, Math.max(14, count * 9));
}

const SidebarOnlinePresence = ({ collapsed }) => {
  const count = useOnlineStaffCount();
  const barPct = useMemo(() => barWidthPercent(count), [count]);

  return (
    <div
      className="sidebar-online-presence"
      role="status"
      aria-live="polite"
      aria-label={`Watumiaji waliounganishwa: ${count}`}
    >
      <div className="sidebar-online-presence__track" aria-hidden>
        <div
          className="sidebar-online-presence__bar"
          style={{ width: `${barPct}%` }}
        />
      </div>
      <div className="sidebar-online-presence__row">
        <span className="sidebar-online-presence__dot" aria-hidden />
        {!collapsed ? (
          <>
            <span className="sidebar-online-presence__label">Mtandaoni sasa</span>
            <span className="sidebar-online-presence__count">{count}</span>
          </>
        ) : (
          <span className="sidebar-online-presence__count sidebar-online-presence__count--solo">
            {count}
          </span>
        )}
      </div>
      {!collapsed ? (
        <p className="sidebar-online-presence__hint">Watumiaji waliounganishwa</p>
      ) : null}
    </div>
  );
};

export default SidebarOnlinePresence;
