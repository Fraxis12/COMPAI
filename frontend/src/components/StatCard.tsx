import { StyleSheet } from "react-native";
import { AppText } from "./AppText";
import { Card } from "./Card";
import { colors } from "../theme/colors";
import { fontSize, fontWeight, lineHeight } from "../theme/fonts";

interface StatCardProps {
  label: string;
  value: string;
  detail?: string;
  tone?: "primary" | "accent" | "info";
}

export function StatCard({ label, value, detail, tone = "primary" }: StatCardProps) {
  const palette = tone === "accent"
    ? { main: colors.accent, border: "rgba(251,191,119,0.28)", background: "rgba(251,191,119,0.07)" }
    : tone === "info"
      ? { main: colors.success, border: "rgba(52,211,153,0.27)", background: "rgba(52,211,153,0.07)" }
      : { main: colors.cyan, border: "rgba(56,189,248,0.28)", background: "rgba(56,189,248,0.075)" };

  return (
    <Card style={[styles.card, { borderColor: palette.border, backgroundColor: palette.background }]}>
      <AppText style={[styles.value, { color: palette.main }]}>{value}</AppText>
      <AppText style={styles.label} numberOfLines={1}>{label}</AppText>
      {detail ? <AppText style={styles.detail} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{detail}</AppText> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 102,
    minHeight: 82,
    justifyContent: "center",
    paddingVertical: 12,
    elevation: 0,
    shadowOpacity: 0
  },
  value: {
    fontSize: 21,
    fontWeight: fontWeight.extrabold,
    flexShrink: 1
  },
  label: {
    marginTop: 3,
    color: colors.text,
    fontSize: fontSize.caption,
    lineHeight: 15,
    fontWeight: "800"
  },
  detail: {
    color: colors.muted,
    fontSize: 9,
    lineHeight: 12,
    marginTop: 1
  }
});
