import React from 'react';
import type { LucideIcon } from 'lucide-react';

const GOLD = '#E6C27A';
const TEXT = 'rgba(255,255,255,0.96)';
const MUTED = 'rgba(255,255,255,0.52)';

export interface LiveMeditationStoryData {
  date: string;
  focus: string;
  FocusIcon: LucideIcon;
  focusIconColor?: string;
  durationMinutes: number;
  quote: string;
  heartsReceived: number;
  spiritualChallenge: string;
  /** User's display name — shown at top as "{Name}'s Ritual" */
  userName?: string;
}

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

type FocusThemeId = 'peace' | 'focus' | 'healing' | 'gratitude' | 'silence' | 'love';

/** 6 focus-based color palettes — each creates a distinct emotional atmosphere */
const FOCUS_PALETTES: Record<
  FocusThemeId,
  {
    background: string;
    accent: string;       // brand, quote border, footer handle
    accentGlow: string;   // radial glows
    gold: string;
    quoteBg: string;
    quoteBorder: string;
    quoteGlow: string;  // for box-shadow glow
    sacredStroke: string;
  }
> = {
  peace: {
    background: `
      radial-gradient(1200px 800px at 50% -10%, rgba(147,197,253,0.12), transparent 60%),
      radial-gradient(900px 900px at 50% 110%, rgba(165,243,252,0.10), transparent 60%),
      linear-gradient(180deg, #0c1929 0%, #0f2744 50%, #0d2d3d 100%)
    `,
    accent: 'rgba(165,243,252,0.92)',
    accentGlow: 'rgba(147,197,253,0.15)',
    gold: GOLD,
    quoteBg: 'rgba(165,243,252,0.08)',
    quoteBorder: 'rgba(165,243,252,0.5)',
    quoteGlow: 'rgba(165,243,252,0.25)',
    sacredStroke: 'rgba(165,243,252,0.4)',
  },
  focus: {
    background: `
      radial-gradient(1200px 800px at 50% -10%, rgba(96,165,250,0.12), transparent 60%),
      radial-gradient(900px 900px at 50% 110%, rgba(59,130,246,0.08), transparent 60%),
      linear-gradient(180deg, #0a1628 0%, #0e1e3a 50%, #0d2847 100%)
    `,
    accent: 'rgba(147,197,253,0.95)',
    accentGlow: 'rgba(96,165,250,0.12)',
    gold: GOLD,
    quoteBg: 'rgba(147,197,253,0.08)',
    quoteBorder: 'rgba(147,197,253,0.5)',
    quoteGlow: 'rgba(147,197,253,0.25)',
    sacredStroke: 'rgba(147,197,253,0.4)',
  },
  healing: {
    background: `
      radial-gradient(1200px 800px at 50% -10%, rgba(134,239,172,0.14), transparent 60%),
      radial-gradient(900px 900px at 50% 110%, rgba(52,211,153,0.10), transparent 60%),
      linear-gradient(180deg, #052e16 0%, #064e3b 50%, #0a3d2e 100%)
    `,
    accent: 'rgba(134,239,172,0.95)',
    accentGlow: 'rgba(52,211,153,0.14)',
    gold: GOLD,
    quoteBg: 'rgba(134,239,172,0.1)',
    quoteBorder: 'rgba(134,239,172,0.55)',
    quoteGlow: 'rgba(134,239,172,0.3)',
    sacredStroke: 'rgba(134,239,172,0.5)',
  },
  gratitude: {
    background: `
      radial-gradient(1200px 800px at 50% -10%, rgba(253,186,116,0.14), transparent 60%),
      radial-gradient(900px 900px at 50% 110%, rgba(251,146,60,0.10), transparent 60%),
      linear-gradient(180deg, #29201a 0%, #3d2c1f 50%, #2d2318 100%)
    `,
    accent: 'rgba(253,186,116,0.95)',
    accentGlow: 'rgba(251,146,60,0.12)',
    gold: 'rgba(251,191,36,0.95)',
    quoteBg: 'rgba(253,186,116,0.1)',
    quoteBorder: 'rgba(253,186,116,0.5)',
    quoteGlow: 'rgba(253,186,116,0.25)',
    sacredStroke: 'rgba(253,186,116,0.5)',
  },
  silence: {
    background: `
      radial-gradient(1200px 800px at 50% -10%, rgba(203,213,225,0.08), transparent 60%),
      radial-gradient(900px 900px at 50% 110%, rgba(148,163,184,0.06), transparent 60%),
      linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #1e293b 100%)
    `,
    accent: 'rgba(203,213,225,0.9)',
    accentGlow: 'rgba(148,163,184,0.1)',
    gold: 'rgba(226,232,240,0.85)',
    quoteBg: 'rgba(203,213,225,0.08)',
    quoteBorder: 'rgba(203,213,225,0.45)',
    quoteGlow: 'rgba(203,213,225,0.2)',
    sacredStroke: 'rgba(203,213,225,0.35)',
  },
  love: {
    background: `
      radial-gradient(1200px 800px at 50% -10%, rgba(244,114,182,0.14), transparent 60%),
      radial-gradient(900px 900px at 50% 110%, rgba(167,139,250,0.10), transparent 60%),
      linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #2e1f4a 100%)
    `,
    accent: 'rgba(244,114,182,0.95)',
    accentGlow: 'rgba(167,139,250,0.12)',
    gold: 'rgba(251,207,232,0.9)',
    quoteBg: 'rgba(244,114,182,0.1)',
    quoteBorder: 'rgba(244,114,182,0.5)',
    quoteGlow: 'rgba(244,114,182,0.25)',
    sacredStroke: 'rgba(244,114,182,0.45)',
  },
};

