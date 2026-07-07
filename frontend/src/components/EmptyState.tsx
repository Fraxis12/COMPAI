import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, ViewStyle } from "react-native";
import { AppText } from "./AppText";
import { Card } from "./Card";
import { colors } from "../theme/colors";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  style?: ViewStyle;
}

export function EmptyState({ icon, title, message, style }: EmptyStateProps) {
  return (
    <Card style={[styles.card, style]}>
      <Ionicons name={icon} color={colors.cyan} size={25} />
      <AppText style={styles.title}>{title}</AppText>
      <AppText style={styles.message}>{message}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 7,
    marginBottom: 10,
    paddingVertical: 14
  },
  title: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  message: {
    color: colors.text,
    lineHeight: 19,
    fontSize: 13
  }
});
