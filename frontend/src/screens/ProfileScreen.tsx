import { ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../components/AppText";
import { AssistantChat } from "../components/AssistantChat";
import { BotAvatar } from "../components/BotAvatar";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Screen } from "../components/Screen";
import { useAuth } from "../hooks/useAuth";
import { colors } from "../theme/colors";

type IconName = keyof typeof Ionicons.glyphMap;
type NoticeState = { kind: "success" | "error" | "logout"; title: string; message: string } | null;

export function ProfileScreen() {
  const { session, logout, updateProfile, loading } = useAuth();
  const user = session?.user;
  const [accountVisible, setAccountVisible] = useState(false);
  const [preferencesVisible, setPreferencesVisible] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [name, setName] = useState(user?.nombre ?? "");
  const [preferredName, setPreferredName] = useState(user?.preferencias?.nombre_compai ?? user?.nombre?.split(" ")[0] ?? "");
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.preferencias?.notificaciones !== false);
  const [dailyGoal, setDailyGoal] = useState(user?.preferencias?.objetivo_diario ?? "Equilibrio");
  const [assistantTone, setAssistantTone] = useState(user?.preferencias?.tono_compai ?? "Amable");
  const [shortAnswers, setShortAnswers] = useState(user?.preferencias?.respuestas_breves !== false);
  const [notice, setNotice] = useState<NoticeState>(null);

  useEffect(() => {
    setName(user?.nombre ?? "");
    setPreferredName(user?.preferencias?.nombre_compai ?? user?.nombre?.split(" ")[0] ?? "");
    setNotificationsEnabled(user?.preferencias?.notificaciones !== false);
    setDailyGoal(user?.preferencias?.objetivo_diario ?? "Equilibrio");
    setAssistantTone(user?.preferencias?.tono_compai ?? "Amable");
    setShortAnswers(user?.preferencias?.respuestas_breves !== false);
  }, [user]);
  const confirmLogout = () => {
    setNotice({ kind: "logout", title: "¿Cerrar sesión?", message: "Tendrás que volver a ingresar tus datos para usar CompAI en este dispositivo." });
  };

  const saveAccount = async () => {
    if (!name.trim()) {
      setNotice({ kind: "error", title: "Falta tu nombre", message: "Escribe el nombre que quieres mostrar en CompAI." });
      return;
    }
    try {
      await updateProfile({
        nombre: name.trim(),
        preferencias: {
          ...(user?.preferencias ?? {}),
          nombre_compai: preferredName.trim() || name.trim().split(" ")[0]
        }
      });
      setAccountVisible(false);
      setNotice({ kind: "success", title: "¡Nombre actualizado!", message: "Tu nuevo nombre ya está guardado en CompAI." });
    } catch (error) {
      setNotice({ kind: "error", title: "No pudimos guardar", message: error instanceof Error ? error.message : "Inténtalo nuevamente." });
    }
  };

  const savePreferences = async () => {
    try {
      await updateProfile({
        preferencias: {
          ...(user?.preferencias ?? {}),
          idioma: "es",
          tema: "oscuro",
          notificaciones: notificationsEnabled,
          objetivo_diario: dailyGoal,
          tono_compai: assistantTone,
          respuestas_breves: shortAnswers
        }
      });
      setPreferencesVisible(false);
      setNotice({ kind: "success", title: "¡Preferencias listas!", message: "CompAI usará estos ajustes en tus próximas conversaciones." });
    } catch (error) {
      setNotice({ kind: "error", title: "No pudimos guardar", message: error instanceof Error ? error.message : "Inténtalo nuevamente." });
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerMascot}>
          <View style={styles.headerGlow} />
          <BotAvatar size={78} emotion="curious" />
        </View>
        <View style={styles.headerCopy}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="sparkles" color="#BD64FF" size={13} />
            <AppText style={styles.eyebrow}>TU ESPACIO</AppText>
          </View>
          <AppText style={styles.screenTitle}>Perfil</AppText>
          <AppText style={styles.screenSubtitle}>Tu cuenta, tus preferencias y CompAI.</AppText>
        </View>
      </View>

      <View style={styles.launcherStack}>
        <ProfileLauncher
          icon="person-outline"
          title="Datos personales"
          description={`${user?.nombre ?? "Usuario"} · Cambiar nombre visible`}
          color="#BD64FF"
          onPress={() => setAccountVisible(true)}
        />
        <ProfileLauncher
          icon="options-outline"
          title="Ajustes de CompAI"
          description={`${notificationsEnabled ? "Notificaciones activas" : "Notificaciones pausadas"} · ${dailyGoal}`}
          color="#A855F7"
          onPress={() => setPreferencesVisible(true)}
        />
        <ChatLauncher onPress={() => setChatVisible(true)} />
      </View>

      <AssistantChat visible={chatVisible} onClose={() => setChatVisible(false)} userName={user?.nombre ?? "Compa"} />

      <NoticeModal
        notice={notice}
        onClose={() => setNotice(null)}
        onLogout={() => {
          setNotice(null);
          logout();
        }}
      />

      <ProfileModal visible={accountVisible} title="Tu cuenta" icon="person-outline" onClose={() => setAccountVisible(false)}>
        <View style={styles.accountIntro}>
          <View style={styles.accountIntroIcon}><Ionicons name="sparkles" color="#C084FC" size={18} /></View>
          <AppText style={styles.accountIntroText}>Personaliza cómo te identificas y cómo quieres que CompAI se dirija a ti.</AppText>
        </View>
        <Input label="Nombre completo" value={name} onChangeText={setName} placeholder="Tu nombre" autoCapitalize="words" returnKeyType="next" />
        <Input label="Cómo quieres que te llame CompAI" value={preferredName} onChangeText={setPreferredName} placeholder="Ej. Ana, Fran, Alex" autoCapitalize="words" returnKeyType="done" />
        <View style={styles.protectedData}>
          <View style={styles.protectedIcon}><Ionicons name="lock-closed-outline" color="#A78BFA" size={16} /></View>
          <View style={styles.protectedCopy}>
            <AppText style={styles.protectedLabel}>Correo de acceso</AppText>
            <AppText style={styles.protectedValue} numberOfLines={1}>{user?.correo ?? "Sin correo"}</AppText>
          </View>
          <AppText style={styles.protectedBadge}>PROTEGIDO</AppText>
        </View>
        <Button title="Guardar cambios" loading={loading} onPress={saveAccount} icon={<Ionicons name="checkmark" color={colors.ink} size={19} />} />
        <View style={styles.modalAccountDivider} />
        <Pressable
          style={({ pressed }) => [styles.modalLogoutCard, pressed && styles.pressed]}
          onPress={() => {
            setAccountVisible(false);
            confirmLogout();
          }}
        >
          <View style={styles.modalLogoutIcon}><Ionicons name="log-out-outline" color="#FFE4E6" size={19} /></View>
          <View style={styles.modalLogoutCopy}>
            <AppText style={styles.modalLogoutTitle}>Cerrar sesión</AppText>
            <AppText style={styles.modalLogoutWarning}>Saldrás de tu cuenta en este dispositivo.</AppText>
          </View>
          <Ionicons name="chevron-forward" color="#FDA4AF" size={18} />
        </Pressable>
      </ProfileModal>

      <ProfileModal visible={preferencesVisible} title="Preferencias" icon="options-outline" onClose={() => setPreferencesVisible(false)}>
        <View style={styles.preferenceControl}>
          <View style={styles.preferenceControlCopy}>
            <AppText style={styles.preferenceControlTitle}>Notificaciones</AppText>
            <AppText style={styles.preferenceControlText}>Alertas de tareas, racha y bienestar.</AppText>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: "rgba(148,163,184,0.3)", true: "rgba(189,100,255,0.55)" }}
            thumbColor={notificationsEnabled ? colors.ink : colors.muted}
          />
        </View>
        <View>
          <AppText style={styles.controlLabel}>Objetivo principal</AppText>
          <View style={styles.goalGrid}>
            {["Equilibrio", "Estudio", "Bienestar"].map((goal) => (
              <Pressable key={goal} style={[styles.goalChoice, dailyGoal === goal && styles.goalChoiceActive]} onPress={() => setDailyGoal(goal)}>
                <Ionicons name={goal === "Estudio" ? "book-outline" : goal === "Bienestar" ? "heart-outline" : "sparkles-outline"} color={dailyGoal === goal ? colors.ink : colors.muted} size={17} />
                <AppText style={[styles.goalChoiceText, dailyGoal === goal && styles.goalChoiceTextActive]}>{goal}</AppText>
              </Pressable>
            ))}
          </View>
        </View>
        <View>
          <AppText style={styles.controlLabel}>Cómo quieres que te hable</AppText>
          <View style={styles.goalGrid}>
            {["Amable", "Directo", "Motivador"].map((tone) => (
              <Pressable key={tone} style={[styles.goalChoice, assistantTone === tone && styles.goalChoiceActive]} onPress={() => setAssistantTone(tone)}>
                <Ionicons name={tone === "Amable" ? "heart-outline" : tone === "Directo" ? "flash-outline" : "rocket-outline"} color={assistantTone === tone ? "#E9D5FF" : "#A78BFA"} size={17} />
                <AppText style={[styles.goalChoiceText, assistantTone === tone && styles.goalChoiceTextActive]}>{tone}</AppText>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.preferenceControl}>
          <View style={styles.preferenceIcon}><Ionicons name="reader-outline" color="#C084FC" size={19} /></View>
          <View style={styles.preferenceControlCopy}>
            <AppText style={styles.preferenceControlTitle}>Respuestas breves</AppText>
            <AppText style={styles.preferenceControlText}>CompAI irá al punto cuando esté activado.</AppText>
          </View>
          <Switch value={shortAnswers} onValueChange={setShortAnswers} trackColor={{ false: "rgba(148,163,184,0.3)", true: "rgba(168,85,247,0.58)" }} thumbColor={shortAnswers ? colors.ink : colors.muted} />
        </View>
        <View style={styles.fixedPreference}>
          <Ionicons name="language-outline" color="#C084FC" size={18} />
          <View><AppText style={styles.fixedPreferenceLabel}>Idioma de CompAI</AppText><AppText style={styles.fixedPreferenceValue}>Español</AppText></View>
        </View>
        <Button title="Guardar preferencias" loading={loading} onPress={savePreferences} icon={<Ionicons name="checkmark" color={colors.ink} size={19} />} />
      </ProfileModal>
    </Screen>
  );
}

