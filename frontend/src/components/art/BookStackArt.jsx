// A leaning stack of pastel books seen spine-on — the instructor theme's object.
const BOOKS = [
  { w: 196, h: 30, x: 34, spine: "#E9A0B4", band: "#C9708C" },
  { w: 176, h: 24, x: 52, spine: "#F2C27E", band: "#D99A45" },
  { w: 210, h: 34, x: 20, spine: "#8FC6B8", band: "#5E9E8E" },
  { w: 184, h: 22, x: 44, spine: "#B6A2E6", band: "#8B74CC" },
  { w: 200, h: 28, x: 28, spine: "#F09A86", band: "#CF6F5B" },
  { w: 166, h: 20, x: 60, spine: "#9CC3E6", band: "#6C99C2" },
  { w: 190, h: 30, x: 36, spine: "#F4D66C", band: "#D4B13F" },
  { w: 172, h: 24, x: 48, spine: "#E58FAE", band: "#BF5F83" },
];

export default function BookStackArt({ className = "" }) {
  const total = BOOKS.reduce((sum, book) => sum + book.h, 0);
  let y = total + 20;

  return (
    <svg viewBox={`0 0 260 ${total + 24}`} className={className} aria-hidden="true" focusable="false">
      <ellipse cx="130" cy={total + 20} rx="118" ry="6" fill="#1F3A2E" opacity="0.18" />
      {BOOKS.map((book, index) => {
        y -= book.h;
        const bandX = book.x + book.w * 0.18;
        const bandX2 = book.x + book.w * 0.74;
        return (
          <g key={index}>
            {/* page block peeking out of the right end */}
            <rect x={book.x + book.w - 10} y={y + 3} width="14" height={book.h - 6} rx="3" fill="#FBF6EA" />
            <path
              d={`M ${book.x + book.w - 6} ${y + 7} h 8 M ${book.x + book.w - 6} ${y + book.h / 2} h 8 M ${book.x + book.w - 6} ${y + book.h - 7} h 8`}
              stroke="#E6DCC6"
              strokeWidth="1"
            />
            <rect x={book.x} y={y} width={book.w - 4} height={book.h} rx="5" fill={book.spine} />
            <rect x={book.x} y={y} width={book.w - 4} height={book.h * 0.32} rx="5" fill="#FFFFFF" opacity="0.22" />
            <rect x={bandX} y={y} width="9" height={book.h} fill={book.band} />
            <rect x={bandX2} y={y} width="5" height={book.h} fill={book.band} opacity="0.8" />
            <rect
              x={bandX + 22}
              y={y + book.h / 2 - 2}
              width={Math.max(30, book.w * 0.28)}
              height="4"
              rx="2"
              fill="#FFFFFF"
              opacity="0.55"
            />
            <rect x={book.x} y={y + book.h - 2} width={book.w - 4} height="2" fill="#1F3A2E" opacity="0.12" />
          </g>
        );
      })}
    </svg>
  );
}
