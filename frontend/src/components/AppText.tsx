import { ComponentProps } from "react";
import { StyleSheet, Text } from "react-native";
import { familyForStyle, fontFamily, fontSize, fontWeight, lineHeight } from "../theme/fonts";

type AppTextProps = ComponentProps<typeof Text>;

export function AppText({ style, ...props }: AppTextProps) {
  const flattenedStyle = StyleSheet.flatten(style);
  const family = flattenedStyle?.fontFamily ?? familyForStyle(flattenedStyle?.fontWeight, flattenedStyle?.fontSize);

  return (
    <Text
      {...props}
      style={[
        styles.base,
        style,
        {
          fontFamily: family,
          fontWeight: undefined
        }
      ]}
    />
  );
}

export function AppTitle({ style, ...props }: AppTextProps) {
  return <AppText {...props} style={[styles.title, style]} />;
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fontFamily.light,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.title,
    fontWeight: fontWeight.black,
    lineHeight: lineHeight.title
  }
});
