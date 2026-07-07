import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ReactNode, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, TextInputProps, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../components/AppText";
import { BotAvatar, BotEmotion } from "../components/BotAvatar";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { AuthStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { fontFamily } from "../theme/fonts";
import { useAuth } from "../hooks/useAuth";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const registerEmotionSequence: BotEmotion[] = ["welcome", "support", "encourage", "celebration", "listening", "default"];

export function RegisterScreen({ navigation }: Props) {
  const { register, loading, error, clearError } = useAuth();
  const { width } = useWindowDimensions();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isCompact = width < 380;
  const mascotSize = isCompact ? 188 : 226;

  const submit = async () => {
    try {
      await register(nombre, correo, password);
    } catch {
      // El contexto muestra el error debajo del formulario.
    }
  };

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={[styles.mascotStage, { minHeight: isCompact ? 206 : 246 }]}>
              <View style={styles.orbit} />
              <View style={styles.starOne} />
              <View style={styles.starTwo} />
              <BotAvatar
                size={mascotSize}
                emotion="welcome"
                emotionSequence={registerEmotionSequence}
                emotionIntervalMs={920}
                style={styles.mascot}
              />
            </View>

            <View style={styles.titleWrap}>
              <AppText style={[styles.titleGlow, isCompact ? styles.titleGlowCompact : undefined]} pointerEvents="none">
                Bienvenido
              </AppText>
              <AppText style={[styles.title, isCompact ? styles.titleCompact : undefined]} adjustsFontSizeToFit minimumFontScale={0.78}>
                Crear cuenta
              </AppText>
            </View>

            <View style={styles.subtitleBadge}>
              <View style={styles.subtitleDot} />
              <AppText style={styles.subtitle}>Tu espacio empieza limpio y listo para crecer.</AppText>
              <View style={[styles.subtitleDot, styles.subtitleDotAlt]} />
            </View>
          </View>

          <Card style={styles.form} glow>
            <View style={styles.formWash} />
            <View style={styles.formHeader}>
              <View>
                <AppText style={styles.formTitle}>Datos básicos</AppText>
                <AppText style={styles.formHint}>Solo lo necesario para empezar.</AppText>
              </View>
              <View style={styles.formSpark}>
                <Ionicons name="person-add-outline" color={colors.cyan} size={18} />
              </View>
            </View>

            <AuthField
              label="Nombre completo"
              value={nombre}
              onChangeText={(value) => {
                clearError();
                setNombre(value);
              }}
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="name"
              autoComplete="name"
              returnKeyType="next"
              icon={<Ionicons name="person-outline" color={colors.primary} size={20} />}
              placeholder="Tu nombre"
            />
            <AuthField
              label="Correo"
              value={correo}
              onChangeText={(value) => {
                clearError();
                setCorreo(value);
              }}
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
              onChangeText={(value) => {
                clearError();
                setPassword(value);
              }}
              secureTextEntry={!showPassword}
              textContentType="newPassword"
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={submit}
              icon={<Ionicons name="lock-closed-outline" color={colors.primary} size={20} />}
              placeholder="Crea una contraseña"
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
            <Button title="Crear mi cuenta" loading={loading} onPress={submit} style={styles.submitButton} />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                clearError();
                navigation.goBack();
              }}
              hitSlop={8}
              style={styles.backLink}
            >
              <Ionicons name="arrow-back-outline" color={colors.cyan} size={16} />
              <AppText style={styles.backLinkText}>Volver al inicio de sesión</AppText>
            </Pressable>
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

const styles = StyleSheet.create({
  keyboard: {
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
    marginTop: 8
  },
  orbit: {
    position: "absolute",
    width: "68%",
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.16)",
    transform: [{ rotate: "-12deg" }]
  },
  starOne: {
    position: "absolute",
    top: 28,
    right: "20%",
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
    bottom: 42,
    left: "18%",
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.85,
    shadowRadius: 10
  },
  titleWrap: {
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    marginTop: -6
  },
  title: {
    color: colors.ink,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(139,92,246,0.72)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 14,
    transform: [{ rotate: "-1deg" }]
  },
  titleCompact: {
    fontSize: 36,
    lineHeight: 42
  },
  titleGlow: {
    position: "absolute",
    color: "rgba(56,189,248,0.2)",
    fontSize: 46,
    lineHeight: 52,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(56,189,248,0.64)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
    transform: [{ translateY: 3 }, { rotate: "-1deg" }]
  },
  titleGlowCompact: {
    fontSize: 40,
    lineHeight: 46
  },
  subtitleBadge: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.26)",
    backgroundColor: "rgba(139,92,246,0.1)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 2
  },
  subtitle: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    textAlign: "center",
    flexShrink: 1
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
    alignSelf: "stretch",
    gap: 8,
    marginTop: 14,
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
  backLink: {
    minHeight: 30,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10
  },
  backLinkText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  error: {
    color: colors.danger,
    lineHeight: 20,
    fontWeight: "800"
  }
});
