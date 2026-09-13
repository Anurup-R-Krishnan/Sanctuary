export interface AnnotationColor {
  bgClass: string;
  borderClass: string;
  description: string;
  id: string;
  label: string;
  name: string;
  textClass: string;
  value: string;
}

export const ANNOTATION_COLORS: AnnotationColor[] = [
  {
    bgClass: "bg-amber-400/20",
    borderClass: "border-amber-400",
    description: "Key ideas, thesis statements & memorable excerpts",
    id: "amber",
    label: "Amber",
    name: "Key Insight",
    textClass: "text-amber-700 dark:text-amber-300",
    value: "#f59e0b",
  },
  {
    bgClass: "bg-emerald-400/20",
    borderClass: "border-emerald-400",
    description: "Agreements, actionable principles & positive findings",
    id: "emerald",
    label: "Emerald",
    name: "Actionable",
    textClass: "text-emerald-700 dark:text-emerald-300",
    value: "#10b981",
  },
  {
    bgClass: "bg-indigo-400/20",
    borderClass: "border-indigo-400",
    description: "Questions, references to verify & research hooks",
    id: "indigo",
    label: "Indigo",
    name: "Question / Research",
    textClass: "text-indigo-700 dark:text-indigo-300",
    value: "#6366f1",
  },
  {
    bgClass: "bg-rose-400/20",
    borderClass: "border-rose-400",
    description: "Critiques, counterarguments & disputed passages",
    id: "rose",
    label: "Rose",
    name: "Critique",
    textClass: "text-rose-700 dark:text-rose-300",
    value: "#f43f5e",
  },
  {
    bgClass: "bg-purple-400/20",
    borderClass: "border-purple-400",
    description: "Stylistic phrasing, poetic prose & literary devices",
    id: "purple",
    label: "Purple",
    name: "Style / Prose",
    textClass: "text-purple-700 dark:text-purple-300",
    value: "#a855f7",
  },
];

export const DEFAULT_ANNOTATION_COLOR = ANNOTATION_COLORS[0];

export function getAnnotationColor(colorValue?: string): AnnotationColor {
  if (!colorValue) return DEFAULT_ANNOTATION_COLOR;

  const normalized = colorValue.toLowerCase().trim();
  // Support legacy #facc15 mapping to amber
  if (normalized === "#facc15") return DEFAULT_ANNOTATION_COLOR;

  const match = ANNOTATION_COLORS.find(
    (c) => c.value.toLowerCase() === normalized || c.id.toLowerCase() === normalized
  );

  return match || DEFAULT_ANNOTATION_COLOR;
}

export function getCategoryLabel(colorValue?: string): string {
  return getAnnotationColor(colorValue).name;
}

export function isColorMatchingFilter(
  colorValue: string,
  filterId: string
): boolean {
  if (filterId === "all") return true;
  const color = getAnnotationColor(colorValue);
  return color.id === filterId;
}
