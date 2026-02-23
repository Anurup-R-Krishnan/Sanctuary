import React, {
  useState, useEffect, useMemo, useRef, useCallback,
} from "react";
import type { Book, SortOption, FilterOption } from "@/types";
import { Star, Clock, Search, BookOpen, SortAsc, Filter, ChevronDown, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BookCard from "../ui/BookCard";
import BookDetailModal from "../ui/BookDetailModal";
import AddBookButton from "../ui/AddBookButton";
import { useBookStore } from "@/store/useBookStore";
import { useUIStore } from "@/store/useUIStore";
import { useShallow } from "zustand/react/shallow";

// ─── Color palette (lifted directly from the image) ──────────────────────────
const C = {
  cream: "#EAE3D0",
  parchment: "#DDD4B8",
  aged: "#CFC5A2",
  navy: "#243352",
  navyMid: "#2D4468",
  navyLight: "#3A5580",
  sage: "#7BA492",
  sageDark: "#5A8070",
  sageMist: "#A4C2B4",
  gold: "#C8A440",
  goldLight: "#DCBC62",
  botanical: "#6B8B52",
  botanicalLt: "#8EAA72",
  lavender: "#9880B4",
  warmBrown: "#7A5C3E",
  darkInk: "#3A2E22",
  sheetPaper: "#E6DCB8",
  smoke: "rgba(220,210,190,0.55)",
  shadow: "rgba(30,20,10,0.22)",
};

// ─── Injected CSS ─────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=Nunito:wght@400;600;700;800&display=swap');

  .lib-canvas-root * { box-sizing: border-box; }
  .lib-canvas-root { font-family: 'Nunito', sans-serif; }

  @keyframes steamRise {
    0%   { transform: translateY(0) translateX(0) scaleX(1); opacity: 0; }
    12%  { opacity: 0.6; }
    50%  { transform: translateY(-90px) translateX(12px) scaleX(1.5); opacity: 0.35; }
    88%  { opacity: 0.08; }
    100% { transform: translateY(-180px) translateX(-6px) scaleX(0.8); opacity: 0; }
  }
  @keyframes steamRise2 {
    0%   { transform: translateY(0) scaleX(1); opacity: 0; }
    15%  { opacity: 0.45; }
    55%  { transform: translateY(-110px) translateX(-14px) scaleX(1.3); opacity: 0.25; }
    90%  { opacity: 0.06; }
    100% { transform: translateY(-200px) translateX(8px) scaleX(0.7); opacity: 0; }
  }
  @keyframes starSway {
    0%, 100% { transform: rotate(-4deg); }
    50%       { transform: rotate(3deg); }
  }
  @keyframes moonGlow {
    0%, 100% { filter: drop-shadow(0 0 6px rgba(200,164,64,0.5)); }
    50%       { filter: drop-shadow(0 0 14px rgba(200,164,64,0.8)); }
  }
  @keyframes wheelSpin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes beadFloat {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-4px); }
  }
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  @keyframes candleFlicker {
    0%,100% { transform: scaleY(1) translateX(0); opacity: 0.9; }
    25%  { transform: scaleY(1.12) translateX(1px); opacity: 1; }
    50%  { transform: scaleY(0.9) translateX(-1px); opacity: 0.85; }
    75%  { transform: scaleY(1.08) translateX(0.5px); opacity: 0.95; }
  }

  .steam { animation: steamRise 5.5s ease-in-out infinite; }
  .steam2 { animation: steamRise2 7s 1.8s ease-in-out infinite; }
  .star-chain { animation: starSway 4s ease-in-out infinite; transform-origin: top center; }
  .moon-glow  { animation: moonGlow 3s ease-in-out infinite; }
  .bead-float { animation: beadFloat 3.5s ease-in-out infinite; }

  .book-skeleton {
    background: linear-gradient(90deg, ${C.parchment} 25%, ${C.cream} 50%, ${C.parchment} 75%);
    background-size: 600px 100%;
    animation: shimmer 2.4s ease-in-out infinite;
  }

  .floating-controls {
    position: fixed;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: 99px;
    background: ${C.cream};
    box-shadow:
      -4px -4px 12px rgba(255,248,230,0.9),
       6px  6px 18px ${C.shadow};
    border: 1px solid rgba(200,164,64,0.2);
    backdrop-filter: blur(8px);
  }
  .ctrl-btn {
    display: flex; align-items: center; gap: 5px;
    padding: 6px 12px; border-radius: 99px; border: none; cursor: pointer;
    font-family: 'Nunito', sans-serif; font-size: 12px; font-weight: 700;
    color: ${C.darkInk}; background: transparent;
    transition: background 0.2s, transform 0.15s;
    letter-spacing: 0.03em;
  }
  .ctrl-btn:hover { background: rgba(200,164,64,0.15); transform: translateY(-1px); }
  .ctrl-btn.active { background: ${C.parchment}; box-shadow: inset 1px 1px 4px ${C.shadow}; }
  .ctrl-divider { width: 1px; height: 20px; background: ${C.aged}; opacity: 0.5; }

  .dropdown-panel {
    position: fixed;
    bottom: 72px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    padding: 8px 0;
    border-radius: 18px;
    background: ${C.cream};
    box-shadow: -6px -6px 18px rgba(255,248,230,0.9), 8px 8px 22px ${C.shadow};
    border: 1px solid rgba(200,164,64,0.18);
    min-width: 160px;
  }
  .dropdown-item {
    width: 100%; text-align: left; padding: 9px 16px;
    font-family: 'Nunito', sans-serif; font-size: 12px; font-weight: 600;
    color: ${C.warmBrown}; background: transparent; border: none; cursor: pointer;
    transition: background 0.15s;
  }
  .dropdown-item:hover { background: rgba(200,164,64,0.1); }
  .dropdown-item.sel { color: ${C.darkInk}; font-weight: 800; background: rgba(200,164,64,0.12); }

  .book-wrapper:hover { z-index: 50 !important; }

  .ctrl-btn span { display: none; }
  @media (min-width: 480px) {
    .ctrl-btn span { display: inline; }
  }
