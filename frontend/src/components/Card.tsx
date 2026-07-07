import { ReactNode } from "react";
import { ColorValue, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme/colors";

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
  gradientColors?: readonly [ColorValue, ColorValue, ...ColorValue[]];
}

export function Card({ children, style, glow = false, gradientColors }: CardProps) {
  return (
    <LinearGradient
      colors={gradientColors ?? (glow ? ["rgba(56, 189, 248, 0.18)", "rgba(139, 92, 246, 0.13)"] : ["rgba(255,255,255,0.075)", "rgba(255,255,255,0.032)"])}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, glow && styles.glow, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    overflow: "hidden",
    shadowColor: "#020617",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 4
  },
  glow: {
    borderColor: "rgba(94, 234, 212, 0.28)",
    shadowColor: colors.cyan,
    shadowOpacity: 0.18,
    elevation: 7
  }
});
