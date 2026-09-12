export type SoundscapeType =
  | "fireplace"
  | "pink-noise"
  | "rain"
  | "waves"
  | "white-noise"
  | "wind";

export interface SoundscapeInfo {
  description: string;
  icon: string;
  id: SoundscapeType;
  label: string;
}

export const SOUNDSCAPES: SoundscapeInfo[] = [
  {
    description: "Gentle steady rainfall with distant soft drizzle",
    icon: "CloudRain",
    id: "rain",
    label: "Rainfall",
  },
  {
    description: "Rhythmic rolling ocean surf and tidal swell",
    icon: "Waves",
    id: "waves",
    label: "Ocean Waves",
  },
  {
    description: "Cozy crackling hearth with soothing ember pops",
    icon: "Flame",
    id: "fireplace",
    label: "Campfire",
  },
  {
    description: "Breezy rustling wind moving through tree canopies",
    icon: "Wind",
    id: "wind",
    label: "Forest Wind",
  },
  {
    description: "Balanced full-spectrum sound to mask ambient noise",
    icon: "Radio",
    id: "white-noise",
    label: "White Noise",
  },
  {
    description: "Gentle deeper acoustic masking for soothing focus",
    icon: "Disc",
    id: "pink-noise",
    label: "Pink Noise",
  },
];
