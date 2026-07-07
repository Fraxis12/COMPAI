import { TextStyle } from "react-native";

export const fontFamily = {
  display: "JosefinSans_600SemiBold",
  light: "JosefinSans_300Light",
  regular: "JosefinSans_400Regular",
  medium: "JosefinSans_500Medium",
  semibold: "JosefinSans_600SemiBold",
  bold: "JosefinSans_600SemiBold",
  extrabold: "JosefinSans_600SemiBold"
} as const;

export const fontSize = {
  tiny: 10,
  tab: 11,
  caption: 12,
  small: 13,
  body: 14,
  input: 15,
  subtitle: 16,
  section: 18,
  title: 22,
  screenTitle: 30,
  brand: 52
} as const;

export const lineHeight = {
  compact: 18,
  body: 20,
  relaxed: 23,
  title: 30,
  screenTitle: 38,
  brand: 60
} as const;

export const fontWeight = {
  light: "300",
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "600",
  extrabold: "600",
  black: "600"
} as const;

export function familyForStyle(weight?: TextStyle["fontWeight"], size?: TextStyle["fontSize"]) {
  const normalized = String(weight ?? fontWeight.regular);
  const numericSize = typeof size === "number" ? size : fontSize.body;

  if (numericSize >= fontSize.title && ["600", "700", "800", "900", "bold"].includes(normalized)) {
    return fontFamily.display;
  }

  if (normalized === "900" || normalized === "800" || normalized === "700" || normalized === "bold") return fontFamily.semibold;
  if (normalized === "600") return fontFamily.semibold;
  if (normalized === "500") return fontFamily.medium;
  if (normalized === "300" || normalized === "200" || normalized === "100") return fontFamily.light;

  return fontFamily.regular;
}
