import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors } from "../theme/colors";
import { fontSize, fontWeight, lineHeight } from "../theme/fonts";

interface HeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function Header({ title, subtitle, right }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <AppText style={styles.title} adjustsFontSizeToFit minimumFontScale={0.82}>{title}</AppText>
        {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16
  },
  copy: {
    flex: 1,
    gap: 5
  },
  title: {
    color: colors.ink,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: fontWeight.black,
    flexShrink: 1
  },
  subtitle: {
    color: colors.text,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body
  }
});
