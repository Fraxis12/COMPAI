import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors } from "../theme/colors";
import { fontSize, fontWeight } from "../theme/fonts";

interface ProgressLineProps {
  label: string;
  value: number;
  color?: string;
}

export function ProgressLine({ label, value, color = colors.cyan }: ProgressLineProps) {
  return (
    <View style={styles.row}>
      <AppText style={styles.label}>{label}</AppText>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }]} />
      </View>
      <AppText style={styles.value}>{value}%</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 5
  },
  label: {
    color: colors.text,
    width: 72,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.09)",
    overflow: "hidden"
  },
  fill: {
    height: "100%",
    borderRadius: 999
  },
  value: {
    color: colors.ink,
    width: 34,
    textAlign: "right",
    fontSize: fontSize.caption,
    fontWeight: fontWeight.extrabold
  }
});
