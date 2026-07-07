import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "./AppText";
import { colors } from "../theme/colors";
import { fontSize, fontWeight } from "../theme/fonts";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "ghost";
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = "primary", loading = false, icon, style }: ButtonProps) {
  const isGhost = variant === "ghost";

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
        style={({ pressed }) => [
        styles.button,
        isGhost ? styles.ghost : styles.primary,
        pressed && styles.pressed,
        style
      ]}
    >
      <LinearGradient
        colors={isGhost ? ["rgba(255,255,255,0.07)", "rgba(148,163,184,0.08)"] : [colors.primaryDark, colors.info]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fill}
      >
        {loading ? <ActivityIndicator color={colors.ink} /> : icon}
        <AppText style={[styles.label, isGhost ? styles.ghostLabel : styles.primaryLabel]}>{title}</AppText>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  fill: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    alignSelf: "stretch"
  },
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.26,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6
  },
  ghost: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }]
  },
  label: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.input
  },
  primaryLabel: {
    color: colors.ink
  },
  ghostLabel: {
    color: colors.ink
  }
});