function getFocusThemeId(focus: string): FocusThemeId {
  const id = focus.toLowerCase().trim();
  const valid: FocusThemeId[] = ['peace', 'focus', 'healing', 'gratitude', 'silence', 'love'];
  return valid.includes(id as FocusThemeId) ? (id as FocusThemeId) : 'healing';
}

/** Faint sacred geometry motif — theme-aware, 800px, centered */
const SacredMotif: React.FC<{ strokeColor: string }> = ({ strokeColor }) => (
  <svg
    width={800}
    height={800}
    viewBox="0 0 200 200"
    style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      opacity: 0.035,
      pointerEvents: 'none',
    }}
    aria-hidden
  >
    <circle cx="100" cy="100" r="95" fill="none" stroke={strokeColor} strokeWidth={0.5} />
    <circle cx="100" cy="100" r="70" fill="none" stroke={strokeColor} strokeWidth={0.4} opacity={0.8} />
    <circle cx="100" cy="100" r="45" fill="none" stroke={strokeColor} strokeWidth={0.35} opacity={0.6} />
  </svg>
);

/** Corner dots — 5 gold/accent beads per corner */
const CornerDots: React.FC<{ position: 'tl' | 'tr' | 'bl' | 'br'; color: string }> = ({ position, color }) => {
  const pos = {
    tl: { top: 36, left: 36 },
    tr: { top: 36, right: 36, left: 'auto' },
    bl: { bottom: 36, left: 36, top: 'auto' },
    br: { bottom: 36, right: 36, left: 'auto', top: 'auto' },
  }[position];
  return (
    <div
      style={{
        position: 'absolute',
        ...pos,
        display: 'flex',
        gap: 6,
        opacity: 0.4,
        ...(position === 'tr' || position === 'br' ? { flexDirection: 'row-reverse' } : {}),
      }}
      aria-hidden
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: color,
          }}
        />
      ))}
    </div>
  );
};

