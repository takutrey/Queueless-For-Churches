/**
 * Small line-icon set shared across the queue app. Kept as one file so
 * every icon shares the same stroke width / viewBox conventions and the
 * UI reads as one system rather than mixed icon styles.
 */

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 20 20",
  fill: "none",
  "aria-hidden": true,
};

export function PeopleIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M2.5 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12.5 4.6c1.2.3 2 1.3 2 2.6s-.8 2.3-2 2.6M15.5 16c0-2.1-1.4-3.5-3.3-3.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ClockIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M10 6v4l2.6 2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BellIcon(props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M5 8.5a5 5 0 0 1 10 0c0 3 1 4 1.5 4.8H3.5C4 12.5 5 11.5 5 8.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 16a1.8 1.8 0 0 0 3.6 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CheckIcon(props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PauseIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="6" y="4.5" width="2.6" height="11" rx="1" fill="currentColor" />
      <rect
        x="11.4"
        y="4.5"
        width="2.6"
        height="11"
        rx="1"
        fill="currentColor"
      />
    </svg>
  );
}

export function CloseIcon(props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M5.5 5.5l9 9M14.5 5.5l-9 9"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SpeakerIcon(props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M3 8v4h2.8L10 15V5L5.8 8H3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M13 7.3a3.6 3.6 0 0 1 0 5.4M15.3 5a7 7 0 0 1 0 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ShieldIcon(props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M10 2.8l6 2.2v4.4c0 4-2.6 6.7-6 7.8-3.4-1.1-6-3.8-6-7.8V5l6-2.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M7.2 10l1.9 1.9 3.7-3.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function QrIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect
        x="3"
        y="3"
        width="5"
        height="5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="12"
        y="3"
        width="5"
        height="5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="3"
        y="12"
        width="5"
        height="5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12.5 12.5h2v2h-2zM15.5 15.5h1.5v1.5h-1.5zM12.5 15.5v1.5M15.5 12.5H17"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ArrowRightIcon(props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M4 10h12M11.5 5.5L16 10l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PersonIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4 16c0-3 2.7-5 6-5s6 2 6 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BuildingIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect
        x="4"
        y="3"
        width="12"
        height="14"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7 6.5h1.4M11.6 6.5H13M7 10h1.4M11.6 10H13M7 13.5h1.4M11.6 13.5H13"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RefreshIcon(props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M15.5 8A5.5 5.5 0 1 0 16 10.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M15.5 4v4h-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GlobeIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 10h14M10 3c2 2 3 4.5 3 7s-1 5-3 7c-2-2-3-4.5-3-7s1-5 3-7Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function SunIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1L4.7 4.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChevronDownIcon(props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M5 7.5l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InfoIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 9v4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="10" cy="6.6" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function WifiIcon(props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M3 8a10 10 0 0 1 14 0M5.8 11a6 6 0 0 1 8.4 0M8.6 14a2.2 2.2 0 0 1 2.8 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="16.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function HourglassIcon(props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M5.5 3h9M5.5 17h9M6 3c0 3.5 2 5 4 7-2 2-4 3.5-4 7M14 3c0 3.5-2 5-4 7 2 2 4 3.5 4 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DevicesIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect
        x="2.5"
        y="4"
        width="10.5"
        height="8"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M2.5 14.5h10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="14.5"
        y="7"
        width="3"
        height="8.5"
        rx="0.8"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function ListIcon(props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M7 5.5h9M7 10h9M7 14.5h9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="3.5" cy="5.5" r="1" fill="currentColor" />
      <circle cx="3.5" cy="10" r="1" fill="currentColor" />
      <circle cx="3.5" cy="14.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function TicketIcon(props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M3 8a1.6 1.6 0 0 1 0 3v2.5A1.5 1.5 0 0 0 4.5 15h11a1.5 1.5 0 0 0 1.5-1.5V11a1.6 1.6 0 0 1 0-3V6.5A1.5 1.5 0 0 0 15.5 5h-11A1.5 1.5 0 0 0 3 6.5V8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 5v10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="1.6 1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MegaphoneIcon(props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M3 8.5v3l3 .7v3.3a1.2 1.2 0 0 0 2.3.4l.7-1.9 6 2V6.5l-6 2-6-1.3Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeadsetIcon(props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M4 11v-1a6 6 0 0 1 12 0v1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="3"
        y="11"
        width="3"
        height="4.2"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="14"
        y="11"
        width="3"
        height="4.2"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M17 15.2v.8a2 2 0 0 1-2 2h-2.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LocationIcon(props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M10 17s5.5-4.7 5.5-9A5.5 5.5 0 0 0 4.5 8c0 4.3 5.5 9 5.5 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function PhoneIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect
        x="6"
        y="2.5"
        width="8"
        height="15"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M9 15h2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ArrowUpRightIcon(props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M6 14L14 6M8 6h6v6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
