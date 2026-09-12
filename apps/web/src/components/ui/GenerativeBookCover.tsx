import React, { useMemo } from "react";

import {
  getGenerativeCoverStyle,
  splitTitleForSvg,
} from "@/utils/generativeCover";

export interface GenerativeBookCoverProps {
  author?: string;
  className?: string;
  title: string;
  variant?: "compact" | "default" | "featured";
}

export function GenerativeBookCover({
  author,
  className = "",
  title,
  variant = "default",
}: GenerativeBookCoverProps) {
  const isCompact = variant === "compact";
  const { motif, palette } = useMemo(
    () => getGenerativeCoverStyle(title, author),
    [title, author]
  );

  const titleLines = useMemo(
    () => splitTitleForSvg(title, isCompact ? 12 : 16),
    [title, isCompact]
  );

  const safeAuthor = (author || "").trim().slice(0, 26);
  const titleFontSize = isCompact ? 22 : titleLines.length > 2 ? 24 : 28;
  const titleLineHeight = titleFontSize * 1.3;
  const titleBlockHeight = titleLines.length * titleLineHeight;
  const titleStartY = 330 - titleBlockHeight / 2;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 600"
      className={`w-full h-full object-cover select-none ${className}`}
      role="img"
      aria-label={`Cover for ${title}`}
    >
      <defs>
        <linearGradient id={`grad-${palette.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.bgTop} />
          <stop offset="100%" stopColor={palette.bgBottom} />
        </linearGradient>
        <linearGradient id="spine-crease-3d" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(0,0,0,0.45)" />
          <stop offset="3%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="8%" stopColor="rgba(0,0,0,0.22)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
      </defs>

      {/* Book Cloth Background */}
      <rect width="400" height="600" fill={`url(#grad-${palette.id})`} />

      {/* Outer Foil Border */}
      <rect
        x="20"
        y="20"
        width="360"
        height="560"
        fill="none"
        stroke={palette.foil}
        strokeWidth="1.5"
        opacity="0.35"
      />
      <rect
        x="26"
        y="26"
        width="348"
        height="548"
        fill="none"
        stroke={palette.foil}
        strokeWidth="0.75"
        opacity="0.2"
      />

      {/* Top Geometric Motif */}
      <g>
        {motif === "arches" && (
          <>
            <path
              d="M 160 190 A 40 40 0 0 1 240 190 L 240 220 L 160 220 Z"
              fill="none"
              stroke={palette.foil}
              strokeWidth="2"
              opacity="0.6"
            />
            <path
              d="M 175 190 A 25 25 0 0 1 225 190 L 225 220 L 175 220 Z"
              fill="none"
              stroke={palette.foil}
              strokeWidth="1.5"
              opacity="0.4"
            />
            <circle cx="200" cy="180" r="4" fill={palette.foil} opacity="0.8" />
          </>
        )}
        {motif === "diamond" && (
          <>
            <polygon
              points="200,150 235,185 200,220 165,185"
              fill="none"
              stroke={palette.foil}
              strokeWidth="2"
              opacity="0.6"
            />
            <polygon
              points="200,162 223,185 200,208 177,185"
              fill="none"
              stroke={palette.foil}
              strokeWidth="1.5"
              opacity="0.4"
            />
            <circle cx="200" cy="185" r="3" fill={palette.foil} opacity="0.8" />
          </>
        )}
        {motif === "celestial" && (
          <>
            <circle
              cx="200"
              cy="185"
              r="35"
              fill="none"
              stroke={palette.foil}
              strokeWidth="1.5"
              opacity="0.5"
            />
            <circle
              cx="200"
              cy="185"
              r="22"
              fill="none"
              stroke={palette.foil}
              strokeWidth="2"
              opacity="0.7"
            />
            <circle cx="200" cy="185" r="8" fill={palette.foil} opacity="0.8" />
            <circle cx="230" cy="165" r="3" fill={palette.foil} opacity="0.9" />
          </>
        )}
        {motif === "bookplate" && (
          <>
            <rect
              x="170"
              y="160"
              width="60"
              height="50"
              fill="none"
              stroke={palette.foil}
              strokeWidth="1.5"
              opacity="0.6"
            />
            <line
              x1="160"
              y1="185"
              x2="240"
              y2="185"
              stroke={palette.foil}
              strokeWidth="1"
              opacity="0.4"
            />
            <line
              x1="200"
              y1="150"
              x2="200"
              y2="220"
              stroke={palette.foil}
              strokeWidth="1"
              opacity="0.4"
            />
            <circle cx="200" cy="185" r="4" fill={palette.foil} opacity="0.8" />
          </>
        )}
      </g>

      {/* Divider Rule */}
      <line
        x1="140"
        y1="260"
        x2="260"
        y2="260"
        stroke={palette.foil}
        strokeWidth="1"
        opacity="0.5"
      />

      {/* Book Title Text */}
      <g>
        {titleLines.map((line, i) => (
          <text
            key={i}
            x="200"
            y={Math.round(titleStartY + i * titleLineHeight)}
            textAnchor="middle"
            fill={palette.textColor}
            fontFamily="'Crimson Pro', Georgia, serif"
            fontSize={titleFontSize}
            fontWeight="600"
            letterSpacing="0.5"
          >
            {line}
          </text>
        ))}
      </g>

      {/* Author Attribution */}
      {safeAuthor && (
        <text
          x="200"
          y="470"
          textAnchor="middle"
          fill={palette.accent}
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="14"
          fontWeight="500"
          letterSpacing="1.5"
        >
          {safeAuthor.toUpperCase()}
        </text>
      )}

      {/* Bottom Sanctuary Insignia */}
      <text
        x="200"
        y="550"
        textAnchor="middle"
        fill={palette.foil}
        opacity="0.3"
        fontFamily="'Crimson Pro', Georgia, serif"
        fontSize="10"
        letterSpacing="2"
      >
        SANCTUARY
      </text>

      {/* Spine Crease Highlight */}
      <rect
        x="0"
        y="0"
        width="36"
        height="600"
        fill="url(#spine-crease-3d)"
        pointerEvents="none"
      />
    </svg>
  );
}
