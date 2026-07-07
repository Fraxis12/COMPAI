import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ReactNode } from "react";
import { useRef, useState } from "react";
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, TextInputProps, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../components/AppText";
import { BotAvatar, BotEmotion } from "../components/BotAvatar";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { AuthStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { useAuth } from "../hooks/useAuth";
import { fontFamily } from "../theme/fonts";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

const loginEmotionSequence: BotEmotion[] = [
  "welcome",
  "curious",
  "listening",
  "support",
  "encourage",
  "celebration",
  "surprise",
  "expert",
  "default"
];

export function LoginScreen({ navigation }: Props) {
  const { login, loading, error, clearError } = useAuth();
  const { width } = useWindowDimensions();
  const featureMotion = useRef(new Animated.Value(0)).current;
  const [correo, setCorreo] = useState("ana@ejemplo.com");
  const [password, setPassword] = useState("demo12345");
  const [showPassword, setShowPassword] = useState(false);
  const [cardsBehindMascot, setCardsBehindMascot] = useState(false);
  const isCompact = width < 380;
  const mascotSize = isCompact ? 188 : 226;

  const submit = async () => {
    try {
      await login({ correo, password });
    } catch {
      // El contexto muestra el error debajo del formulario.
    }
  };

  const playMascotCards = () => {
    featureMotion.stopAnimation();
    featureMotion.setValue(0);
    setCardsBehindMascot(true);
    Animated.sequence([
      Animated.timing(featureMotion, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.delay(120),
      Animated.timing(featureMotion, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true
      })
    ]).start(() => setCardsBehindMascot(false));
  };

  const featureScale = featureMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.76]
  });
  const featureOpacity = featureMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.7]
  });
  const leftCardMotion = {
    opacity: featureOpacity,
    transform: [
      { translateX: featureMotion.interpolate({ inputRange: [0, 1], outputRange: [0, isCompact ? 58 : 74] }) },
      { translateY: featureMotion.interpolate({ inputRange: [0, 1], outputRange: [0, isCompact ? 50 : 62] }) },
      { rotate: featureMotion.interpolate({ inputRange: [0, 1], outputRange: ["-8deg", "-20deg"] }) },
      { scale: featureScale }
    ]
  };
  const rightCardMotion = {
    opacity: featureOpacity,
    transform: [
      { translateX: featureMotion.interpolate({ inputRange: [0, 1], outputRange: [0, isCompact ? -58 : -72] }) },
      { translateY: featureMotion.interpolate({ inputRange: [0, 1], outputRange: [0, isCompact ? 26 : 34] }) },
      { rotate: featureMotion.interpolate({ inputRange: [0, 1], outputRange: ["7deg", "20deg"] }) },
      { scale: featureScale }
    ]
  };
  const bottomCardMotion = {
    opacity: featureOpacity,
    transform: [
      { translateY: featureMotion.interpolate({ inputRange: [0, 1], outputRange: [0, isCompact ? -34 : -44] }) },
      { rotate: featureMotion.interpolate({ inputRange: [0, 1], outputRange: ["-2deg", "3deg"] }) },
      { scale: featureScale }
    ]
  };

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        style={styles.wrap}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={[styles.mascotStage, { minHeight: isCompact ? 292 : 338 }]}>
              <View style={styles.starOne} />
              <View style={styles.starTwo} />
              <View style={styles.orbit} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Animar a Compa"
                onPress={playMascotCards}
                style={styles.mascotButton}
              >
                <BotAvatar
                  size={mascotSize}
                  style={styles.mascot}
                  emotion="welcome"
                  emotionSequence={loginEmotionSequence}
                  emotionIntervalMs={760}
                />
              </Pressable>
              <Feature
                icon="calendar-outline"
                title="Organiza tu estudio"
                text="Planifica y cumple metas"
                style={[styles.featureLeft, isCompact ? styles.featureLeftCompact : undefined, cardsBehindMascot ? styles.featureBehind : styles.featureFront]}
                motionStyle={leftCardMotion}
                compact={isCompact}
              />
              <Feature
                icon="restaurant-outline"
                title="Come saludable"
                text="Comidas y macros"
                style={[styles.featureRight, isCompact ? styles.featureRightCompact : undefined, cardsBehindMascot ? styles.featureBehind : styles.featureFront]}
                motionStyle={rightCardMotion}
                compact={isCompact}
              />
              <Feature
                icon="heart-outline"
                title="Cuida tu bienestar"
                text="Habitos y calma mental"
                style={[styles.featureBottom, isCompact ? styles.featureBottomCompact : undefined, cardsBehindMascot ? styles.featureBehind : styles.featureFront]}
                motionStyle={bottomCardMotion}
                compact={isCompact}
              />
            </View>
            <View style={styles.brandCopy}>
              <View style={styles.titleWrap}>
                <AppText style={[styles.titleGlow, isCompact ? styles.titleGlowCompact : undefined]} pointerEvents="none">
                  Compa
                </AppText>
                <AppText style={[styles.title, isCompact ? styles.titleCompact : undefined]} adjustsFontSizeToFit minimumFontScale={0.78}>
                  Compa
                </AppText>
              </View>
              <View style={styles.subtitleBadge}>
                <View style={styles.subtitleDot} />
                <AppText style={styles.subtitle}>Tu compañero para crecer cada día.</AppText>
                <View style={[styles.subtitleDot, styles.subtitleDotAlt]} />
              </View>
            </View>
          </View>

          <Card style={styles.form} glow>
            <View style={styles.formWash} />
            <View style={styles.formHeader}>
              <View>
                <AppText style={styles.formTitle}>Inicia sesión</AppText>
                <AppText style={styles.formHint}>Entra y continúa tu avance.</AppText>
              </View>
              <View style={styles.formSpark}>
                <Ionicons name="sparkles-outline" color={colors.cyan} size={18} />
              </View>
            </View>

            <AuthField
              label="Correo"
              value={correo}
              onChangeText={(value) => { clearError(); setCorreo(value); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="next"
              icon={<Ionicons name="mail-outline" color={colors.primary} size={20} />}
              placeholder="tu@correo.com"
            />
            <AuthField
              label="Contraseña"
              value={password}
              onChangeText={(value) => { clearError(); setPassword(value); }}
              secureTextEntry={!showPassword}
              textContentType="password"
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={submit}
              icon={<Ionicons name="lock-closed-outline" color={colors.primary} size={20} />}
              placeholder="Tu contraseña"
              right={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onPress={() => setShowPassword((value) => !value)}
                  hitSlop={10}
                >
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} color={colors.muted} size={22} />
                </Pressable>
              }
            />
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            <Button title="Iniciar sesión" loading={loading} onPress={submit} style={styles.submitButton} />
            <View style={styles.formLinks}>
              <Pressable
                accessibilityRole="button"
                onPress={() => { clearError(); navigation.navigate("ForgotPassword"); }}
                hitSlop={8}
                style={styles.textLink}
              >
                <AppText style={styles.textLinkLabel}>Olvidé mi contraseña</AppText>
              </Pressable>
              <View style={styles.linkDivider} />
              <Pressable
                accessibilityRole="button"
                onPress={() => { clearError(); navigation.navigate("Register"); }}
                hitSlop={8}
                style={styles.textLink}
              >
                <AppText style={styles.textLinkLabel}>Crear cuenta</AppText>
              </Pressable>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function AuthField({
  label,
  icon,
  right,
  ...props
}: TextInputProps & {
  label: string;
  icon: ReactNode;
  right?: ReactNode;
}) {
  return (
    <View style={styles.authField}>
      <AppText style={styles.authLabel}>{label}</AppText>
      <View style={styles.authInputShell}>
        <View style={styles.authIcon}>{icon}</View>
        <TextInput
          placeholderTextColor={colors.muted}
          style={[styles.authInput, right ? styles.authInputWithRight : undefined]}
          {...props}
        />
        {right ? <View style={styles.authRight}>{right}</View> : null}
      </View>
    </View>
  );
}

function Feature({
  icon,
  title,
  text,
  style,
  motionStyle,
  compact
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  style?: object;
  motionStyle?: object;
  compact?: boolean;
}) {
  return (
    <Animated.View style={[styles.feature, compact ? styles.featureCompact : undefined, style, motionStyle]}>
      <View style={styles.featureWash} />
      <View style={styles.featureGlow} />
      <View style={[styles.featureIcon, compact ? styles.featureIconCompact : undefined]}>
        <Ionicons name={icon} color={colors.cyan} size={compact ? 18 : 22} />
      </View>
      <View style={styles.featureCopy}>
        <AppText style={[styles.featureTitle, compact ? styles.featureTitleCompact : undefined]} numberOfLines={2}>{title}</AppText>
        <AppText style={[styles.featureText, compact ? styles.featureTextCompact : undefined]} numberOfLines={2}>{text}</AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28
  },
  hero: {
    alignItems: "center",
    alignSelf: "stretch"
  },
  mascotStage: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  mascot: {
    marginTop: 22
  },
  mascotButton: {
    zIndex: 3
  },
  orbit: {
    position: "absolute",
    width: "74%",
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.16)",
    transform: [{ rotate: "-12deg" }]
  },
  starOne: {
    position: "absolute",
    top: 34,
    right: "18%",
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.cyan,
    shadowColor: colors.cyan,
    shadowOpacity: 0.85,
    shadowRadius: 10
  },
  starTwo: {
    position: "absolute",
    top: 98,
    left: "8%",
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.85,
    shadowRadius: 10
  },
  brandCopy: {
    alignItems: "center",
    marginTop: -10
  },
  titleWrap: {
    minHeight: 70,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch"
  },
  title: {
    color: colors.ink,
    fontSize: 62,
    lineHeight: 68,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(139,92,246,0.75)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 14,
    transform: [{ rotate: "-2deg" }]
  },
  titleCompact: {
    fontSize: 52,
    lineHeight: 58
  },
  titleGlow: {
    position: "absolute",
    color: "rgba(56,189,248,0.24)",
    fontSize: 68,
    lineHeight: 72,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(56,189,248,0.7)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
    transform: [{ translateY: 4 }, { rotate: "-2deg" }]
  },
  titleGlowCompact: {
    fontSize: 58,
    lineHeight: 62
  },
  subtitleBadge: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.26)",
    backgroundColor: "rgba(139,92,246,0.1)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: -2
  },
  subtitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    maxWidth: 320,
    textAlign: "center",
    textShadowColor: "rgba(96,165,250,0.32)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8
  },
  subtitleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cyan,
    shadowColor: colors.cyan,
    shadowOpacity: 0.8,
    shadowRadius: 8
  },
  subtitleDotAlt: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary
  },
  form: {
    gap: 8,
    marginTop: 14,
    alignSelf: "stretch",
    padding: 12,
    borderRadius: 22,
    borderColor: "rgba(56,189,248,0.24)",
    backgroundColor: "rgba(7,10,22,0.72)",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0
  },
  formWash: {
    position: "absolute",
    right: -42,
    top: -52,
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: "rgba(56,189,248,0.12)"
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 2
  },
  formTitle: {
    color: colors.ink,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "900"
  },
  formHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    marginTop: 1
  },
  formSpark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.22)",
    backgroundColor: "rgba(56,189,248,0.1)",
    alignItems: "center",
    justifyContent: "center"
  },
  authField: {
    gap: 5
  },
  authLabel: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  authInputShell: {
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.26)",
    backgroundColor: "rgba(255,255,255,0.055)",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 11,
    overflow: "hidden"
  },
  authIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4
  },
  authInput: {
    flex: 1,
    minHeight: 44,
    color: colors.ink,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    paddingVertical: Platform.OS === "ios" ? 10 : 7,
    paddingRight: 12
  },
  authInputWithRight: {
    paddingRight: 48
  },
  authRight: {
    position: "absolute",
    right: 4,
    top: 3,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  submitButton: {
    minHeight: 44,
    marginTop: 1
  },
  formLinks: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 4
  },
  textLink: {
    minHeight: 28,
    justifyContent: "center"
  },
  textLinkLabel: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  linkDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(56,189,248,0.48)"
  },
  feature: {
    position: "absolute",
    width: 158,
    minHeight: 112,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.34)",
    backgroundColor: "rgba(91,53,177,0.24)",
    padding: 12,
    gap: 8,
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 4
  },
  featureFront: {
    zIndex: 6
  },
  featureBehind: {
    zIndex: 1
  },
  featureCompact: {
    width: 136,
    minHeight: 96,
    padding: 10,
    gap: 6
  },
  featureWash: {
    position: "absolute",
    right: -34,
    top: -42,
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: "rgba(56,189,248,0.18)",
    opacity: 0.9
  },
  featureGlow: {
    position: "absolute",
    left: -28,
    bottom: -34,
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: "rgba(139,92,246,0.28)",
    opacity: 0.85
  },
  featureLeft: {
    left: 0,
    top: 54,
    transform: [{ rotate: "-8deg" }]
  },
  featureRight: {
    right: 0,
    top: 104,
    transform: [{ rotate: "7deg" }]
  },
  featureBottom: {
    bottom: 4,
    alignSelf: "center",
    width: 220,
    minHeight: 104,
    transform: [{ rotate: "-2deg" }],
    zIndex: 2
  },
  featureLeftCompact: {
    left: -2,
    top: 54
  },
  featureRightCompact: {
    right: -2,
    top: 106
  },
  featureBottomCompact: {
    width: 194,
    minHeight: 92,
    bottom: 0
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center"
  },
  featureIconCompact: {
    width: 30,
    height: 30,
    borderRadius: 15
  },
  featureCopy: {
    flexShrink: 1
  },
  featureTitle: {
    color: colors.ink,
    fontWeight: "900",
    fontSize: 15,
    lineHeight: 19
  },
  featureTitleCompact: {
    fontSize: 13,
    lineHeight: 16
  },
  featureText: {
    color: colors.muted,
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17
  },
  featureTextCompact: {
    fontSize: 11,
    lineHeight: 14
  },
  error: {
    color: colors.danger,
    lineHeight: 20,
    fontWeight: "800"
  }
});
