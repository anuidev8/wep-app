import React, { useMemo, useRef, useEffect, useState } from 'react';

/** Subtle chakra colors for tile grid (Root→Crown) */
const CHAKRA_TILE_COLORS = [
  '#EF4444', /* root */
  '#F97316', /* sacral */
  '#EAB308', /* solar */
  '#22C55E', /* heart */
  '#3B82F6', /* throat */
  '#6366F1', /* third eye */
  '#A855F7', /* crown */
];

/** Get points along a rounded rectangle path using SVG path API */
function usePointsOnPath(pathD: string, count: number) {
  const pathRef = useRef<SVGPathElement>(null);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    const result: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const pt = path.getPointAtLength((i / count) * len);
      result.push({ x: pt.x, y: pt.y });
    }
    setPoints(result);
  }, [pathD, count]);

  return { points, pathRef };
}

/** Single bead for reuse in strands */
const BeadDetail: React.FC<{
  x: number;
  y: number;
  r: number;
  gradientId: string;
  glowId: string;
  grainId: string;
  isGuru?: boolean;
}> = ({ x, y, r, gradientId, glowId, grainId, isGuru }) => (
  <g className="mala-bead-wrap">
    <ellipse cx={x + 0.15} cy={y + 0.2} rx={r * 0.9} ry={r * 0.45} fill="rgba(0,0,0,0.1)" />
    <circle cx={x} cy={y} r={r + 0.35} fill={`url(#${glowId})`} />
    <circle cx={x} cy={y} r={r} fill={`url(#${gradientId})`} className="mala-bead" />
    <circle cx={x} cy={y} r={r} fill={`url(#${grainId})`} className="mala-bead-grain" />
    <ellipse cx={x - 0.2} cy={y - 0.25} rx={r * 0.4} ry={r * 0.2} fill="rgba(255,255,255,0.4)" />
  </g>
);

export const MalaBackground: React.FC = () => {
  const inset = 3;
  const r = 10;
  const pathD = `M ${inset + r} ${inset} H ${100 - inset - r} A ${r} ${r} 0 0 1 ${100 - inset} ${inset + r} V ${100 - inset - r} A ${r} ${r} 0 0 1 ${100 - inset - r} ${100 - inset} H ${inset + r} A ${r} ${r} 0 0 1 ${inset} ${100 - inset - r} V ${inset + r} A ${r} ${r} 0 0 1 ${inset + r} ${inset} Z`;

  const { points: beads, pathRef } = usePointsOnPath(pathD, 108);

  const displayBeads = useMemo(() => {
    if (beads.length === 108) return beads;
    return [...Array(108)].map((_, i) => {
      const angle = (i * 360) / 108;
      return {
        x: 50 + 42 * Math.cos((angle * Math.PI) / 180),
        y: 50 + 42 * Math.sin((angle * Math.PI) / 180),
      };
    });
  }, [beads]);

  const leftStrandBeads = useMemo(() => {
    const count = 28;
    const x = 4;
    return [...Array(count)].map((_, i) => ({
      x,
      y: (i / (count - 1)) * 92 + 4,
    }));
  }, []);

  const rightStrandBeads = useMemo(() => {
    const count = 28;
    const x = 96;
    return [...Array(count)].map((_, i) => ({
      x,
      y: (i / (count - 1)) * 92 + 4,
    }));
  }, []);

  const particles = useMemo(
    () =>
      [...Array(20)].map((_, i) => ({
        key: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 5 + Math.random() * 5,
      })),
    []
  );

  return (
    <div className="mala-background">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <radialGradient id="mala-bead-gradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f5e6c8" />
            <stop offset="25%" stopColor="#e8d4a8" />
            <stop offset="50%" stopColor="#d4a574" />
            <stop offset="75%" stopColor="#b8956a" />
            <stop offset="100%" stopColor="#9a6b3c" />
          </radialGradient>
          <radialGradient id="mala-bead-glow" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="rgba(255, 245, 220, 0.9)" />
            <stop offset="50%" stopColor="rgba(212, 165, 116, 0.6)" />
            <stop offset="100%" stopColor="rgba(154, 107, 60, 0.3)" />
          </radialGradient>
          <pattern id="wood-grain" patternUnits="userSpaceOnUse" width="2" height="1">
            <line x1="0" y1="0.5" x2="2" y2="0.5" stroke="rgba(0,0,0,0.06)" strokeWidth="0.08" />
          </pattern>
          <linearGradient id="mala-string" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(130, 100, 70, 0.65)" />
            <stop offset="50%" stopColor="rgba(160, 125, 90, 0.8)" />
            <stop offset="100%" stopColor="rgba(130, 100, 70, 0.65)" />
          </linearGradient>
        </defs>
      </svg>

      <div className="mala-dotted-texture" aria-hidden />

      <svg className="mala-frame mala-frame-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path ref={pathRef} d={pathD} fill="none" stroke="none" style={{ visibility: 'hidden' }} />

        <g className="mala-tiles">
          {[...Array(6)].map((_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={16.67 * i}
              x2={100}
              y2={16.67 * i}
              className="tile-line"
              stroke={CHAKRA_TILE_COLORS[i % 7]}
              strokeOpacity={0.06}
            />
          ))}
          {[...Array(6)].map((_, i) => (
            <line
              key={`v-${i}`}
              x1={16.67 * i}
              y1={0}
              x2={16.67 * i}
              y2={100}
              className="tile-line"
              stroke={CHAKRA_TILE_COLORS[(i + 3) % 7]}
              strokeOpacity={0.06}
            />
          ))}
        </g>

        {displayBeads.map((p, i) => {
          const next = displayBeads[(i + 1) % displayBeads.length];
          return (
            <line key={`tie-${i}`} x1={p.x} y1={p.y} x2={next.x} y2={next.y} className="mala-tie" />
          );
        })}

        {displayBeads.map((p, i) => (
          <BeadDetail
            key={i}
            x={p.x}
            y={p.y}
            r={i === 0 ? 1.5 : 1.25}
            gradientId="mala-bead-gradient"
            glowId="mala-bead-glow"
            grainId="wood-grain"
            isGuru={i === 0}
          />
        ))}
      </svg>

      <svg className="mala-strands mala-strand-left" viewBox="0 0 100 100" preserveAspectRatio="none">
        {leftStrandBeads.map((p, i) => (
          <g key={i}>
            {i > 0 && (
              <line
                x1={leftStrandBeads[i - 1].x}
                y1={leftStrandBeads[i - 1].y}
                x2={p.x}
                y2={p.y}
                className="mala-tie mala-tie-strand"
              />
            )}
            <BeadDetail
              x={p.x}
              y={p.y}
              r={1.4}
              gradientId="mala-bead-gradient"
              glowId="mala-bead-glow"
              grainId="wood-grain"
            />
          </g>
        ))}
      </svg>
      <svg className="mala-strands mala-strand-right" viewBox="0 0 100 100" preserveAspectRatio="none">
        {rightStrandBeads.map((p, i) => (
          <g key={i}>
            {i > 0 && (
              <line
                x1={rightStrandBeads[i - 1].x}
                y1={rightStrandBeads[i - 1].y}
                x2={p.x}
                y2={p.y}
                className="mala-tie mala-tie-strand"
              />
            )}
            <BeadDetail
              x={p.x}
              y={p.y}
              r={1.4}
              gradientId="mala-bead-gradient"
              glowId="mala-bead-glow"
              grainId="wood-grain"
            />
          </g>
        ))}
      </svg>

      <div className="glow-particles">
        {particles.map((p) => (
          <div
            key={p.key}
            className="glow-particle"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
