import React from 'react';

const STROKE = 'rgba(212, 165, 116, 0.5)';
const STROKE_WIDTH = 0.6;

/** Sacred geometry patterns for tiling - each fits in size x size */
const PATTERNS = [
  // 0: Seed of Life (7 circles)
  (size: number) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.15;
    const circles: Array<{ cx: number; cy: number; r: number }> = [
      { cx, cy, r },
      ...Array.from({ length: 6 }, (_, i) => {
        const angle = (i * Math.PI) / 3;
        return {
          cx: cx + r * 2 * Math.cos(angle),
          cy: cy + r * 2 * Math.sin(angle),
          r,
        };
      }),
    ];
    return circles.map((c, i) => (
      <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill="none" stroke={STROKE} strokeWidth={STROKE_WIDTH} />
    ));
  },
  // 1: Flower of Life (19 circles)
  (size: number) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.15;
    const circles: Array<{ cx: number; cy: number; r: number }> = [{ cx, cy, r }];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      circles.push({
        cx: cx + r * 2 * Math.cos(angle),
        cy: cy + r * 2 * Math.sin(angle),
        r,
      });
    }
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      const dist = r * 3.464;
      circles.push({
        cx: cx + dist * Math.cos(angle),
        cy: cy + dist * Math.sin(angle),
        r,
      });
    }
    return circles.map((c, i) => (
      <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill="none" stroke={STROKE} strokeWidth={STROKE_WIDTH} />
    ));
  },
  // 2: 8-point Mandala (concentric circles + petals)
  (size: number) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.3;
    const els: React.ReactNode[] = [];
    [1.1, 0.9, 0.6, 0.3].forEach((scale, i) => {
      els.push(
        <circle key={`c-${i}`} cx={cx} cy={cy} r={r * scale} fill="none" stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      );
    });
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      const nextAngle = ((i + 1) * Math.PI * 2) / 8;
      const x2 = cx + r * Math.cos(nextAngle);
      const y2 = cy + r * Math.sin(nextAngle);
      const midAngle = angle + Math.PI / 8;
      const midX = cx + r * 0.7 * Math.cos(midAngle);
      const midY = cy + r * 0.7 * Math.sin(midAngle);
      els.push(
        <path
          key={`p-${i}`}
          d={`M ${cx} ${cy} L ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2} Z`}
          fill="none"
          stroke={STROKE}
          strokeWidth={STROKE_WIDTH}
        />
      );
    }
    els.push(<circle key="dot" cx={cx} cy={cy} r={r * 0.1} fill={STROKE} />);
    return els;
  },
  // 3: 12-point Mandala
  (size: number) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.3;
    const els: React.ReactNode[] = [];
    [1.1, 0.85, 0.5].forEach((scale, i) => {
      els.push(
        <circle key={`c-${i}`} cx={cx} cy={cy} r={r * scale} fill="none" stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      );
    });
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      const nextAngle = ((i + 1) * Math.PI * 2) / 12;
      const x2 = cx + r * Math.cos(nextAngle);
      const y2 = cy + r * Math.sin(nextAngle);
      const midAngle = angle + Math.PI / 12;
      const midX = cx + r * 0.7 * Math.cos(midAngle);
      const midY = cy + r * 0.7 * Math.sin(midAngle);
      els.push(
        <path
          key={`p-${i}`}
          d={`M ${cx} ${cy} L ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2} Z`}
          fill="none"
          stroke={STROKE}
          strokeWidth={STROKE_WIDTH}
        />
      );
    }
    els.push(<circle key="dot" cx={cx} cy={cy} r={r * 0.08} fill={STROKE} />);
    return els;
  },
  // 4: Vesica Piscis style (overlapping circles)
  (size: number) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.22;
    const els: React.ReactNode[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      els.push(
        <circle
          key={i}
          cx={cx + r * Math.cos(angle)}
          cy={cy + r * Math.sin(angle)}
          r={r}
          fill="none"
          stroke={STROKE}
          strokeWidth={STROKE_WIDTH}
        />
      );
    }
    els.push(<circle key="center" cx={cx} cy={cy} r={r * 0.4} fill="none" stroke={STROKE} strokeWidth={STROKE_WIDTH} />);
    return els;
  },
];

const PATTERN_COUNT = PATTERNS.length;

interface LuxMessageMandalaProps {
  /** Index to pick pattern (e.g. taglineIndex) – cycles through Seed, Flower, 8pt Mandala, 12pt Mandala, Vesica */
  patternIndex?: number;
}

/** Subtle sacred geometry background – cycles through Flower of Life, Mandalas, Seed of Life, etc. */
export const LuxMessageMandala: React.FC<LuxMessageMandalaProps> = ({ patternIndex = 0 }) => {
  const size = 48;
  const idx = Math.abs(patternIndex) % PATTERN_COUNT;
  const patternId = `lux-geo-pattern-${idx}`;

  return (
    <span
      className="lux-message-mandala absolute inset-0 rounded-[inherit] pointer-events-none z-[1] overflow-hidden"
      aria-hidden
    >
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.22] dark:opacity-[0.16] transition-opacity duration-500"
        viewBox={`0 0 ${size} ${size}`}
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id={patternId} width={size} height={size} patternUnits="userSpaceOnUse">
            {PATTERNS[idx](size)}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </span>
  );
};