export const LiveMeditationStoryCard: React.FC<{
  data: LiveMeditationStoryData;
  className?: string;
  static?: boolean;
}> = ({ data, className = '', static: _isStatic }) => {
  const {
    date,
    focus,
    durationMinutes,
    quote,
    heartsReceived,
    spiritualChallenge,
    userName,
  } = data;

  const themeId = getFocusThemeId(focus);
  const palette = FOCUS_PALETTES[themeId];

  return (
    <div
      className={className}
      style={{
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 44,
        background: palette.background,
        boxShadow: 'inset 0 0 200px rgba(0,0,0,0.6), 0 40px 120px rgba(0,0,0,0.7)',
        fontFamily: 'Inter, system-ui, -apple-system, "SF Pro Display", sans-serif',
      }}
    >
      <SacredMotif strokeColor={palette.sacredStroke} />

      <CornerDots position="tl" color={palette.gold} />
      <CornerDots position="tr" color={palette.gold} />
      <CornerDots position="bl" color={palette.gold} />
      <CornerDots position="br" color={palette.gold} />

      {/* Centered content — tighter gaps, larger type */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '120px 72px 80px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 48,
          boxSizing: 'border-box',
        }}
      >
        {/* User name + Ritual label + Main title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          {userName?.trim() && (
            <div
              style={{
                fontSize: 30,
                fontWeight: 600,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: palette.gold,
                marginBottom: 14,
              }}
            >
              {userName.trim()}&apos;s Ritual
            </div>
          )}
          <div
            style={{
              fontSize: 27,
              fontWeight: 600,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: palette.gold,
              marginBottom: userName?.trim() ? 16 : 20,
            }}
          >
            Ritual Completed
          </div>
          <h1
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 96,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '0.02em',
              color: TEXT,
              margin: '20px 0 0 0',
              textTransform: 'uppercase',
            }}
          >
            Live Meditation
          </h1>
          <div
            style={{
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: palette.accent,
              marginTop: 20,
            }}
          >
            SCHOOL OF BREATH APP
          </div>
        </div>

        {/* White divider */}
        <div
          style={{
            width: '100%',
            maxWidth: 360,
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
            flexShrink: 0,
          }}
        />

        {/* Stats row — larger labels & values */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px 28px',
            flexShrink: 0,
          }}
        >
          {[
            { label: 'FOCUS', value: focus },
            { label: 'TIME', value: `${durationMinutes} min` },
            { label: 'HEARTS', value: heartsReceived.toLocaleString() },
          ].map(({ label, value }, i) => (
            <React.Fragment key={label}>
              {i > 0 && (
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 18 }}>·</span>
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 36,
                  color: MUTED,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                <span>{label}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>•</span>
                <span style={{ color: TEXT, fontSize: 40, fontWeight: 700, textTransform: 'none', letterSpacing: '0' }}>
                  {value}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Hero quote — white border, large type */}
        <div
          style={{
            width: '100%',
            maxWidth: 900,
            padding: '56px 56px',
            background: palette.quoteBg,
            border: '2px solid rgba(255,255,255,0.45)',
            borderRadius: 32,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 32px rgba(255,255,255,0.08), inset 0 0 30px rgba(255,255,255,0.03)',
          }}
        >
          <p
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 66,
              lineHeight: 1.35,
              color: TEXT,
              letterSpacing: '0.01em',
              textAlign: 'center',
              margin: 0,
            }}
          >
            &ldquo;{quote || 'Each breath invites tenderness and repair.'}&rdquo;
          </p>
        </div>

        {/* White divider */}
        <div
          style={{
            width: '100%',
            maxWidth: 320,
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
            flexShrink: 0,
          }}
        />

        {/* Spiritual Challenge — larger text */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: palette.gold,
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <span style={{ fontSize: 22 }}>★</span>
            Today&apos;s Spiritual Challenge
            <span style={{ fontSize: 22 }}>★</span>
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.28,
              color: TEXT,
              maxWidth: 860,
              textShadow: `0 0 32px ${palette.gold}35`,
            }}
          >
            {spiritualChallenge}
          </div>
        </div>

        {/* Signature footer — larger */}
        <footer
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            marginTop: 'auto',
            paddingTop: 16,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: 32,
              fontStyle: 'italic',
              color: MUTED,
            }}
          >
            This moment belongs to you.
          </div>
          <div
            style={{
              fontWeight: 600,
              letterSpacing: '0.08em',
              fontSize: 26,
              color: MUTED,
            }}
          >
            Breathe. Heal. Share.
          </div>
          <div
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: palette.accent,
            }}
          >
            The School of Breath App
          </div>
        </footer>
      </div>
    </div>
  );
};
