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
import { appApi } from "../services/api";
import { colors } from "../theme/colors";
import { fontFamily } from "../theme/fonts";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

const recoveryEmotionSequence: BotEmotion[] = ["support", "listening", "question", "encourage", "welcome", "default"];

export function ForgotPasswordScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const isCompact = width < 380;
  const mascotSize = isCompact ? 188 : 226;

  const sendCode = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await appApi.forgotPassword(correo);
      setMessage(response.message);
      setCodeSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos enviar el código.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await appApi.resetPassword(correo, codigo, nuevaPassword);
      setMessage(response.message);
      setCodigo("");
      setNuevaPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos cambiar la contraseña.");
    } finally {
      setLoading(false);
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
                emotion="support"
                emotionSequence={recoveryEmotionSequence}
                emotionIntervalMs={940}
                style={styles.mascot}
              />
            </View>

            <View style={styles.titleWrap}>
              <AppText style={[styles.titleGlow, isCompact ? styles.titleGlowCompact : undefined]} pointerEvents="none">
                Tranquilo
              </AppText>
              <AppText style={[styles.title, isCompact ? styles.titleCompact : undefined]} adjustsFontSizeToFit minimumFontScale={0.78}>
                Recuperar cuenta
              </AppText>
            </View>

            <View style={styles.subtitleBadge}>
              <View style={styles.subtitleDot} />
              <AppText style={styles.subtitle}>Te ayudamos a volver sin perder el ritmo.</AppText>
              <View style={[styles.subtitleDot, styles.subtitleDotAlt]} />
            </View>
          </View>

          <Card style={styles.form} glow>
            <View style={styles.formWash} />
            <View style={styles.formHeader}>
              <View>
                <AppText style={styles.formTitle}>{codeSent ? "Código recibido" : "Recibe tu código"}</AppText>
                <AppText style={styles.formHint}>
                  {codeSent ? "Ingresa el código y tu nueva contraseña." : "Lo enviaremos a tu correo registrado."}
                </AppText>
              </View>
              <View style={styles.formSpark}>
                <Ionicons name={codeSent ? "key-outline" : "mail-unread-outline"} color={colors.cyan} size={18} />
              </View>
            </View>

            <AuthField
              label="Correo"
              value={correo}
              onChangeText={(value) => {
                setError("");
                setMessage("");
                setCorreo(value);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType={codeSent ? "next" : "done"}
              onSubmitEditing={codeSent ? undefined : sendCode}
              editable={!loading}
              icon={<Ionicons name="mail-outline" color={colors.primary} size={20} />}
              placeholder="tu@correo.com"
            />

            {codeSent ? (
              <>
                <AuthField
                  label="Código"
                  value={codigo}
                  onChangeText={(value) => {
                    setError("");
                    setCodigo(value);
                  }}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  returnKeyType="next"
                  editable={!loading}
                  icon={<Ionicons name="shield-checkmark-outline" color={colors.primary} size={20} />}
                  placeholder="Código de verificación"
                />
                <AuthField
                  label="Nueva contraseña"
                  value={nuevaPassword}
                  onChangeText={(value) => {
                    setError("");
                    setNuevaPassword(value);
                  }}
                  secureTextEntry={!showPassword}
                  textContentType="newPassword"
                  autoComplete="new-password"
                  returnKeyType="done"
                  onSubmitEditing={resetPassword}
                  editable={!loading}
                  icon={<Ionicons name="lock-closed-outline" color={colors.primary} size={20} />}
                  placeholder="Nueva contraseña"
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
              </>
            ) : null}

            {message ? <AppText style={styles.message}>{message}</AppText> : null}
            {error ? <AppText style={styles.error}>{error}</AppText> : null}

            <Button
              title={codeSent ? "Cambiar contraseña" : "Enviar código"}
              loading={loading}
              onPress={codeSent ? resetPassword : sendCode}
              style={styles.submitButton}
            />

            <View style={styles.formLinks}>
              {codeSent ? (
                <>
                  <Pressable accessibilityRole="button" onPress={sendCode} hitSlop={8} style={styles.textLink} disabled={loading}>
                    <AppText style={styles.textLinkLabel}>Reenviar código</AppText>
                  </Pressable>
                  <View style={styles.linkDivider} />
                </>
              ) : null}
              <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} hitSlop={8} style={styles.textLink}>
                <AppText style={styles.textLinkLabel}>Volver al inicio de sesión</AppText>
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
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(139,92,246,0.72)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 14,
    transform: [{ rotate: "-1deg" }]
  },
  titleCompact: {
    fontSize: 34,
    lineHeight: 40
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
  message: {
    color: colors.success,
    lineHeight: 20,
    fontWeight: "800"
  },
  error: {
    color: colors.danger,
    lineHeight: 20,
    fontWeight: "800"
  }
});