function NoticeModal({ notice, onClose, onLogout }: { notice: NoticeState; onClose: () => void; onLogout: () => void }) {
  const isLogout = notice?.kind === "logout";
  const isError = notice?.kind === "error";
  const emotion = isLogout ? "alert" : isError ? "error" : "celebration";
  const accent = isLogout || isError ? colors.danger : "#BD64FF";

  return (
    <Modal visible={Boolean(notice)} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.noticeBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.noticeSurface, { borderColor: `${accent}70` }]}>
          <View style={[styles.noticeGlow, { backgroundColor: `${accent}18` }]} />
          <BotAvatar size={82} emotion={emotion} />
          <AppText style={styles.noticeTitle}>{notice?.title}</AppText>
          <AppText style={styles.noticeMessage}>{notice?.message}</AppText>
          {isLogout ? (
            <View style={styles.noticeActions}>
              <Pressable style={({ pressed }) => [styles.noticeSecondary, pressed && styles.pressed]} onPress={onClose}>
                <AppText style={styles.noticeSecondaryText}>Seguir aquí</AppText>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.noticeDanger, pressed && styles.pressed]} onPress={onLogout}>
                <Ionicons name="log-out-outline" color="#FFF1F2" size={18} />
                <AppText style={styles.noticeDangerText}>Cerrar sesión</AppText>
              </Pressable>
            </View>
          ) : (
            <Pressable style={({ pressed }) => [styles.noticePrimary, isError && styles.noticeErrorButton, pressed && styles.pressed]} onPress={onClose}>
              <AppText style={styles.noticePrimaryText}>{isError ? "Entendido" : "Continuar"}</AppText>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ChatLauncher({ onPress }: { onPress: () => void }) {
  const orbit = useRef(new Animated.Value(0)).current;
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const orbitLoop = Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
    const scanLoop = Animated.loop(Animated.sequence([
      Animated.timing(scan, { toValue: 1, duration: 2100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(scan, { toValue: 0, duration: 0, useNativeDriver: true })
    ]));
    orbitLoop.start();
    scanLoop.start();
    return () => { orbitLoop.stop(); scanLoop.stop(); };
  }, [orbit, scan]);

  const orbitRotation = orbit.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const scanTranslate = scan.interpolate({ inputRange: [0, 1], outputRange: [-38, 38] });
  const scanOpacity = scan.interpolate({ inputRange: [0, 0.18, 0.82, 1], outputRange: [0, 0.65, 0.65, 0] });

  return (
    <Pressable style={({ pressed }) => [styles.chatLauncher, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.chatGlow} />
      <View style={styles.techLineTop} />
      <View style={styles.techLineBottom} />
      <View style={[styles.techCorner, styles.techCornerTopLeft]} />
      <View style={[styles.techCorner, styles.techCornerBottomRight]} />
      <View style={styles.chatAvatar}>
        <Animated.View style={[styles.avatarOrbitOuter, { transform: [{ rotate: orbitRotation }] }]} />
        <View style={styles.avatarOrbitInner} />
        <Animated.View style={[styles.avatarScan, { opacity: scanOpacity, transform: [{ translateY: scanTranslate }] }]} />
        <BotAvatar size={92} emotion="sassy" animated={false} />
      </View>
      <View style={styles.chatCopy}>
        <View style={styles.chatEyebrowRow}>
          <View style={styles.onlineDot} />
          <AppText style={styles.chatEyebrow}>AI SYSTEM // ONLINE</AppText>
        </View>
        <View style={styles.techTitleRow}>
          <AppText style={styles.chatTitle}>CompAI</AppText>
          <View style={styles.versionPill}><AppText style={styles.versionText}>CORE</AppText></View>
        </View>
        <AppText style={styles.chatCommand}>INICIAR CONVERSACIÓN</AppText>
        <AppText style={styles.chatDescription}>Pregunta, organiza tus ideas o pide acompañamiento.</AppText>
        <View style={styles.chatAction}>
          <Ionicons name="terminal-outline" color={colors.ink} size={14} />
          <AppText style={styles.chatActionText}>ABRIR CHAT</AppText>
          <Ionicons name="arrow-forward" color={colors.ink} size={16} />
        </View>
      </View>
    </Pressable>
  );
}

function ProfileLauncher({ icon, color, title, description, onPress }: { icon: IconName; color: string; title: string; description: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.profileLauncher, { borderColor: `${color}38` }, pressed && styles.pressed]} onPress={onPress}>
      <View style={[styles.launcherIcon, { backgroundColor: `${color}1F` }]}>
        <Ionicons name={icon} color={color} size={21} />
      </View>
      <View style={styles.launcherCopy}>
        <AppText style={styles.launcherTitle}>{title}</AppText>
        <AppText style={styles.launcherDescription} numberOfLines={1}>{description}</AppText>
      </View>
      <View style={[styles.launcherArrow, { backgroundColor: `${color}16` }]}><Ionicons name="chevron-forward" color={color} size={18} /></View>
    </Pressable>
  );
}

