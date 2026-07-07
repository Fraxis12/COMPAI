import { ReactNode } from "react";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  keyboardShouldPersistTaps?: boolean | "always" | "never" | "handled";
}

export function Screen({ children, scroll = true, style, keyboardShouldPersistTaps = "handled" }: ScreenProps) {
  const backdrop = (
    <>
      <View style={[styles.aura, styles.auraTop]} />
      <View style={[styles.aura, styles.auraBottom]} />
    </>
  );

  if (!scroll) {
    return (
      <LinearGradient colors={[colors.background, colors.backgroundAlt, "#111827"]} style={styles.gradient}>
        {backdrop}
        <SafeAreaView style={[styles.safe, style]}>{children}</SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.background, colors.backgroundAlt, "#111827"]} style={styles.gradient}>
      {backdrop}
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={[styles.content, style]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          keyboardDismissMode="interactive"
          alwaysBounceVertical
          bounces
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1
  },
  safe: {
    flex: 1,
    backgroundColor: "transparent"
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 124
  },
  aura: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.14
  },
  auraTop: {
    top: -110,
    right: -80,
    backgroundColor: colors.cyan
  },
  auraBottom: {
    bottom: -120,
    left: -90,
    backgroundColor: colors.primary
  }
});