`;

// ─── Torn-edge clip-path ─────────────────────────────────────────────────────
const tornEdge = (seed: number) => {
  const top: string[] = [], bot: string[] = [];
  for (let i = 0; i <= 20; i++) {
    const x = (i / 20) * 100;
    const y = ((Math.sin(i * seed * 1.7 + seed) + 1) / 2) * 4;
    top.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
  }
  for (let i = 20; i >= 0; i--) {
    const x = (i / 20) * 100;
    const y = 100 - ((Math.sin(i * seed * 2.1 + seed + 3) + 1) / 2) * 4;
    bot.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
  }
  return `polygon(${top.join(", ")}, ${bot.join(", ")})`;
};

// ─── Star field SVG ──────────────────────────────────────────────────────────
const StarField = () => {
  const stars = useMemo(() => {
    const arr = [];
    const seed = [0.13, 0.47, 0.82, 0.25, 0.61, 0.38, 0.74, 0.19, 0.55, 0.92,
      0.07, 0.44, 0.78, 0.31, 0.66, 0.12, 0.50, 0.85, 0.23, 0.59,
      0.94, 0.36, 0.71, 0.15, 0.48, 0.83, 0.27, 0.63, 0.39, 0.75];
    for (let i = 0; i < 28; i++) {
      arr.push({
        x: seed[i % seed.length] * 520 + (i * 13 % 80),
        y: seed[(i + 3) % seed.length] * 380 + (i * 7 % 60),
        r: (seed[(i + 7) % seed.length] * 1.5 + 0.6).toFixed(1),
        o: (seed[(i + 11) % seed.length] * 0.55 + 0.35).toFixed(2),
      });
    }
    // constellation lines
    const lines = [
      [0, 4], [4, 9], [9, 14], [14, 19], [2, 7], [7, 12], [12, 17],
      [1, 5], [5, 10], [10, 15], [3, 8], [8, 13], [6, 11], [16, 20],
    ];
    return { dots: arr, lines };
  }, []);

  return (
    <svg width="580" height="420" style={{ position: "absolute", inset: 0 }} fill="none">
      {stars.lines.map(([a, b], i) => (
        <line
          key={i}
          x1={stars.dots[a]?.x} y1={stars.dots[a]?.y}
          x2={stars.dots[b]?.x} y2={stars.dots[b]?.y}
          stroke={C.navyLight} strokeWidth="0.6" opacity="0.35"
        />
      ))}
      {stars.dots.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={C.sageMist} opacity={s.o} />
      ))}
    </svg>
  );
};

// ─── Hanging stars + moon ────────────────────────────────────────────────────
const HangingMoonStars = ({ style }: { style?: React.CSSProperties }) => (
  <div className="moon-glow" style={{ ...style, pointerEvents: "none" }}>
    <svg width="110" height="260" viewBox="0 0 110 260" fill="none">
      {/* string */}
      <line x1="55" y1="0" x2="55" y2="50" stroke={C.gold} strokeWidth="1.2" opacity="0.7" />
      {/* moon */}
      <g transform="translate(22, 50)">
        <path d="M33 0 Q55 8 55 33 Q55 58 33 66 Q50 55 50 33 Q50 11 33 0Z"
          fill={C.gold} opacity="0.85" />
        <circle cx="40" cy="33" r="22" fill={C.goldLight} opacity="0.3" />
      </g>
      {/* chain + star 1 */}
      <line x1="55" y1="116" x2="55" y2="145" stroke={C.gold} strokeWidth="1" opacity="0.55" />
      <g className="star-chain" transform="translate(41, 145)">
        <polygon points="14,0 17,9 27,9 19,15 22,24 14,18 6,24 9,15 1,9 11,9"
          fill={C.gold} opacity="0.8" />
      </g>
      {/* chain + star 2 */}
      <line x1="55" y1="175" x2="55" y2="205" stroke={C.gold} strokeWidth="0.9" opacity="0.45" />
      <g className="star-chain" style={{ animationDelay: "1.2s" }} transform="translate(47, 204)">
        <polygon points="8,0 10,5 16,5 11,9 13,14 8,11 3,14 5,9 0,5 6,5"
          fill={C.goldLight} opacity="0.75" />
      </g>
      {/* chain + tiny star 3 */}
      <line x1="55" y1="228" x2="55" y2="248" stroke={C.gold} strokeWidth="0.8" opacity="0.35" />
      <polygon points="55,248 57,254 63,254 58,258 60,264 55,260 50,264 52,258 47,254 53,254"
        fill={C.gold} opacity="0.6" />
    </svg>
  </div>
);

// ─── Botanical illustration (SVG) ────────────────────────────────────────────
const BotanicalIllustration = () => (
  <svg width="190" height="240" viewBox="0 0 190 240" fill="none" opacity="0.75">
    {/* stem */}
    <path d="M95 220 Q90 180 85 140 Q80 100 90 60" stroke={C.botanical} strokeWidth="2" fill="none" />
    {/* leaves */}
    <path d="M88 160 Q60 145 45 120 Q70 118 88 140Z" fill={C.botanicalLt} opacity="0.7" />
    <path d="M86 130 Q112 110 128 90 Q108 95 86 118Z" fill={C.botanical} opacity="0.65" />
    <path d="M84 100 Q58 85 50 65 Q72 68 84 90Z" fill={C.botanicalLt} opacity="0.6" />
    <path d="M88 75 Q110 55 120 38 Q102 48 88 68Z" fill={C.botanical} opacity="0.7" />
    {/* flower top */}
    <circle cx="90" cy="52" r="10" fill={C.lavender} opacity="0.55" />
    <circle cx="90" cy="52" r="5" fill={C.goldLight} opacity="0.7" />
    {/* small flowers along stem */}
    <circle cx="60" cy="125" r="5" fill={C.lavender} opacity="0.45" />
    <circle cx="115" cy="95" r="4" fill={C.lavender} opacity="0.4" />
    {/* root sprigs */}
    <path d="M93 210 Q75 225 65 235" stroke={C.botanical} strokeWidth="1.2" fill="none" opacity="0.5" />
    <path d="M97 215 Q115 228 122 238" stroke={C.botanical} strokeWidth="1.2" fill="none" opacity="0.5" />
    <path d="M65 235 Q60 240 55 242" stroke={C.botanical} strokeWidth="1" fill="none" opacity="0.4" />
    <path d="M122 238 Q128 242 132 244" stroke={C.botanical} strokeWidth="1" fill="none" opacity="0.4" />
    {/* small detail lines on leaves */}
    <path d="M70 130 Q78 136 86 140" stroke={C.botanical} strokeWidth="0.7" opacity="0.4" />
    <path d="M102 105 Q94 115 87 120" stroke={C.botanical} strokeWidth="0.7" opacity="0.4" />
  </svg>
);

// ─── Sheet music staff lines ─────────────────────────────────────────────────
const SheetMusicSVG = () => (
  <svg width="220" height="280" viewBox="0 0 220 280" fill="none" opacity="0.7">
    {[40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240].map((y, i) => (
      <line key={i} x1="15" y1={y} x2="205" y2={y} stroke={C.darkInk} strokeWidth="0.7" opacity="0.45" />
    ))}
    {/* treble clef */}
    <path d="M30 140 Q22 120 30 100 Q38 80 50 95 Q58 108 48 120 Q38 132 30 150 Q22 165 28 175 Q35 186 50 180"
      stroke={C.darkInk} strokeWidth="1.8" fill="none" opacity="0.5" strokeLinecap="round" />
    {/* notes */}
    {[
      { x: 70, y: 90, beam: true }, { x: 90, y: 80 }, { x: 110, y: 100 }, { x: 130, y: 85 },
      { x: 70, y: 170 }, { x: 90, y: 155 }, { x: 110, y: 165 }, { x: 130, y: 150 },
      { x: 150, y: 95 }, { x: 170, y: 105 }, { x: 150, y: 175 }, { x: 170, y: 160 },
    ].map((n, i) => (
      <g key={i}>
        <ellipse cx={n.x} cy={n.y} rx="5" ry="3.5" fill={C.darkInk} opacity="0.5" transform={`rotate(-15,${n.x},${n.y})`} />
        <line x1={n.x + 4} y1={n.y} x2={n.x + 4} y2={n.y - 20} stroke={C.darkInk} strokeWidth="1" opacity="0.45" />
      </g>
    ))}
    {/* bar lines */}
    <line x1="60" y1="35" x2="60" y2="115" stroke={C.darkInk} strokeWidth="1" opacity="0.3" />
    <line x1="140" y1="35" x2="140" y2="115" stroke={C.darkInk} strokeWidth="1" opacity="0.3" />
    <line x1="60" y1="155" x2="60" y2="235" stroke={C.darkInk} strokeWidth="1" opacity="0.3" />
    <line x1="140" y1="155" x2="140" y2="235" stroke={C.darkInk} strokeWidth="1" opacity="0.3" />
  </svg>
);

// ─── Vintage map circle ──────────────────────────────────────────────────────
const VintageMapCircle = () => (
  <svg width="480" height="480" viewBox="0 0 480 480" fill="none" opacity="0.35">
    <circle cx="240" cy="240" r="235" stroke={C.warmBrown} strokeWidth="1.5" fill="none" />
    <circle cx="240" cy="240" r="200" stroke={C.warmBrown} strokeWidth="0.7" fill="none" opacity="0.5" />
    {/* longitude lines */}
    {[0, 30, 60, 90, 120, 150].map((angle, i) => (
      <line key={i}
        x1={240 + 235 * Math.cos(angle * Math.PI / 180)} y1={240 + 235 * Math.sin(angle * Math.PI / 180)}
        x2={240 - 235 * Math.cos(angle * Math.PI / 180)} y2={240 - 235 * Math.sin(angle * Math.PI / 180)}
        stroke={C.warmBrown} strokeWidth="0.6" opacity="0.3" />
    ))}
    {/* latitude ovals */}
    {[40, 80, 120, 160].map((r, i) => (
      <ellipse key={i} cx="240" cy="240" rx={r + 80} ry={r} stroke={C.warmBrown} strokeWidth="0.5" fill="none" opacity="0.3" />
    ))}
    {/* landmass blobs (abstract) */}
    <path d="M180 200 Q200 175 230 185 Q255 175 270 195 Q285 215 265 230 Q245 245 220 235 Q195 245 185 225 Z"
      fill={C.warmBrown} opacity="0.2" />
    <path d="M260 280 Q280 265 300 275 Q315 285 305 300 Q290 315 270 305 Z"
      fill={C.warmBrown} opacity="0.18" />
    <path d="M145 250 Q160 240 175 250 Q185 265 170 275 Q155 280 145 265 Z"
      fill={C.warmBrown} opacity="0.15" />
    {/* compass rose */}
    <g transform="translate(395, 395)">
      <circle cx="0" cy="0" r="22" stroke={C.warmBrown} strokeWidth="0.8" fill="none" opacity="0.4" />
      <polygon points="0,-18 3,-5 0,-2 -3,-5" fill={C.warmBrown} opacity="0.4" />
      <polygon points="0,18 3,5 0,2 -3,5" fill={C.warmBrown} opacity="0.3" />
      <polygon points="-18,0 -5,3 -2,0 -5,-3" fill={C.warmBrown} opacity="0.3" />
      <polygon points="18,0 5,3 2,0 5,-3" fill={C.warmBrown} opacity="0.3" />
    </g>
  </svg>
);

// ─── RC car wheel ────────────────────────────────────────────────────────────
const RCWheel = ({ size = 42, spin = false, style }: { size?: number; spin?: boolean; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 42 42" fill="none" style={style}>
    <circle cx="21" cy="21" r="19" fill={C.darkInk} opacity="0.28" />
    <circle cx="21" cy="21" r="15" fill={C.warmBrown} opacity="0.32" />
    <circle cx="21" cy="21" r="8" fill={C.aged} opacity="0.55" />
    <g style={spin ? { animation: "wheelSpin 6s linear infinite", transformOrigin: "21px 21px" } : {}}>
      {[0, 60, 120, 180, 240, 300].map((a, i) => (
        <line key={i}
          x1={21 + 8 * Math.cos(a * Math.PI / 180)} y1={21 + 8 * Math.sin(a * Math.PI / 180)}
          x2={21 + 15 * Math.cos(a * Math.PI / 180)} y2={21 + 15 * Math.sin(a * Math.PI / 180)}
          stroke={C.darkInk} strokeWidth="1.8" opacity="0.22" />
      ))}
    </g>
    <circle cx="21" cy="21" r="3.5" fill={C.parchment} opacity="0.6" />
    {/* tread marks */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => (
      <rect key={i}
        x={21 + 17 * Math.cos(a * Math.PI / 180) - 1.5}
        y={21 + 17 * Math.sin(a * Math.PI / 180) - 1}
        width="3" height="2"
        fill={C.darkInk} opacity="0.18"
        transform={`rotate(${a}, ${21 + 17 * Math.cos(a * Math.PI / 180)}, ${21 + 17 * Math.sin(a * Math.PI / 180)})`}
      />
    ))}
  </svg>
);

// ─── Drumstick ───────────────────────────────────────────────────────────────
const Drumstick = ({ angle = 0, style }: { angle?: number; style?: React.CSSProperties }) => (
  <svg width="120" height="14" viewBox="0 0 120 14" fill="none" style={{ transform: `rotate(${angle}deg)`, ...style }}>
    <rect x="0" y="5" width="92" height="4" rx="2" fill={C.warmBrown} opacity="0.48" />
    <ellipse cx="106" cy="7" rx="12" ry="7" fill={C.warmBrown} opacity="0.52" />
    <ellipse cx="106" cy="7" rx="8" ry="5" fill={C.aged} opacity="0.45" />
    <ellipse cx="104" cy="5.5" rx="3" ry="2" fill={C.parchment} opacity="0.35" />
  </svg>
);

// ─── Volleyball ──────────────────────────────────────────────────────────────
const Volleyball = ({ size = 38, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 38 38" fill="none" style={style}>
    <circle cx="19" cy="19" r="18" fill={C.cream} opacity="0.75" stroke={C.aged} strokeWidth="1" />
    <path d="M5 12 Q19 19 33 12" stroke={C.warmBrown} strokeWidth="1.3" fill="none" opacity="0.45" />
    <path d="M3 22 Q19 15 35 22" stroke={C.warmBrown} strokeWidth="1.3" fill="none" opacity="0.45" />
    <path d="M8 5  Q11 19 8 33" stroke={C.warmBrown} strokeWidth="1.3" fill="none" opacity="0.38" />
    <path d="M30 5 Q27 19 30 33" stroke={C.warmBrown} strokeWidth="1.3" fill="none" opacity="0.38" />
    <path d="M14 2 Q12 19 14 36" stroke={C.warmBrown} strokeWidth="0.8" fill="none" opacity="0.25" />
  </svg>
);

// ─── Candle / Lighter (for smoking + lighting) ───────────────────────────────
const CandleDecor = ({ style }: { style?: React.CSSProperties }) => (
  <svg width="22" height="60" viewBox="0 0 22 60" fill="none" style={style}>
    {/* flame */}
    <path d="M11 8 Q7 2 9 0 Q11 -1 13 0 Q15 2 11 8Z" fill="#E8A030" opacity="0.8"
      style={{ animation: "candleFlicker 1.8s ease-in-out infinite", transformOrigin: "11px 8px" }} />
    <path d="M11 10 Q8 5 9.5 3 Q11 2 12.5 3 Q13 5 11 10Z" fill="#F0C040" opacity="0.6"
      style={{ animation: "candleFlicker 1.8s 0.4s ease-in-out infinite", transformOrigin: "11px 10px" }} />
    {/* wick */}
    <line x1="11" y1="10" x2="11" y2="14" stroke={C.darkInk} strokeWidth="1" opacity="0.6" />
    {/* candle body */}
    <rect x="7" y="13" width="8" height="36" rx="2" fill={C.cream} opacity="0.8" stroke={C.aged} strokeWidth="0.8" />
    {/* wax drip */}
    <path d="M7 22 Q5 25 6 30 Q7 32 7 22Z" fill={C.cream} opacity="0.55" />
    {/* holder */}
    <ellipse cx="11" cy="49" rx="10" ry="3.5" fill={C.aged} opacity="0.6" />
  </svg>
);

// ─── Smoke steam wisp ────────────────────────────────────────────────────────
const SteamWisp = ({ x = 0, delay = 0, className = "steam", style }: {
  x?: number; delay?: number; className?: string; style?: React.CSSProperties;
}) => (
  <div style={{
    position: "absolute", left: x, bottom: 0,
    width: 24, height: 140, pointerEvents: "none",
    animationDelay: `${delay}s`,
    background: "radial-gradient(ellipse at 50% 100%, rgba(200,190,170,0.5) 0%, transparent 70%)",
    filter: "blur(10px)",
    ...style,
  }} className={className} />
);

// ─── Glass bead ──────────────────────────────────────────────────────────────
const Bead = ({ color, size = 10, style }: { color: string; size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" style={style} className="bead-float">
    <circle cx="5" cy="5" r="4.5" fill={color} opacity="0.72" />
    <circle cx="3.5" cy="3.5" r="1.8" fill="rgba(255,255,255,0.5)" />
    <circle cx="7" cy="7" r="0.8" fill="rgba(255,255,255,0.2)" />
  </svg>
);

// ─── Small match ─────────────────────────────────────────────────────────────
const Match = ({ angle = 0, style }: { angle?: number; style?: React.CSSProperties }) => (
  <svg width="8" height="52" viewBox="0 0 8 52" fill="none"
    style={{ transform: `rotate(${angle}deg)`, ...style }}>
    <rect x="3" y="12" width="2" height="38" rx="1" fill={C.warmBrown} opacity="0.48" />
    <ellipse cx="4" cy="9" rx="4" ry="5" fill="#C45A38" opacity="0.6" />
    <ellipse cx="4" cy="9" rx="2.5" ry="3.2" fill="#E07850" opacity="0.5" />
    <circle cx="3.2" cy="7.5" r="0.8" fill="rgba(255,255,255,0.3)" />
  </svg>
);

// ─── "Finding my frequency" label ────────────────────────────────────────────
const FrequencyLabel = ({ style }: { style?: React.CSSProperties }) => (
  <div style={{
    display: "inline-block",
    background: C.cream,
    padding: "8px 22px",
    fontFamily: "'Lora', serif",
    fontStyle: "italic",
    fontSize: 17,
    color: C.darkInk,
    opacity: 0.88,
    boxShadow: `2px 3px 12px ${C.shadow}`,
    clipPath: tornEdge(3.7),
    letterSpacing: "0.01em",
    ...style,
  }}>
    finding my own frequency
  </div>
);


// ─── Clustered book pile ──────────────────────────────────────────────────────
const BookPile = ({
  books, label, x, y, onSelect, onToggleFavorite,
}: {
  books: Book[]; label?: string; x: number; y: number;
  onSelect: (b: Book) => void;
  onToggleFavorite: (id: string) => void;
}) => {
  const rotations = [-6, 3, -2, 5, -4, 7, -1, 4, -5, 2, 6, -3, 1, -7, 3];
  const offsets = [
    [0, 0], [12, -8], [-10, 5], [8, -14], [-6, 10], [14, -4], [-12, 8], [4, -10],
    [-8, 6], [10, -6], [-4, 12], [6, -8], [-10, 4], [8, -12], [-6, 8],
  ];

  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      {label && (
        <div style={{
          position: "absolute", top: -32, left: "50%", transform: "translateX(-50%)",
          fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 13,
          color: C.warmBrown, whiteSpace: "nowrap", opacity: 0.75,
          letterSpacing: "0.04em",
        }}>{label}</div>
      )}
      {books.slice(0, 12).map((book, i) => {
        const off = offsets[i % offsets.length];
        const rot = rotations[i % rotations.length];
        return (
          <motion.div
            key={book.id}
            className="book-wrapper"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.55, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: off[0],
              top: off[1],
              transform: `rotate(${rot}deg)`,
              zIndex: i + 1,
              cursor: "pointer",
              filter: `drop-shadow(3px 5px 10px ${C.shadow})`,
            }}
            whileHover={{ scale: 1.08, zIndex: 50, transition: { duration: 0.25 } }}
            onClick={() => onSelect(book)}
          >
            <BookCard
              book={book}
              onSelect={onSelect}
              onToggleFavorite={onToggleFavorite}
            />
          </motion.div>
        );
      })}
    </div>
  );
};

// ─── LIBRARY PAGE SIZE ────────────────────────────────────────────────────────
const LIBRARY_PAGE_SIZE = 40;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
interface LibraryGridProps { onSelectBook: (book: Book) => void; }

const LibraryGrid: React.FC<LibraryGridProps> = ({ onSelectBook }) => {
  const { searchTerm } = useUIStore(useShallow(s => ({ searchTerm: s.searchTerm })));
  const {
    books, sortedBooks, recentBooks, favoriteBooks,
    addBook, isLoading, sortBy, setSortBy, filterBy, setFilterBy,
    toggleFavorite: onToggleFavorite,
  } = useBookStore(useShallow(s => ({
    books: s.books, sortedBooks: s.sortedBooks,
    recentBooks: s.recentBooks, favoriteBooks: s.favoriteBooks,
    addBook: s.addBook, isLoading: s.isLoading,
    sortBy: s.sortBy, setSortBy: s.setSortBy,
    filterBy: s.filterBy, setFilterBy: s.setFilterBy,
    toggleFavorite: s.toggleFavorite,
  })));

  const [visibleCount, setVisibleCount] = useState(LIBRARY_PAGE_SIZE);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // ── Drag state ──────────────────────────────────────────────────────────────
  const [offset, setOffset] = useState({ x: -500, y: -300 });
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetAtStart = useRef({ x: -500, y: -300 });
  const viewportRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".ctrl-btn, .dropdown-panel, .book-wrapper")) return;
    isDragging.current = true;
    hasDragged.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetAtStart.current = { ...offset };
    e.preventDefault();
  }, [offset]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged.current = true;
    setOffset({ x: offsetAtStart.current.x + dx, y: offsetAtStart.current.y + dy });
  }, []);

  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  // Touch support
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    isDragging.current = true;
    hasDragged.current = false;
    dragStart.current = { x: t.clientX, y: t.clientY };
    offsetAtStart.current = { ...offset };
  }, [offset]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const t = e.touches[0];
    const dx = t.clientX - dragStart.current.x;
    const dy = t.clientY - dragStart.current.y;
    hasDragged.current = true;
    setOffset({ x: offsetAtStart.current.x + dx, y: offsetAtStart.current.y + dy });
  }, []);

  const onTouchEnd = useCallback(() => { isDragging.current = false; }, []);

  // ── Sorted/filtered books ───────────────────────────────────────────────────
  const displayBooks = useMemo(() => {
    if (!searchTerm) return sortedBooks;
    const t = searchTerm.toLowerCase();
    return sortedBooks.filter(b =>
      b.title.toLowerCase().includes(t) ||
      b.author.toLowerCase().includes(t) ||
      (b.tags ?? []).some(tag => tag.toLowerCase().includes(t))
    );
  }, [sortedBooks, searchTerm]);

  useEffect(() => { setVisibleCount(LIBRARY_PAGE_SIZE); }, [searchTerm, sortBy, filterBy]);

  const deduplicatedBooks = useMemo(() => {
    if (searchTerm || filterBy !== "all") return displayBooks;
    const recentIds = new Set(recentBooks.slice(0, 8).map(b => b.id));
    const favoriteIds = new Set(favoriteBooks.slice(0, 8).map(b => b.id));
    return displayBooks.filter(b => !recentIds.has(b.id) && !favoriteIds.has(b.id));
  }, [displayBooks, recentBooks, favoriteBooks, searchTerm, filterBy]);

  const visibleBooks = useMemo(() => deduplicatedBooks.slice(0, visibleCount), [deduplicatedBooks, visibleCount]);

  // ── Parallax values ─────────────────────────────────────────────────────────
  const bgX = offset.x * 0.15;
  const bgY = offset.y * 0.15;
  const midX = offset.x * 0.50;
  const midY = offset.y * 0.50;
  const fgX = offset.x;
  const fgY = offset.y;

  // ── Sort / filter options ───────────────────────────────────────────────────
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "recent", label: "Recently Opened" },
    { value: "title", label: "Title" },
    { value: "author", label: "Author" },
    { value: "progress", label: "Progress" },
    { value: "added", label: "Date Added" },
  ];
  const filterOptions: { value: FilterOption; label: string }[] = [
    { value: "all", label: "All Books" },
    { value: "favorites", label: "Favourites" },
    { value: "to-read", label: "To Read" },
    { value: "reading", label: "Reading" },
    { value: "finished", label: "Finished" },
  ];

  // Book clusters on the canvas
  // Main area centered around ~(800, 600) in world space
  const recentCluster = { x: 680, y: 580 };
  const favCluster = { x: 280, y: 720 };
  const allBooksStart = { x: 1100, y: 500 };

  const allBooksPositions = useMemo(() => {
    const grid: Array<{ x: number; y: number }> = [];
    let col = 0, row = 0;
    visibleBooks.forEach((_, i) => {
      const jitter = [(i * 17) % 30 - 15, (i * 11) % 24 - 12];
      grid.push({ x: allBooksStart.x + col * 175 + jitter[0], y: allBooksStart.y + row * 240 + jitter[1] });
      col++;
      if (col > 4) { col = 0; row++; }
    });
    return grid;
  }, [visibleBooks.length]);

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!isLoading && books.length === 0) {
    return (
      <div className="lib-canvas-root" style={{
        position: "relative", width: "100%", minHeight: "100vh", overflow: "hidden",
        background: C.cream, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <style>{GLOBAL_CSS}</style>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          style={{
            textAlign: "center", padding: "48px 40px",
            background: `linear-gradient(135deg, ${C.cream}, ${C.parchment})`,
            borderRadius: "30% 20% 30% 20% / 20% 30% 20% 30%",
            boxShadow: `-10px -10px 28px rgba(255,248,230,0.95), 14px 14px 36px ${C.shadow}`,
            clipPath: tornEdge(2.4),
            maxWidth: 380,
          }}>
          <BookOpen style={{ width: 38, height: 38, color: C.warmBrown, marginBottom: 16, opacity: 0.7 }} strokeWidth={1.4} />
          <h2 style={{ fontFamily: "'Lora',serif", fontStyle: "italic", fontSize: 26, color: C.darkInk, marginBottom: 10 }}>
            Your desk awaits
          </h2>
          <p style={{ fontSize: 14, color: C.warmBrown, lineHeight: 1.7, opacity: 0.85, marginBottom: 28 }}>
            Drop your first book onto this canvas and watch the world fill up
          </p>
          <AddBookButton onAddBook={addBook} variant="inline" />
          <p style={{ fontSize: 11, color: C.warmBrown, opacity: 0.5, marginTop: 12, letterSpacing: "0.08em" }}>EPUB format supported</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="lib-canvas-root"
      ref={viewportRef}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "calc(100vh - 6rem)",
        height: "800px",
        overflow: "hidden",
        cursor: isDragging.current ? "grabbing" : "grab",
        userSelect: "none",
        background: C.cream,
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <style>{GLOBAL_CSS}</style>

      {/* ── Vignette overlay (always on top of world, below controls) ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 200, pointerEvents: "none",
        background: `radial-gradient(ellipse 75% 65% at 50% 50%, transparent 40%, rgba(30,20,10,0.18) 100%)`,
      }} />

      {/* ── DEEP BACKGROUND LAYER (parallax 0.15x) ─────────────────── */}
      <div style={{
        position: "absolute", inset: 0,
        transform: `translate(${bgX}px, ${bgY}px)`,
        pointerEvents: "none", zIndex: 1,
      }}>
        {/* Constellation patch — top right ish */}
        <div style={{
          position: "absolute", left: 640, top: -80,
          width: 580, height: 420,
          background: C.navy,
          clipPath: tornEdge(1.8),
          transform: "rotate(3deg)",
          overflow: "hidden",
        }}>
          <StarField />
        </div>
        {/* Second constellation patch — upper left */}
        <div style={{
          position: "absolute", left: 0, top: 60,
          width: 340, height: 260,
          background: C.navyMid,
          clipPath: tornEdge(2.3),
          transform: "rotate(-2deg)",
          overflow: "hidden",
          opacity: 0.85,
        }}>
          <StarField />
        </div>
        {/* Hanging stars — upper left */}
        <HangingMoonStars style={{ position: "absolute", left: 115, top: -10 }} />
        {/* Scattered single stars */}
        {[
          [420, 20], [580, 45], [720, 15], [290, 80], [850, 35],
          [960, 60], [170, 140], [1050, 90], [490, 110],
        ].map(([sx, sy], i) => (
          <div key={i} style={{
            position: "absolute", left: sx, top: sy,
            width: 3 + ((i * 3) % 4), height: 3 + ((i * 3) % 4), borderRadius: "50%",
            background: C.goldLight, opacity: 0.35 + (i % 4) * 0.1,
          }} />
        ))}
      </div>

      {/* ── MID LAYER (parallax 0.5x) ─────────────────────────────── */}
      <div style={{
        position: "absolute", inset: 0,
        transform: `translate(${midX}px, ${midY}px)`,
        pointerEvents: "none", zIndex: 2,
      }}>
        {/* Vintage map circle — center */}
        <div style={{ position: "absolute", left: 320, top: 90 }}>
          <VintageMapCircle />
        </div>

        {/* Botanical page — left */}
        <div style={{
          position: "absolute", left: 30, top: 280,
          width: 220, height: 290,
          background: C.parchment,
          clipPath: tornEdge(3.1),
          transform: "rotate(-4deg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `4px 6px 20px ${C.shadow}`,
          overflow: "hidden",
        }}>
          <BotanicalIllustration />
        </div>

        {/* Sheet music — right */}
        <div style={{
          position: "absolute", right: 180, top: 140,
          width: 250, height: 310,
          background: C.sheetPaper,
          clipPath: tornEdge(4.2),
          transform: "rotate(5deg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `5px 7px 22px ${C.shadow}`,
          padding: 18,
        }}>
          <SheetMusicSVG />
        </div>

        {/* Second botanical scrap — top center */}
        <div style={{
          position: "absolute", left: 580, top: 30,
          width: 170, height: 200,
          background: C.parchment,
          clipPath: tornEdge(2.7),
          transform: "rotate(2deg)",
          boxShadow: `3px 5px 16px ${C.shadow}`,
          overflow: "hidden",
          opacity: 0.85,
        }}>
          <div style={{ transform: "scale(0.8) translate(-15px, -20px)" }}>
            <BotanicalIllustration />
          </div>
        </div>

        {/* Torn text scrap — small */}
        <div style={{
          position: "absolute", left: 850, top: 320,
          width: 140, height: 90,
          background: C.aged,
          clipPath: tornEdge(5.1),
          transform: "rotate(-3deg)",
          padding: "12px 16px",
          boxShadow: `2px 4px 12px ${C.shadow}`,
        }}>
          <div style={{ fontFamily: "'Lora',serif", fontSize: 8.5, color: C.darkInk, opacity: 0.45, lineHeight: 1.6 }}>
            Lorem ipsum dolor sit amet<br />consectetur adipiscing<br />elit sed do eiusmod<br />tempor incididunt ut
          </div>
        </div>
      </div>

      {/* ── FOREGROUND WORLD (1:1) ─────────────────────────────────── */}
      <div style={{
        position: "absolute",
        transform: `translate(${fgX}px, ${fgY}px)`,
        width: 3600, height: 2600,
        zIndex: 3,
        pointerEvents: isDragging.current ? "none" : "auto",
      }}>

        {/* Sage / teal desk surface */}
        <div style={{
          position: "absolute", left: 100, top: 480,
          width: 1400, height: 600,
          background: `radial-gradient(ellipse 70% 50% at 45% 50%, ${C.sageMist} 0%, ${C.sage} 40%, ${C.sageDark} 100%)`,
          borderRadius: "50% 40% 35% 45% / 30% 50% 40% 35%",
          opacity: 0.45,
          filter: "blur(3px)",
          pointerEvents: "none",
        }} />

        {/* ── Decor objects scattered on desk ── */}

        {/* Drumstick pair — horizontal */}
        <div style={{ position: "absolute", left: 350, top: 470, pointerEvents: "none" }}>
          <Drumstick angle={-6} />
        </div>
        <div style={{ position: "absolute", left: 358, top: 490, pointerEvents: "none", opacity: 0.8 }}>
          <Drumstick angle={8} />
        </div>

        {/* RC wheels */}
        <div style={{ position: "absolute", left: 1240, top: 700, pointerEvents: "none" }}>
          <RCWheel size={56} spin />
        </div>
        <div style={{ position: "absolute", left: 1310, top: 720, pointerEvents: "none", opacity: 0.6 }}>
          <RCWheel size={34} />
        </div>
        <div style={{ position: "absolute", left: 280, top: 800, pointerEvents: "none", opacity: 0.55 }}>
          <RCWheel size={28} />
        </div>

        {/* Volleyball */}
        <div style={{ position: "absolute", left: 1180, top: 480, pointerEvents: "none", opacity: 0.7 }}>
          <Volleyball size={52} />
        </div>

        {/* Candles / lighters */}
        <div style={{ position: "absolute", left: 680, top: 530, pointerEvents: "none" }}>
          <CandleDecor />
        </div>
        <div style={{
          position: "absolute", left: 960, top: 610, pointerEvents: "none", opacity: 0.7,
          transform: "scale(0.8)"
        }}>
          <CandleDecor />
        </div>

        {/* Matches cluster */}
        <div style={{ position: "absolute", left: 810, top: 550, pointerEvents: "none" }}>
          <Match angle={15} />
        </div>
        <div style={{ position: "absolute", left: 824, top: 548, pointerEvents: "none", opacity: 0.7 }}>
          <Match angle={-5} />
        </div>
        <div style={{ position: "absolute", left: 836, top: 544, pointerEvents: "none", opacity: 0.6 }}>
          <Match angle={30} />
        </div>

        {/* "finding my own frequency" label */}
        <div style={{ position: "absolute", left: 520, top: 310, pointerEvents: "none" }}>
          <FrequencyLabel />
        </div>

        {/* Glass beads scattered */}
        {[
          { x: 420, y: 500, c: C.sage, s: 12, d: 0 },
          { x: 750, y: 460, c: C.gold, s: 9, d: 0.6 },
          { x: 900, y: 530, c: C.lavender, s: 11, d: 1.2 },
          { x: 1050, y: 495, c: C.sageMist, s: 8, d: 0.3 },
          { x: 570, y: 720, c: C.gold, s: 10, d: 0.9 },
          { x: 1150, y: 640, c: C.lavender, s: 9, d: 1.5 },
          { x: 340, y: 660, c: C.sage, s: 13, d: 0.5 },
          { x: 200, y: 520, c: C.goldLight, s: 8, d: 1.8 },
          { x: 1280, y: 580, c: C.sageMist, s: 11, d: 0.2 },
        ].map((b, i) => (
          <div key={i} style={{
            position: "absolute", left: b.x, top: b.y, pointerEvents: "none",
            animationDelay: `${b.d}s`,
          }}>
            <Bead color={b.c} size={b.s} />
          </div>
        ))}

        {/* Steam wisps */}
        <div style={{ position: "absolute", left: 682, top: 490, pointerEvents: "none" }}>
          <SteamWisp x={8} delay={0} className="steam" />
          <SteamWisp x={18} delay={2.2} className="steam2" />
          <SteamWisp x={-4} delay={4.1} className="steam" />
        </div>

        {/* ── Book piles ───────────────────────────────────────────── */}

        <AnimatePresence>
          {/* Recently Reading */}
          {recentBooks.length > 0 && filterBy === "all" && !searchTerm && (
            <BookPile
              books={recentBooks.slice(0, 8)}
              label="continue reading"
              x={recentCluster.x}
              y={recentCluster.y}
              onSelect={b => { if (!hasDragged.current) setSelectedBook(b); }}
              onToggleFavorite={onToggleFavorite}
            />
          )}

          {/* Favorites */}
          {favoriteBooks.length > 0 && filterBy === "all" && !searchTerm && (
            <BookPile
              books={favoriteBooks.slice(0, 8)}
              label="favourites"
              x={favCluster.x}
              y={favCluster.y}
              onSelect={b => { if (!hasDragged.current) setSelectedBook(b); }}
              onToggleFavorite={onToggleFavorite}
            />
          )}

          {/* All / searched books — scattered across canvas */}
          {visibleBooks.map((book, i) => {
            const pos = allBooksPositions[i] || { x: allBooksStart.x + (i % 5) * 175, y: allBooksStart.y + Math.floor(i / 5) * 240 };
            const rot = ((i * 7) % 14) - 7;
            return (
              <motion.div
                key={book.id}
                className="book-wrapper"
                initial={{ opacity: 0, scale: 0.8, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ delay: i * 0.04, duration: 0.5, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  left: pos.x,
                  top: pos.y,
                  transform: `rotate(${rot}deg)`,
                  zIndex: i + 1,
                  cursor: "pointer",
                  filter: `drop-shadow(3px 5px 10px ${C.shadow})`,
                }}
                whileHover={{ scale: 1.09, zIndex: 80, transition: { duration: 0.22 } }}
                onClick={() => { if (!hasDragged.current) setSelectedBook(book); }}
              >
                <BookCard book={book} onSelect={b => {
                  if (!hasDragged.current) setSelectedBook(b);
                }} onToggleFavorite={onToggleFavorite} />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Lavender sprigs — decorative, near desk */}
        <svg width="120" height="160" viewBox="0 0 120 160" fill="none" opacity="0.55"
          style={{ position: "absolute", left: 1000, top: 400, pointerEvents: "none" }}>
          <line x1="60" y1="155" x2="55" y2="40" stroke={C.botanical} strokeWidth="1.5" />
          <line x1="60" y1="155" x2="70" y2="45" stroke={C.botanical} strokeWidth="1.5" />
          <line x1="60" y1="155" x2="45" y2="60" stroke={C.botanical} strokeWidth="1.2" />
          {[40, 55, 70, 85, 50, 65, 80].map((y, i) => (
            <React.Fragment key={i}>
              <ellipse cx={54 + (i % 3) * 6} cy={y} rx="4" ry="6" fill={C.lavender} opacity="0.7" transform={`rotate(-15,${54 + (i % 3) * 6},${y})`} />
              <ellipse cx={72 - (i % 3) * 4} cy={y + 5} rx="3.5" ry="5.5" fill={C.lavender} opacity="0.6" transform={`rotate(15,${72 - (i % 3) * 4},${y + 5})`} />
            </React.Fragment>
          ))}
        </svg>

      </div>{/* end foreground world */}

      {/* ── FLOATING CONTROLS (fixed to viewport) ─────────────────── */}

      {/* Sort dropdown */}
      <AnimatePresence>
        {showSortMenu && (
          <motion.div className="dropdown-panel"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18 }}
          >
            {sortOptions.map(o => (
              <button key={o.value} className={`dropdown-item ${sortBy === o.value ? "sel" : ""}`}
                onClick={() => { setSortBy(o.value); setShowSortMenu(false); }}>
                {o.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter dropdown */}
      <AnimatePresence>
        {showFilterMenu && (
          <motion.div className="dropdown-panel"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18 }}
          >
            {filterOptions.map(o => (
              <button key={o.value} className={`dropdown-item ${filterBy === o.value ? "sel" : ""}`}
                onClick={() => { setFilterBy(o.value); setShowFilterMenu(false); }}>
                {o.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="floating-controls">
        {/* Book count */}
        <span style={{
          fontFamily: "'Lora',serif", fontStyle: "italic", fontSize: 12,
          color: C.warmBrown, opacity: 0.8, paddingRight: 4, whiteSpace: "nowrap"
        }}>
          {books.length} {books.length === 1 ? "book" : "books"}
        </span>
        <div className="ctrl-divider" />

        {/* Sort */}
        <button className={`ctrl-btn ${showSortMenu ? "active" : ""}`}
          onClick={() => { setShowSortMenu(p => !p); setShowFilterMenu(false); }}>
          <SortAsc style={{ width: 13, height: 13 }} />
          <span>
            {sortOptions.find(o => o.value === sortBy)?.label}
          </span>
          <ChevronDown style={{ width: 11, height: 11, transition: "transform .3s", transform: showSortMenu ? "rotate(180deg)" : "none" }} />
        </button>

        {/* Filter */}
        <button className={`ctrl-btn ${showFilterMenu ? "active" : ""}`}
          onClick={() => { setShowFilterMenu(p => !p); setShowSortMenu(false); }}>
          <Filter style={{ width: 13, height: 13 }} />
          <span>{filterOptions.find(o => o.value === filterBy)?.label}</span>
          <ChevronDown style={{ width: 11, height: 11, transition: "transform .3s", transform: showFilterMenu ? "rotate(180deg)" : "none" }} />
        </button>

        <div className="ctrl-divider" />

        {/* Load more */}
        {visibleBooks.length < deduplicatedBooks.length && (
          <>
            <button className="ctrl-btn" onClick={() => setVisibleCount(p => p + LIBRARY_PAGE_SIZE)}>
              +{deduplicatedBooks.length - visibleBooks.length} more
            </button>
            <div className="ctrl-divider" />
          </>
        )}

        {/* Add book */}
        <AddBookButton onAddBook={addBook} />
      </div>

      {/* ── Book detail modal ────────────────────────────────────────── */}
      <BookDetailModal
        book={selectedBook}
        isOpen={!!selectedBook}
        onClose={() => setSelectedBook(null)}
        onRead={book => { setSelectedBook(null); onSelectBook(book); }}
        onToggleFavorite={onToggleFavorite}
      />
    </div>
  );
};

export default LibraryGrid;