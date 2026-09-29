import { useMemo } from "react";

import { getCoverPalette, isUnknownAuthor, splitTitleForSvg } from "@/utils/generativeCover";

export interface GenerativeBookCoverProps {
  author?: string;
  className?: string;
  title: string;
  variant?: "compact" | "default" | "featured";
}

const WIDTH = 400;
const HEIGHT = 600;
const LABEL = { height: 260, width: 268, x: 84, y: 150 };

export function GenerativeBookCover({ author, className = "", title, variant = "default" }: GenerativeBookCoverProps) {
  const isCompact = variant === "compact";
  const palette = useMemo(() => getCoverPalette(title, author), [title, author]);
  const lines = useMemo(() => splitTitleForSvg(title, isCompact ? 12 : 15), [title, isCompact]);
  const showAuthor = !isUnknownAuthor(author);
  const authorText = (author ?? "").trim().slice(0, 28).toUpperCase();

  const longest = Math.max(...lines.map((line) => line.length), 1);
  const authorSpace = showAuthor ? 64 : 0;
  const widthFit = (LABEL.width - 44) / (longest * 0.52);
  const heightFit = (LABEL.height - 44 - authorSpace) / (lines.length * 1.12);
  const fontSize = Math.round(Math.max(18, Math.min(isCompact ? 44 : 40, widthFit, heightFit)));
  const lineHeight = fontSize * 1.12;
  const blockHeight = (lines.length - 1) * lineHeight + authorSpace;
  const titleTop = LABEL.y + LABEL.height / 2 - blockHeight / 2 + fontSize * 0.34;
  const ruleY = titleTop + (lines.length - 1) * lineHeight + 26;

  return (
    <svg
      aria-label={`Cover for ${title}`}
      className={`h-full w-full select-none ${className}`}
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill={palette.cloth} height={HEIGHT} width={WIDTH} />
      <rect fill={palette.shade} height={HEIGHT} width="46" />
      <rect fill="#000" height={HEIGHT} opacity="0.18" width="4" x="46" />
      <rect fill="#fff" height={HEIGHT} opacity="0.07" width="2" x="50" />

      <rect fill="none" height="548" opacity="0.7" stroke={palette.foil} strokeWidth="2" width="290" x="73" y="26" />
      <rect fill="none" height="536" opacity="0.45" stroke={palette.foil} strokeWidth="1" width="278" x="79" y="32" />

      <rect fill="#000" height={LABEL.height} opacity="0.18" width={LABEL.width} x={LABEL.x + 3} y={LABEL.y + 4} />
      <rect fill={palette.label} height={LABEL.height} width={LABEL.width} x={LABEL.x} y={LABEL.y} />
      <rect
        fill="none"
        height={LABEL.height - 16}
        stroke={palette.ink}
        strokeOpacity="0.55"
        strokeWidth="1"
        width={LABEL.width - 16}
        x={LABEL.x + 8}
        y={LABEL.y + 8}
      />

      {lines.map((line, index) => (
        <text
          fill={palette.ink}
          fontFamily="Newsreader, 'Crimson Pro', Georgia, serif"
          fontSize={fontSize}
          fontWeight="500"
          key={index}
          letterSpacing="-0.5"
          textAnchor="middle"
          x={LABEL.x + LABEL.width / 2}
          y={Math.round(titleTop + index * lineHeight)}
        >
          {line}
        </text>
      ))}

      {showAuthor && (
        <>
          <line opacity="0.6" stroke={palette.ink} strokeWidth="1" x1={LABEL.x + LABEL.width / 2 - 22} x2={LABEL.x + LABEL.width / 2 + 22} y1={ruleY} y2={ruleY} />
          <text
            fill={palette.ink}
            fontFamily="'Instrument Sans', system-ui, sans-serif"
            fontSize={isCompact ? 17 : 14}
            fontWeight="600"
            letterSpacing="2.5"
            opacity="0.85"
            textAnchor="middle"
            x={LABEL.x + LABEL.width / 2}
            y={ruleY + 30}
          >
            {authorText}
          </text>
        </>
      )}

      <text fill={palette.foil} fontFamily="Georgia, serif" fontSize="26" opacity="0.75" textAnchor="middle" x={LABEL.x + LABEL.width / 2} y="505">
        ❧
      </text>
    </svg>
  );
}
