// Inline SVG icons (Instagram outline style). Use `currentColor`.
// size prop controls width/height; pass className for color.

function Svg({ size = 24, children, fill = 'none', stroke = 'currentColor', strokeWidth = 1.8, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const HomeIcon = ({ active = false, ...p }) =>
  active ? (
    <Svg fill="currentColor" stroke="none" {...p}>
      <path d="M3 10.7 12 3l9 7.7V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    </Svg>
  ) : (
    <Svg {...p}>
      <path d="M3 10.7 12 3l9 7.7" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </Svg>
  )

export const CalendarIcon = ({ active = false, ...p }) => (
  <Svg fill={active ? 'currentColor' : 'none'} stroke={active ? 'none' : 'currentColor'} {...p}>
    {active ? (
      <>
        <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm0 4h16" fill="currentColor" />
        <path d="M8 3v4M16 3v4" stroke="#000" strokeWidth="2" />
      </>
    ) : (
      <>
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M4 10h16M8 3v4M16 3v4" />
      </>
    )}
  </Svg>
)

export const HeartIcon = ({ filled = false, ...p }) => (
  <Svg fill={filled ? 'currentColor' : 'none'} strokeWidth={filled ? 0 : 1.8} {...p}>
    <path d="M12 21C12 21 3.5 15.5 3.5 9.5a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2C20.5 15.5 12 21 12 21z" />
  </Svg>
)

export const CommentIcon = (p) => (
  <Svg {...p}>
    <path d="M21 11.5a8.4 8.4 0 0 1-11.9 7.6L3 21l1.9-6.1A8.4 8.4 0 1 1 21 11.5z" />
  </Svg>
)

export const ShareIcon = (p) => (
  <Svg {...p}>
    <path d="M22 3 11 14" />
    <path d="M22 3 15 21l-4-7-7-4z" />
  </Svg>
)

export const BookmarkIcon = ({ filled = false, ...p }) => (
  <Svg fill={filled ? 'currentColor' : 'none'} {...p}>
    <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" />
  </Svg>
)

export const MoreIcon = (p) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
)

export const CloseIcon = (p) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)

export const ChevronLeftIcon = (p) => (
  <Svg strokeWidth={2.4} {...p}><path d="M15 5l-7 7 7 7" /></Svg>
)

export const ChevronRightIcon = (p) => (
  <Svg strokeWidth={2.4} {...p}><path d="M9 5l7 7-7 7" /></Svg>
)

export const ExternalLinkIcon = (p) => (
  <Svg {...p}>
    <path d="M14 5h5v5M19 5l-9 9" />
    <path d="M19 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5.5" />
  </Svg>
)

export const WhatsAppIcon = ({ size = 20, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.02h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.4-8.24 8.4zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43l-.48-.01c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
  </svg>
)
