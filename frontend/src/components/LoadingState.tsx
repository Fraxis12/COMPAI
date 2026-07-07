import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors } from "../theme/colors";
import { fontWeight } from "../theme/fonts";

export function LoadingState({ label = "Cargando información" }: { label?: string }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.primary} />
      <AppText style={styles.label}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  label: {
    color: colors.muted,
    fontWeight: fontWeight.semibold
  }
});
