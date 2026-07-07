import { useEffect, useRef, useState } from "react";
import { DeviceEventEmitter, Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { AppText } from "./AppText";
import { BotAvatar } from "./BotAvatar";
import { colors } from "../theme/colors";
import { useAuth } from "../hooks/useAuth";

const LAST_RESPONSE_KEY = "compai.eye-care.last-response";

export function EyeCareOverlay() {
  const { session } = useAuth();
  const [exercise, setExercise] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(20);
  const counted = useRef(false);
  const lastShownIdentifier = useRef<string | null>(null);

  useEffect(() => {
    const showNotification = (notification: Notifications.Notification) => {
      const data = notification.request.content.data;
      if (data?.type === "eye-care" && typeof data.exercise === "string") {
        if (lastShownIdentifier.current === notification.request.identifier) return;
        lastShownIdentifier.current = notification.request.identifier;
        counted.current = false;
        setExercise(data.exercise);
        setSeconds(20);
      }
    };
    const received = Notifications.addNotificationReceivedListener(showNotification);
    const response = Notifications.addNotificationResponseReceivedListener((event) => showNotification(event.notification));
    Notifications.getLastNotificationResponseAsync().then(async (last) => {
      if (!last) return;
      const identifier = last.notification.request.identifier;
      const handled = await SecureStore.getItemAsync(LAST_RESPONSE_KEY);
      if (handled === identifier) return;
      await SecureStore.setItemAsync(LAST_RESPONSE_KEY, identifier);
      showNotification(last.notification);
    }).catch(() => undefined);
    return () => { received.remove(); response.remove(); };
  }, []);

  useEffect(() => {
    if (!exercise || seconds !== 0 || counted.current || !session?.user.id) return;
    counted.current = true;
    const date = new Date();
    const daysSinceMonday = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - daysSinceMonday);
    const week = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const key = `compa.eye-care.progress.${session.user.id}`;
    SecureStore.getItemAsync(key).then((stored) => {
      const saved = stored ? JSON.parse(stored) as { week?: string; completed?: number; [key: string]: unknown } : {};
      const completed = saved.week === week ? (saved.completed ?? 0) + 1 : 1;
      return SecureStore.setItemAsync(key, JSON.stringify({ ...saved, week, completed })).then(() => {
        DeviceEventEmitter.emit("eye-care-completed", { userId: session.user.id, completed });
      });
    }).catch(() => undefined);
  }, [exercise, seconds, session?.user.id]);

  useEffect(() => {
    if (!exercise || seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [exercise, seconds]);

  return (
    <Modal visible={Boolean(exercise)} transparent animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.glow} />
          <BotAvatar size={96} emotion={seconds > 0 ? "focus" : "celebration"} />
          <AppText style={styles.eyebrow}>DESCANSO VISUAL · 20-20-20</AppText>
          <AppText style={styles.title}>{seconds > 0 ? exercise : "¡Descanso completo!"}</AppText>
          <AppText style={styles.text}>{seconds > 0 ? "Hazlo con suavidad y mantén la cabeza quieta." : "Tus ojos ya tuvieron una pausa. Puedes continuar."}</AppText>
          <View style={[styles.timer, seconds === 0 && styles.timerComplete]}>
            {seconds > 0 ? <><AppText style={styles.timerValue}>{seconds}</AppText><AppText style={styles.timerUnit}>SEGUNDOS</AppText></> : <Ionicons name="checkmark" color="#F3E8FF" size={30} />}
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((20 - seconds) / 20) * 100}%` }]} /></View>
          {seconds === 0 ? <Pressable style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]} onPress={() => setExercise(null)}><AppText style={styles.doneText}>Listo, continuar</AppText></Pressable> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, backgroundColor: "rgba(2,4,12,0.92)" },
  card: { width: "100%", maxWidth: 390, borderRadius: 26, borderWidth: 1, borderColor: "rgba(192,132,252,0.48)", alignItems: "center", backgroundColor: "#171329", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, overflow: "hidden" },
  glow: { position: "absolute", width: 210, height: 210, borderRadius: 105, top: -135, backgroundColor: "rgba(168,85,247,0.16)" },
  eyebrow: { color: "#C084FC", fontSize: 7, fontWeight: "900", letterSpacing: 1, marginTop: -4 },
  title: { color: colors.ink, fontSize: 20, lineHeight: 26, fontWeight: "900", textAlign: "center", marginTop: 7 },
  text: { color: colors.text, fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 6 },
  timer: { width: 88, height: 88, borderRadius: 44, borderWidth: 5, borderColor: "#A855F7", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(168,85,247,0.1)", marginTop: 16 },
  timerComplete: { backgroundColor: "#7C3AED" }, timerValue: { color: colors.ink, fontSize: 29, lineHeight: 32, fontWeight: "900" }, timerUnit: { color: "#C4B5FD", fontSize: 6, fontWeight: "900", letterSpacing: 0.7 },
  progressTrack: { width: "100%", height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden", marginTop: 16 }, progressFill: { height: "100%", borderRadius: 3, backgroundColor: "#A855F7" },
  doneButton: { width: "100%", height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#7C3AED", marginTop: 16 }, doneText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" }, pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] }
});
