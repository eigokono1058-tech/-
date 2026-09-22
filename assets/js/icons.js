/* Inline SVG icon set (no external requests).
   Brand marks are the official simple-icons glyph paths (CC0).
   Utility icons are drawn from primitives so they always render. */
window.ICONS = {
  github:
    '<svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22" fill="currentColor">' +
    '<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',

  linkedin:
    '<svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22" fill="currentColor">' +
    '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/></svg>',

  /* Instagram: rounded frame + lens + flash dot (primitive-built, exact glyph proportions) */
  instagram:
    '<svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
    '<rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5.4"/>' +
    '<circle cx="12" cy="12" r="4.1"/>' +
    '<circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>',

  /* Facebook: rounded tile + "f" */
  facebook:
    '<svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22" fill="currentColor">' +
    '<path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.91h-2.33V22c4.78-.76 8.45-4.92 8.45-9.94z"/></svg>',

  briefcase:
    '<svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="2.5" y="7.5" width="19" height="13" rx="2.6"/>' +
    '<path d="M9 7.5V5.6A2.1 2.1 0 0 1 11.1 3.5h1.8A2.1 2.1 0 0 1 15 5.6v1.9"/>' +
    '<path d="M2.5 12.6h19"/><path d="M10.6 12.6h2.8"/></svg>',

  mail:
    '<svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="2.5" y="4.5" width="19" height="15" rx="2.6"/><path d="M3.5 7 12 13l8.5-6"/></svg>',

  link:
    '<svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M10 13.5a4 4 0 0 0 5.66 0l3-3A4 4 0 0 0 13 4.84l-1.5 1.5"/>' +
    '<path d="M14 10.5a4 4 0 0 0-5.66 0l-3 3A4 4 0 0 0 11 19.16l1.5-1.5"/></svg>',

  qr:
    '<svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">' +
    '<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/>' +
    '<rect x="3" y="14" width="7" height="7" rx="1.4"/><path d="M14 14h3v3h-3zM19.5 14h1.5M14 19.5v1.5M18 21h3v-3"/></svg>',

  spark:
    '<svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12 2.8 13.9 9l6.2 1.9-6.2 1.9L12 19l-1.9-6.2L3.9 10.9 10.1 9z"/>' +
    '<path d="M18.6 16.4l.7 2.2 2.2.7-2.2.7-.7 2.2-.7-2.2-2.2-.7 2.2-.7z"/></svg>',

  arrow:
    '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M5 12h13M13 6l6 6-6 6"/></svg>'
};
