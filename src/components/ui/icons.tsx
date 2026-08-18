type IconProps = React.SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function XLogo({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" {...props}>
      <path d="M13.86 10.47 21.15 2h-1.73l-6.33 7.36L8.03 2H2.2l7.64 11.12L2.2 22h1.73l6.68-7.77L15.95 22h5.83l-7.92-11.53Zm-2.37 2.75-.77-1.11L4.55 3.3h2.65l4.97 7.11.77 1.1 6.46 9.24h-2.65l-5.27-7.54Z" />
    </svg>
  );
}

export function ArrowRight({ className, ...props }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true" {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function Check({ className, ...props }: IconProps) {
  return (
    <svg {...base} strokeWidth={2.2} className={className} aria-hidden="true" {...props}>
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  );
}

export function Rss({ className, ...props }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true" {...props}>
      <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Sparkles({ className, ...props }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true" {...props}>
      <path d="M12 3.5 13.8 8.7 19 10.5l-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8L12 3.5Z" />
      <path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
    </svg>
  );
}

export function Calendar({ className, ...props }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true" {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function ShieldCheck({ className, ...props }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true" {...props}>
      <path d="M12 3l7.5 3v5.5c0 4.4-3.1 8.4-7.5 9.5-4.4-1.1-7.5-5.1-7.5-9.5V6L12 3Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </svg>
  );
}

export function Plus({ className, ...props }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className} aria-hidden="true" {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function Menu({ className, ...props }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.8} className={className} aria-hidden="true" {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function Close({ className, ...props }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.8} className={className} aria-hidden="true" {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function Drag({ className, ...props }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true" {...props}>
      <circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
