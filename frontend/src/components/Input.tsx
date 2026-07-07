import { ReactNode } from "react";
import { TextInput, TextInputProps, StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors } from "../theme/colors";
import { fontFamily, fontSize, fontWeight } from "../theme/fonts";

interface InputProps extends TextInputProps {
  label: string;
  right?: ReactNode;
}

export function Input({ label, right, ...props }: InputProps) {
  return (
    <View style={styles.field}>
      <AppText style={styles.label}>{label}</AppText>
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={colors.muted}
          style={[styles.input, right ? styles.inputWithRight : undefined]}
          {...props}
        />
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 7
  },
  label: {
    color: colors.text,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.small
  },
  inputWrap: {
    position: "relative",
    width: "100%"
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.065)",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    color: colors.ink,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.input,
    width: "100%"
  },
  inputWithRight: {
    paddingRight: 52
  },
  right: {
    position: "absolute",
    right: 6,
    top: 5,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  }
});
