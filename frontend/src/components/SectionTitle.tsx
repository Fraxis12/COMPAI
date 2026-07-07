import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors } from "../theme/colors";
import { fontSize, fontWeight } from "../theme/fonts";

export function SectionTitle({ title, action, actionColor }: { title: string; action?: string; actionColor?: string }) {
  return (
    <View style={styles.row}>
      <AppText style={styles.title}>{title}</AppText>
      {action ? <AppText style={[styles.action, actionColor ? { color: actionColor } : undefined]}>{action}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 20,
    marginBottom: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: fontWeight.extrabold
  },
  action: {
    color: colors.cyan,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.small
  }
});
