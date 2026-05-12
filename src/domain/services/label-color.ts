/**
 * Deterministic label → pastel color mapping.
 * Uses a string hash to pick hue, with fixed saturation and lightness for pastel look.
 * Returns CSS-ready HSL color strings.
 */

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

export interface LabelColor {
  bg: string;
  text: string;
}

export function getLabelColor(label: string): LabelColor {
  const hash = hashString(label);
  // Golden angle spreads hues evenly across the spectrum
  const hue = (hash * 137.508) % 360;
  return {
    bg: `hsl(${Math.round(hue)}, 55%, 88%)`,
    text: `hsl(${Math.round(hue)}, 45%, 35%)`,
  };
}
