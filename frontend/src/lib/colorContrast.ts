const DEFAULT_DARK_TEXT_COLOR = "#000000";
const DEFAULT_LIGHT_TEXT_COLOR = "#ffffff";

function normalizeHexColor(color: string): string | null {
  const trimmedColor = color.trim();
  const hexValue = trimmedColor.startsWith("#")
    ? trimmedColor.slice(1)
    : trimmedColor;

  if (/^[\da-fA-F]{3}$/.test(hexValue)) {
    return hexValue
      .split("")
      .map((character) => `${character}${character}`)
      .join("")
      .toLowerCase();
  }

  if (/^[\da-fA-F]{6}$/.test(hexValue)) {
    return hexValue.toLowerCase();
  }

  return null;
}

function parseHexColor(color: string): [number, number, number] | null {
  const normalizedColor = normalizeHexColor(color);

  if (!normalizedColor) {
    return null;
  }

  return [
    Number.parseInt(normalizedColor.slice(0, 2), 16),
    Number.parseInt(normalizedColor.slice(2, 4), 16),
    Number.parseInt(normalizedColor.slice(4, 6), 16),
  ];
}

function toLinearSrgb(channel: number): number {
  const normalizedChannel = channel / 255;

  if (normalizedChannel <= 0.04045) {
    return normalizedChannel / 12.92;
  }

  return ((normalizedChannel + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance([red, green, blue]: [number, number, number]) {
  const linearRed = toLinearSrgb(red);
  const linearGreen = toLinearSrgb(green);
  const linearBlue = toLinearSrgb(blue);

  return linearRed * 0.2126 + linearGreen * 0.7152 + linearBlue * 0.0722;
}

function getContrastRatio(firstLuminance: number, secondLuminance: number) {
  const lighterLuminance = Math.max(firstLuminance, secondLuminance);
  const darkerLuminance = Math.min(firstLuminance, secondLuminance);

  return (lighterLuminance + 0.05) / (darkerLuminance + 0.05);
}

function getColorLuminance(color: string, fallbackLuminance: number): number {
  const rgbColor = parseHexColor(color);

  if (!rgbColor) {
    return fallbackLuminance;
  }

  return getRelativeLuminance(rgbColor);
}

/**
 * Returns whichever candidate text color has the stronger contrast ratio.
 */
export function getReadableTextColor(
  backgroundColor: string,
  darkTextColor = DEFAULT_DARK_TEXT_COLOR,
  lightTextColor = DEFAULT_LIGHT_TEXT_COLOR,
): string {
  const rgbColor = parseHexColor(backgroundColor);

  if (!rgbColor) {
    return darkTextColor;
  }

  const backgroundLuminance = getRelativeLuminance(rgbColor);
  const darkLuminance = getColorLuminance(darkTextColor, 0);
  const lightLuminance = getColorLuminance(lightTextColor, 1);
  const darkContrast = getContrastRatio(backgroundLuminance, darkLuminance);
  const lightContrast = getContrastRatio(backgroundLuminance, lightLuminance);

  return darkContrast >= lightContrast ? darkTextColor : lightTextColor;
}
