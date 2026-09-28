interface ProgressRingProps {
  progress: number;
  size?: number;
  stroke?: number;
}

export const ProgressRing = ({ progress, size = 80, stroke = 6 }: ProgressRingProps) => {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(Math.max(progress, 0), 100) / 100) * circumference;
  return (
    <svg aria-hidden="true" className="-rotate-90" height={size} width={size}>
      <circle className="text-line" cx={size / 2} cy={size / 2} fill="none" r={radius} stroke="currentColor" strokeWidth={stroke} />
      <circle
        className="text-accent transition-[stroke-dashoffset] duration-700"
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        stroke="currentColor"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        strokeWidth={stroke}
      />
    </svg>
  );
};
