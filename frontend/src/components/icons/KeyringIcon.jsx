/** Two keys on a keyring — staff login password field */
const KeyringIcon = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    width="1.125rem"
    height="1.125rem"
    aria-hidden="true"
    focusable="false"
  >
    <circle
      cx="12"
      cy="5.15"
      r="2.85"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    />
    <g fill="currentColor">
      <g transform="rotate(-20 9.25 8.75)">
        <circle cx="9.25" cy="8.75" r="1.5" />
        <rect x="8.55" y="9.55" width="1.4" height="7.1" rx="0.35" />
        <rect x="8" y="14.35" width="2.3" height="1.05" rx="0.2" />
        <rect x="8" y="15.85" width="1.4" height="1.05" rx="0.2" />
      </g>
      <g transform="rotate(20 14.75 8.75)">
        <circle cx="14.75" cy="8.75" r="1.5" />
        <rect x="14.05" y="9.55" width="1.4" height="7.1" rx="0.35" />
        <rect x="13.5" y="14.35" width="2.3" height="1.05" rx="0.2" />
        <rect x="14.4" y="15.85" width="1.4" height="1.05" rx="0.2" />
      </g>
    </g>
  </svg>
);

export default KeyringIcon;