function ProfileModal({ visible, title, icon, onClose, children }: { visible: boolean; title: string; icon: IconName; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalSurface}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIdentity}>
              <View style={styles.modalIcon}><Ionicons name={icon} color="#BD64FF" size={20} /></View>
              <AppText style={styles.modalTitle}>{title}</AppText>
            </View>
            <Pressable style={styles.modalClose} onPress={onClose} accessibilityLabel="Cerrar"><Ionicons name="close" color={colors.ink} size={22} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 138 },
  header: { minHeight: 92, flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  headerMascot: { width: 84, height: 86, alignItems: "center", justifyContent: "center" },
  headerGlow: { position: "absolute", width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(189,100,255,0.12)", borderWidth: 1, borderColor: "rgba(189,100,255,0.2)" },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  eyebrow: { color: "#BD64FF", fontSize: 9, lineHeight: 12, fontWeight: "900" },
  screenTitle: { color: colors.ink, fontSize: 29, lineHeight: 34, fontWeight: "900" },
  screenSubtitle: { color: colors.text, fontSize: 12, lineHeight: 17, fontWeight: "700" },
  chatLauncher: { minHeight: 178, borderRadius: 22, borderWidth: 1, borderColor: "rgba(192,132,252,0.52)", backgroundColor: "#17102D", flexDirection: "row", alignItems: "center", overflow: "hidden", paddingHorizontal: 14, paddingVertical: 16 },
  chatGlow: { position: "absolute", width: 190, height: 190, borderRadius: 95, left: -73, top: -27, backgroundColor: "rgba(168,85,247,0.17)" },
  techLineTop: { position: "absolute", height: 1, width: "42%", top: 10, right: 18, backgroundColor: "rgba(216,180,254,0.35)" },
  techLineBottom: { position: "absolute", height: 1, width: "28%", bottom: 10, left: 20, backgroundColor: "rgba(168,85,247,0.28)" },
  techCorner: { position: "absolute", width: 17, height: 17, borderColor: "rgba(216,180,254,0.65)" },
  techCornerTopLeft: { top: 8, left: 8, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 5 },
  techCornerBottomRight: { right: 8, bottom: 8, borderRightWidth: 2, borderBottomWidth: 2, borderBottomRightRadius: 5 },
  chatAvatar: { width: 102, height: 118, alignItems: "center", justifyContent: "center" },
  avatarOrbitOuter: { position: "absolute", width: 90, height: 90, borderRadius: 45, borderWidth: 1, borderColor: "rgba(192,132,252,0.3)", borderStyle: "dashed" },
  avatarOrbitInner: { position: "absolute", width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderColor: "rgba(168,85,247,0.2)", backgroundColor: "rgba(139,92,246,0.06)" },
  avatarScan: { position: "absolute", zIndex: 2, width: 76, height: 2, borderRadius: 1, backgroundColor: "#D8B4FE", shadowColor: "#C084FC", shadowOpacity: 0.8, shadowRadius: 6, elevation: 3 },
  chatCopy: { flex: 1, minWidth: 0, paddingLeft: 3 },
  chatEyebrowRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#C084FC" },
  chatEyebrow: { color: "#D8B4FE", fontSize: 7, fontWeight: "900", letterSpacing: 1.15 },
  techTitleRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 5 },
  chatTitle: { color: colors.ink, fontSize: 23, lineHeight: 27, fontWeight: "900", letterSpacing: 0.5 },
  versionPill: { height: 18, borderRadius: 6, borderWidth: 1, borderColor: "rgba(192,132,252,0.38)", backgroundColor: "rgba(168,85,247,0.13)", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  versionText: { color: "#D8B4FE", fontSize: 6, fontWeight: "900", letterSpacing: 0.8 },
  chatCommand: { color: "#A78BFA", fontSize: 7, lineHeight: 10, fontWeight: "900", letterSpacing: 1.2, marginTop: 2 },
  chatDescription: { color: colors.text, fontSize: 11, lineHeight: 16, marginTop: 4 },
  chatAction: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, borderWidth: 1, borderColor: "rgba(216,180,254,0.38)", backgroundColor: "#7C3AED", paddingHorizontal: 10, height: 33, marginTop: 10 },
  chatActionText: { color: colors.ink, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  settingsGroup: { borderRadius: 17, borderWidth: 1, borderColor: "rgba(189,100,255,0.2)", backgroundColor: "#171329", paddingHorizontal: 12, overflow: "hidden" },
  settingRow: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
  settingIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  settingCopy: { flex: 1, minWidth: 0 },
  settingLabel: { color: colors.muted, fontSize: 9, lineHeight: 12, fontWeight: "800" },
  settingValue: { color: colors.ink, fontSize: 12, lineHeight: 16, fontWeight: "800", marginTop: 2 },
  divider: { height: 1, marginLeft: 48, backgroundColor: "rgba(255,255,255,0.065)" },
  switchTrack: { width: 38, height: 22, borderRadius: 11, justifyContent: "center", backgroundColor: "rgba(148,163,184,0.25)", paddingHorizontal: 3 },
  switchTrackActive: { backgroundColor: "rgba(189,100,255,0.5)" },
  switchThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.muted },
  switchThumbActive: { backgroundColor: colors.ink, alignSelf: "flex-end" },
  accountIntro: { minHeight: 48, borderRadius: 13, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 10, backgroundColor: "rgba(168,85,247,0.075)" },
  accountIntroIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(168,85,247,0.14)" },
  accountIntroText: { flex: 1, color: colors.text, fontSize: 10, lineHeight: 14 },
  protectedData: { minHeight: 58, borderRadius: 14, borderWidth: 1, borderColor: "rgba(168,85,247,0.18)", backgroundColor: "rgba(255,255,255,0.035)", flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 11 },
  protectedIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(139,92,246,0.11)" },
  protectedCopy: { flex: 1, minWidth: 0 },
  protectedLabel: { color: colors.muted, fontSize: 8, fontWeight: "800" },
  protectedValue: { color: colors.ink, fontSize: 11, marginTop: 2 },
  protectedBadge: { color: "#A78BFA", fontSize: 7, fontWeight: "900" },
  modalAccountDivider: { height: 1, backgroundColor: "rgba(251,113,133,0.18)", marginTop: 4 },
  modalLogoutCard: { minHeight: 60, borderRadius: 15, borderWidth: 1, borderColor: "rgba(244,63,94,0.38)", backgroundColor: "rgba(190,18,60,0.16)", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 11 },
  modalLogoutIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(244,63,94,0.25)" },
  modalLogoutCopy: { flex: 1, minWidth: 0 },
  modalLogoutTitle: { color: "#FFE4E6", fontSize: 12, fontWeight: "900" },
  modalLogoutWarning: { color: "#FDA4AF", fontSize: 9, lineHeight: 12, marginTop: 2 },
  noticeBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 22, backgroundColor: "rgba(2,6,23,0.88)" },
  noticeSurface: { width: "100%", maxWidth: 390, borderRadius: 24, borderWidth: 1, alignItems: "center", backgroundColor: "#171329", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, overflow: "hidden" },
  noticeGlow: { position: "absolute", width: 180, height: 180, borderRadius: 90, top: -105 },
  noticeTitle: { color: colors.ink, fontSize: 20, lineHeight: 25, fontWeight: "900", textAlign: "center", marginTop: 3 },
  noticeMessage: { color: colors.text, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 7, marginBottom: 18, maxWidth: 300 },
  noticeActions: { width: "100%", flexDirection: "row", gap: 9 },
  noticeSecondary: { flex: 1, height: 46, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.05)" },
  noticeSecondaryText: { color: colors.text, fontSize: 11, fontWeight: "900" },
  noticeDanger: { flex: 1, height: 46, borderRadius: 14, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", backgroundColor: "#BE123C" },
  noticeDangerText: { color: "#FFF1F2", fontSize: 11, fontWeight: "900" },
  noticePrimary: { width: "100%", height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  noticeErrorButton: { backgroundColor: "#BE123C" },
  noticePrimaryText: { color: colors.ink, fontSize: 12, fontWeight: "900" },
  profileLauncher: { minHeight: 70, borderRadius: 17, borderWidth: 1, backgroundColor: "#171329", flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 12 },
  launcherStack: { gap: 9, marginTop: 4, marginBottom: 16 },
  launcherIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  launcherCopy: { flex: 1, minWidth: 0 },
  launcherTitle: { color: colors.ink, fontSize: 14, lineHeight: 18, fontWeight: "900" },
  launcherDescription: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 2 },
  launcherArrow: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  modalBackdrop: { flex: 1, justifyContent: "center", paddingHorizontal: 18, backgroundColor: "rgba(2,6,23,0.86)" },
  modalSurface: { width: "100%", maxWidth: 430, maxHeight: "86%", alignSelf: "center", borderRadius: 21, borderWidth: 1, borderColor: "rgba(189,100,255,0.32)", backgroundColor: "#171329", padding: 16, elevation: 0, shadowOpacity: 0 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 16 },
  modalIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  modalIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(189,100,255,0.12)" },
  modalTitle: { color: colors.ink, fontSize: 19, fontWeight: "900" },
  modalClose: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.065)" },
  modalBody: { gap: 14 },
  preferenceControl: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, borderColor: "rgba(189,100,255,0.18)", backgroundColor: "rgba(189,100,255,0.055)", paddingHorizontal: 12 },
  preferenceControlCopy: { flex: 1, minWidth: 0 },
  preferenceIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(168,85,247,0.13)" },
  preferenceControlTitle: { color: colors.ink, fontSize: 13, fontWeight: "900" },
  preferenceControlText: { color: colors.muted, fontSize: 10, lineHeight: 13, marginTop: 2 },
  controlLabel: { color: colors.text, fontSize: 12, fontWeight: "900", marginBottom: 8 },
  goalGrid: { flexDirection: "row", gap: 7 },
  goalChoice: { flex: 1, minWidth: 0, minHeight: 54, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.035)", paddingHorizontal: 4 },
  goalChoiceActive: { borderColor: "rgba(189,100,255,0.55)", backgroundColor: "rgba(189,100,255,0.18)" },
  goalChoiceText: { color: colors.muted, fontSize: 9, fontWeight: "800" },
  goalChoiceTextActive: { color: colors.ink },
  fixedPreference: { minHeight: 48, borderRadius: 13, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 11, backgroundColor: "rgba(168,85,247,0.075)" },
  fixedPreferenceLabel: { color: colors.muted, fontSize: 9 },
  fixedPreferenceValue: { color: colors.ink, fontSize: 12, fontWeight: "800", marginTop: 1 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] }
});
