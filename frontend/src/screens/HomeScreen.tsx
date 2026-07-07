import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { AppText } from "../components/AppText";
import { BotAvatar } from "../components/BotAvatar";
import { Card } from "../components/Card";
import { LoadingState } from "../components/LoadingState";
import { ProgressLine } from "../components/ProgressLine";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { EmptyState } from "../components/EmptyState";
import { useAuth } from "../hooks/useAuth";
import { appApi } from "../services/api";
import { colors } from "../theme/colors";
import { fontFamily } from "../theme/fonts";
import { formatDate, progressPercent } from "../utils/helpers";
import { Tarea } from "../interfaces/academic.interface";
import { Recordatorio } from "../interfaces/reminder.interface";
import { Comida } from "../interfaces/nutrition.interface";
import { RutinaBienestar } from "../interfaces/wellness.interface";

interface DashboardData {
  tasks: Tarea[];
  reminders: Recordatorio[];
  meals: Comida[];
  routines: RutinaBienestar[];
  sensors: unknown[];
}

type NotificationTone = "danger" | "warning" | "info" | "success";

interface AppNotification {
  id: string;
  tone: NotificationTone;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAILY_CALORIE_TARGET = 2200;
const DAILY_WELLNESS_TARGET_MINUTES = 30;
const DAILY_STUDY_TASK_TARGET = 10;

const currentLocalDay = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const readWellnessHabitProgress = async (userId?: number) => {
  try {
    const stored = await SecureStore.getItemAsync(`compa.wellness.habits.${userId ?? "guest"}`);
    if (!stored) return 0;
    const saved = JSON.parse(stored) as { date?: string; habits?: Record<string, { current: number; target: number }> };
    if (saved.date !== currentLocalDay() || !saved.habits) return 0;
    const values = Object.values(saved.habits);
    if (!values.length) return 0;
    return clampPercent(values.reduce((total, habit) => total + Math.min(100, (habit.current / habit.target) * 100), 0) / values.length);
  } catch {
    return 0;
  }
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const isWithinLastDay = (date: string | null | undefined) => {
  if (!date) return false;
  const time = new Date(date).getTime();
  return Number.isFinite(time) && Date.now() - time <= DAY_MS;
};

const isToday = (date: string | null | undefined) => {
  if (!date) return false;
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return false;
  const today = new Date();
  return parsed.getFullYear() === today.getFullYear()
    && parsed.getMonth() === today.getMonth()
    && parsed.getDate() === today.getDate();
};

const dayKey = (date: string | null | undefined) => {
  if (!date) return null;
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const calculateStreak = (data: DashboardData) => {
  const studyByDay = new Map<string, number>();
  const caloriesByDay = new Map<string, number>();
  const wellnessByDay = new Map<string, number>();

  data.tasks
    .filter((task) => task.estado === "completada")
    .forEach((task) => {
      const key = dayKey(task.completada_en ?? task.fecha_limite);
      if (key) studyByDay.set(key, (studyByDay.get(key) ?? 0) + 1);
    });

  data.meals.forEach((meal) => {
    const key = dayKey(meal.fecha);
    if (key) caloriesByDay.set(key, (caloriesByDay.get(key) ?? 0) + meal.calorias);
  });

  data.routines.forEach((routine) => {
    const key = dayKey(routine.fecha);
    if (key) wellnessByDay.set(key, (wellnessByDay.get(key) ?? 0) + routine.duracion_minutos);
  });

  const completedDays = new Set(
    [...new Set([...studyByDay.keys(), ...caloriesByDay.keys(), ...wellnessByDay.keys()])]
      .filter((key) => (studyByDay.get(key) ?? 0) >= DAILY_STUDY_TASK_TARGET
        && (caloriesByDay.get(key) ?? 0) >= DAILY_CALORIE_TARGET
        && (wellnessByDay.get(key) ?? 0) >= DAILY_WELLNESS_TARGET_MINUTES)
  );

  let streak = 0;
  const cursor = new Date();
  const today = dayKey(cursor.toISOString()) ?? "";
  if (!completedDays.has(today)) cursor.setDate(cursor.getDate() - 1);

  while (completedDays.has(dayKey(cursor.toISOString()) ?? "")) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

const hoursUntil = (date: string | null | undefined) => {
  if (!date) return null;
  const time = new Date(date).getTime();
  if (!Number.isFinite(time)) return null;
  return (time - Date.now()) / HOUR_MS;
};

const notificationColor = (tone: NotificationTone) => {
  if (tone === "danger") return colors.danger;
  if (tone === "warning") return colors.warning;
  if (tone === "success") return colors.success;
  return colors.info;
};

const buildNotifications = (
  data: DashboardData,
  streakDays: number,
  calories: number,
  wellnessMinutes: number
): AppNotification[] => {
  const notifications: AppNotification[] = [];
  const pendingTasks = data.tasks.filter((task) => task.estado === "pendiente");
  const overdueTasks = pendingTasks.filter((task) => {
    const hours = hoursUntil(task.fecha_limite);
    return hours !== null && hours < 0;
  });
  const dueSoonTasks = pendingTasks.filter((task) => {
    const hours = hoursUntil(task.fecha_limite);
    return hours !== null && hours >= 0 && hours <= 24;
  });
  const upcomingReminders = data.reminders.filter((reminder) => {
    const hours = hoursUntil(reminder.fecha_hora);
    return !reminder.enviado && hours !== null && hours >= 0 && hours <= 24;
  });

  if (overdueTasks.length > 0) {
    notifications.push({
      id: "tasks-overdue",
      tone: "danger",
      icon: "alert-circle-outline",
      title: "Tareas vencidas",
      message: `${overdueTasks.length} tarea${overdueTasks.length === 1 ? "" : "s"} ya pas${overdueTasks.length === 1 ? "ó" : "aron"} de fecha.`
    });
  }

  if (dueSoonTasks.length > 0) {
    notifications.push({
      id: "tasks-due-soon",
      tone: "warning",
      icon: "time-outline",
      title: "Tareas por cerrar",
      message: `${dueSoonTasks.length} tarea${dueSoonTasks.length === 1 ? "" : "s"} vence${dueSoonTasks.length === 1 ? "" : "n"} dentro de las próximas 24 horas.`
    });
  }

  const nextTask = pendingTasks
    .filter((task) => {
      const hours = hoursUntil(task.fecha_limite);
      return hours !== null && hours >= 0;
    })
    .sort((first, second) => (hoursUntil(first.fecha_limite) ?? Number.MAX_SAFE_INTEGER) - (hoursUntil(second.fecha_limite) ?? Number.MAX_SAFE_INTEGER))[0];

  if (nextTask) {
    notifications.push({
      id: `next-task-${nextTask.id}`,
      tone: "info",
      icon: "book-outline",
      title: "Tu siguiente acción",
      message: `${nextTask.titulo} · ${formatDate(nextTask.fecha_limite)}`
    });
  }

  if (calories === 0) {
    notifications.push({
      id: "nutrition-inactive",
      tone: "info",
      icon: "restaurant-outline",
      title: "Registra tu nutrición",
      message: "Aún no registras alimentos en las últimas 24 horas."
    });
  }

  if (wellnessMinutes === 0) {
    notifications.push({
      id: "wellness-inactive",
      tone: "info",
      icon: "fitness-outline",
      title: "Activa tu bienestar",
      message: "Aún no registras actividad de bienestar en las últimas 24 horas."
    });
  }

  if (streakDays === 0) {
    notifications.push({
      id: "streak-risk",
      tone: "warning",
      icon: "flame-outline",
      title: "Enciende tu racha",
      message: "Completa una acción hoy para empezar a construir constancia."
    });
  }

  upcomingReminders.slice(0, 3).forEach((reminder) => notifications.push({
    id: `reminder-${reminder.id}`,
    tone: "success",
    icon: "notifications-outline",
    title: reminder.titulo,
    message: `Próximo recordatorio · ${formatDate(reminder.fecha_hora)}`
  }));

  return notifications;
};

function HomeMetric({ icon, label, value, color, wash }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string; wash: string }) {
  return (
    <View style={[styles.metricCard, { borderColor: `${color}40`, backgroundColor: wash }]}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}1F` }]}>
        <Ionicons name={icon} color={color} size={18} />
      </View>
      <AppText style={[styles.metricValue, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{value}</AppText>
      <AppText style={styles.metricLabel} numberOfLines={1}>{label}</AppText>
      <View style={[styles.metricAccent, { backgroundColor: color }]} />
    </View>
  );
}

export function HomeScreen() {
  const { session } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [wellnessHabitProgress, setWellnessHabitProgress] = useState(0);
  const [, setDayMarker] = useState(() => new Date().toDateString());
  const bellAttention = useRef(new Animated.Value(0)).current;
  const namePulse = useRef(new Animated.Value(0)).current;
  const streakMotion = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      appApi.getDashboard(session?.user.id).then((nextData) => {
        if (active) setData(nextData);
      });
      readWellnessHabitProgress(session?.user.id).then((progress) => {
        if (active) setWellnessHabitProgress(progress);
      });
      return () => {
        active = false;
      };
    }, [session?.user.id])
  );

  useEffect(() => {
    if (!data || showNotifications || session?.user.preferencias?.notificaciones === false) {
      bellAttention.stopAnimation();
      bellAttention.setValue(0);
      return;
    }

    const recentCalories = data.meals.filter((meal) => isWithinLastDay(meal.fecha)).reduce((total, meal) => total + meal.calorias, 0);
    const recentMinutes = data.routines.filter((routine) => isWithinLastDay(routine.fecha)).reduce((total, routine) => total + routine.duracion_minutos, 0);
    const hasNotifications = buildNotifications(data, calculateStreak(data), recentCalories, recentMinutes).length > 0;

    if (!hasNotifications) {
      bellAttention.setValue(0);
      return;
    }

    const animation = Animated.loop(Animated.sequence([
      Animated.delay(1100),
      Animated.timing(bellAttention, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(bellAttention, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.delay(3400)
    ]));
    animation.start();
    return () => animation.stop();
  }, [bellAttention, data, session?.user.preferencias?.notificaciones, showNotifications]);

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(namePulse, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(namePulse, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
    ]));
    animation.start();
    return () => animation.stop();
  }, [namePulse]);

  useEffect(() => {
    const timer = setInterval(() => {
      setDayMarker(new Date().toDateString());
      readWellnessHabitProgress(session?.user.id).then(setWellnessHabitProgress);
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, [session?.user.id]);

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(streakMotion, { toValue: 1, duration: 1250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(streakMotion, { toValue: 0, duration: 1250, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
    ]));
    animation.start();
    return () => animation.stop();
  }, [streakMotion]);

  if (!data) return <Screen><LoadingState /></Screen>;

  const completedToday = data.tasks.filter((task) => task.estado === "completada" && isToday(task.completada_en ?? task.fecha_limite)).length;
  const recentMeals = data.meals.filter((meal) => isToday(meal.fecha));
  const recentRoutines = data.routines.filter((routine) => isToday(routine.fecha));
  const calories = recentMeals.reduce((total, meal) => total + meal.calorias, 0);
  const wellnessMinutes = recentRoutines.reduce((total, routine) => total + routine.duracion_minutos, 0);
  const studyProgress = completedToday === 0 ? 0 : clampPercent((completedToday / DAILY_STUDY_TASK_TARGET) * 100);
  const nutritionProgress = calories === 0 ? 0 : clampPercent((calories / DAILY_CALORIE_TARGET) * 100);
  const wellnessProgress = wellnessHabitProgress;
  const overallProgress = clampPercent((studyProgress + nutritionProgress + wellnessProgress) / 3);
  const streakDays = calculateStreak(data);
  const notifications = session?.user.preferencias?.notificaciones === false
    ? []
    : buildNotifications(data, streakDays, calories, wellnessMinutes);
  const firstName = session?.user.nombre.split(" ")[0] ?? "Compa";
  const streakActive = streakDays > 0;
  const dailyGoalComplete = overallProgress >= 100;
  const mascotAwake = studyProgress >= 10 && nutritionProgress >= 10 && wellnessProgress >= 10;
  const streakMessage = mascotAwake
    ? dailyGoalComplete
      ? "¡Día completo! Las tres áreas llegaron a su meta."
      : "¡Estoy despierta! Las tres áreas ya superaron el 10% de hoy."
    : streakActive
      ? "Lleva Estudio, Nutrición y Bienestar al 10% para despertarme."
      : "Avanza al menos 10% en cada una de las tres áreas para activar a Compa.";
  const streakTranslateY = streakMotion.interpolate({ inputRange: [0, 1], outputRange: mascotAwake ? [1, -4] : [0, 2] });
  const streakScale = streakMotion.interpolate({ inputRange: [0, 1], outputRange: mascotAwake ? [1, 1.055] : [1, 0.97] });
  const streakRotate = streakMotion.interpolate({ inputRange: [0, 1], outputRange: mascotAwake ? ["-2deg", "2deg"] : ["0deg", "-1deg"] });
  const bellRotate = bellAttention.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: ["0deg", "-12deg", "12deg", "-8deg", "8deg", "0deg"]
  });
  const badgeScale = bellAttention.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.22, 1] });
  const nameScale = namePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const nameTranslateY = namePulse.interpolate({ inputRange: [0, 1], outputRange: [1, -2] });
  const nameRotate = namePulse.interpolate({ inputRange: [0, 1], outputRange: ["-1deg", "1deg"] });
  return (
    <Screen>
      <View style={styles.homeHeader}>
        <View style={styles.greetingMascot}>
          <View style={styles.mascotGlow} />
          <BotAvatar size={78} emotion="support" />
        </View>
        <View style={styles.greetingCopy}>
          <View style={styles.greetingEyebrowRow}>
            <Ionicons name="sparkles" color="#BD64FF" size={13} />
            <AppText style={styles.greetingEyebrow}>TU DÍA CON COMPA</AppText>
          </View>
          <Animated.View style={[styles.greetingTitleRow, { transform: [{ translateY: nameTranslateY }, { rotate: nameRotate }, { scale: nameScale }] }]}>
            <AppText style={styles.greetingTitle}>Hola,</AppText>
            <View style={styles.greetingNameWrap}>
              <AppText style={styles.greetingName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{firstName}</AppText>
            </View>
          </Animated.View>
          <AppText style={styles.greetingSubtitle}>¿Lista para hacer que hoy cuente?</AppText>
        </View>
        <View style={styles.headerAction}>
          <Animated.View style={{ transform: [{ rotate: bellRotate }] }}>
            <Pressable style={({ pressed }) => [styles.bell, notifications.length > 0 && styles.bellActive, pressed && styles.bellPressed]} onPress={() => setShowNotifications(true)}>
              <Ionicons name={showNotifications ? "notifications" : "notifications-outline"} color="#BD64FF" size={24} />
              {notifications.length > 0 ? (
                <Animated.View style={[styles.badgeDot, { transform: [{ scale: badgeScale }] }]}>
                  <AppText style={styles.badgeText}>{notifications.length}</AppText>
                </Animated.View>
              ) : null}
            </Pressable>
          </Animated.View>
        </View>
      </View>
      <SectionTitle title="¿Qué haremos hoy?" />
      <View style={styles.statsRow}>
        <HomeMetric icon="book-outline" label="Tareas" value={`${data.tasks.length}`} color={colors.info} wash="rgba(96,165,250,0.09)" />
        <HomeMetric icon="nutrition-outline" label="kcal hoy" value={`${calories}`} color={colors.aqua} wash="rgba(94,234,212,0.08)" />
        <HomeMetric icon="fitness-outline" label="Minutos" value={`${wellnessMinutes}`} color={colors.accent} wash="rgba(251,191,119,0.08)" />
      </View>

      {data.tasks.length === 0 && data.meals.length === 0 && data.routines.length === 0 ? (
        <EmptyState
          icon="sparkles-outline"
          title="Tu espacio está listo"
          message="Aún no tienes tareas, comidas o rutinas registradas. Cuando empieces, tu progreso aparecerá aquí."
        />
      ) : null}

      <SectionTitle title="Tu progreso" action="Hoy" actionColor="#BD64FF" />
      <View style={styles.progressCard}>
        <View style={styles.progressWash} />
        <View style={styles.progressOrb}>
          <View style={styles.circle}>
            <AppText style={styles.circleText}>{overallProgress}%</AppText>
          </View>
          <AppText style={styles.circleLabel}>Hoy</AppText>
        </View>
        <View style={styles.progressLines}>
          <ProgressLine label="Estudio" value={studyProgress} color={colors.info} />
          <ProgressLine label="Nutrición" value={nutritionProgress} color={colors.aqua} />
          <ProgressLine label="Bienestar" value={wellnessProgress} color={colors.accent} />
        </View>
      </View>

      <SectionTitle title="Racha" />
      <View style={styles.streak}>
        <View style={styles.streakMascot}>
          <View style={[styles.streakMascotGlow, mascotAwake && styles.streakMascotGlowActive]} />
          <Animated.View style={{ transform: [{ translateY: streakTranslateY }, { rotate: streakRotate }, { scale: streakScale }] }}>
            <BotAvatar size={96} emotion={mascotAwake ? "streakOn" : "streakOff"} animated={false} />
          </Animated.View>
        </View>
        <View style={styles.streakCopy}>
          <View style={styles.streakTopLine}>
            <AppText style={styles.streakLabel}>Contador</AppText>
            <View style={[styles.streakPill, mascotAwake && styles.streakPillActive]}>
              <AppText style={[styles.streakPillText, mascotAwake && styles.streakPillTextActive]}>
                {mascotAwake ? "¡Despierta!" : "¡Despiértame!"}
              </AppText>
            </View>
          </View>
          <AppText style={styles.streakNumber}>{streakDays} día{streakDays === 1 ? "" : "s"}</AppText>
          <AppText style={styles.itemMeta}>{streakMessage}</AppText>
        </View>
      </View>

      <Modal visible={showNotifications} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowNotifications(false)}>
        <View style={styles.notificationBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowNotifications(false)} />
          <View style={styles.notificationModal}>
            <View style={styles.notificationHeader}>
              <View style={styles.notificationIdentity}>
                <BotAvatar size={62} emotion={notifications.length ? "alert" : "encourage"} />
                <View style={styles.notificationHeadingCopy}>
                  <AppText style={styles.notificationEyebrow}>COMPA TE AVISA</AppText>
                  <AppText style={styles.notificationTitle}>Notificaciones</AppText>
                  <AppText style={styles.notificationSummary}>
                    {notifications.length ? `${notifications.length} por revisar` : "Todo está en orden"}
                  </AppText>
                </View>
              </View>
              <Pressable style={styles.notificationClose} onPress={() => setShowNotifications(false)} accessibilityLabel="Cerrar notificaciones">
                <Ionicons name="close" color={colors.ink} size={21} />
              </Pressable>
            </View>

            <ScrollView style={styles.notificationList} contentContainerStyle={styles.notificationListContent} showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={styles.notificationEmpty}>
                  <View style={styles.notificationEmptyIcon}>
                    <Ionicons name="checkmark" color={colors.background} size={25} />
                  </View>
                  <AppText style={styles.notificationEmptyTitle}>Nada pendiente</AppText>
                  <AppText style={styles.notificationEmptyText}>Disfruta el momento. Te avisaré cuando algo necesite tu atención.</AppText>
                </View>
              ) : notifications.map((notification) => {
                const tone = notificationColor(notification.tone);
                return (
                  <View key={notification.id} style={[styles.notificationRow, { borderColor: `${tone}35` }]}>
                    <View style={[styles.notificationIcon, { backgroundColor: `${tone}1C` }]}>
                      <Ionicons name={notification.icon} color={tone} size={21} />
                    </View>
                    <View style={styles.notificationCopy}>
                      <AppText style={styles.notificationItemTitle} numberOfLines={1}>{notification.title}</AppText>
                      <AppText style={styles.notificationText} numberOfLines={2}>{notification.message}</AppText>
                    </View>
                    <View style={[styles.notificationStatus, { backgroundColor: tone }]} />
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  homeHeader: {
    minHeight: 94,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14
  },
  greetingMascot: {
    width: 82,
    height: 88,
    alignItems: "center",
    justifyContent: "center"
  },
  mascotGlow: {
    position: "absolute",
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(244,114,182,0.12)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.18)"
  },
  greetingCopy: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 4
  },
  greetingEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2
  },
  greetingEyebrow: {
    color: "#BD64FF",
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900"
  },
  greetingTitle: {
    color: colors.ink,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "900"
  },
  greetingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0
  },
  greetingNameWrap: {
    flexShrink: 1,
    minWidth: 0,
    position: "relative"
  },
  greetingName: {
    color: colors.ink,
    fontFamily: fontFamily.light,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "300"
  },
  greetingSubtitle: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 2
  },
  headerAction: {
    alignSelf: "flex-start",
    paddingTop: 7
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(189,100,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(189,100,255,0.34)"
  },
  bellActive: {
    backgroundColor: "rgba(189,100,255,0.2)",
    borderColor: "rgba(189,100,255,0.52)"
  },
  bellPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }]
  },
  badgeDot: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.danger,
    borderWidth: 1,
    borderColor: colors.background
  },
  badgeText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 13
  },
  notificationBackdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    backgroundColor: "rgba(2,6,23,0.82)"
  },
  notificationModal: {
    width: "100%",
    maxHeight: "72%",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.24)",
    backgroundColor: colors.surface,
    overflow: "hidden"
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(139,92,246,0.07)"
  },
  notificationIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  notificationHeadingCopy: {
    flex: 1,
    minWidth: 0
  },
  notificationEyebrow: {
    color: colors.aqua,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "900"
  },
  notificationTitle: {
    color: colors.ink,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: "900",
    marginTop: 1
  },
  notificationSummary: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 13
  },
  notificationClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  notificationList: {
    flexGrow: 0
  },
  notificationListContent: {
    padding: 12,
    gap: 8
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 66,
    padding: 10,
    borderRadius: 15,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    backgroundColor: "rgba(255,255,255,0.035)"
  },
  notificationIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  notificationCopy: {
    flex: 1,
    minWidth: 0
  },
  notificationItemTitle: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900"
  },
  notificationText: {
    color: colors.text,
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15
  },
  notificationStatus: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  notificationEmpty: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 26
  },
  notificationEmptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success,
    marginBottom: 10
  },
  notificationEmptyTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  notificationEmptyText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 4
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 91,
    borderRadius: 15,
    borderWidth: 1,
    padding: 10,
    justifyContent: "space-between",
    overflow: "hidden"
  },
  metricIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  metricValue: {
    fontSize: 19,
    lineHeight: 21,
    fontWeight: "900",
    marginTop: 6
  },
  metricLabel: {
    color: colors.text,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "800"
  },
  metricAccent: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 0,
    height: 2,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2
  },
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 0,
    paddingVertical: 13,
    paddingHorizontal: 14,
    position: "relative",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.38)",
    backgroundColor: "#191632",
    overflow: "hidden",
    elevation: 0,
    shadowOpacity: 0
  },
  progressWash: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    left: -46,
    top: -36,
    backgroundColor: "rgba(139,92,246,0.085)"
  },
  progressOrb: {
    alignItems: "center",
    gap: 4
  },
  circle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 7,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(3,5,31,0.52)",
    shadowColor: colors.primary,
    shadowOpacity: 0.34,
    shadowRadius: 14
  },
  circleText: {
    color: colors.ink,
    fontWeight: "900",
    fontSize: 16
  },
  circleLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  progressLines: {
    flex: 1,
    minWidth: 176
  },
  streak: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 12,
    paddingHorizontal: 13,
    position: "relative",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(189,100,255,0.36)",
    backgroundColor: "#21153D",
    overflow: "hidden",
    elevation: 0,
    shadowOpacity: 0
  },
  streakMascot: {
    width: 96,
    height: 88,
    alignItems: "center",
    justifyContent: "center"
  },
  streakMascotGlow: {
    position: "absolute",
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "rgba(139,92,246,0.1)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.18)"
  },
  streakMascotGlowActive: {
    backgroundColor: "rgba(189,100,255,0.16)",
    borderColor: "rgba(251,191,119,0.34)"
  },
  streakMark: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center"
  },
  streakMarkActive: {
    transform: [{ scale: 1.02 }]
  },
  streakMarkHalo: {
    position: "absolute",
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255,184,77,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,184,77,0.32)"
  },
  streakMarkCore: {
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,184,77,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,184,77,0.45)",
    shadowColor: colors.accent,
    shadowOpacity: 0.42,
    shadowRadius: 16
  },
  streakHeart: {
    position: "absolute",
    right: 5,
    bottom: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.pink,
    borderWidth: 2,
    borderColor: colors.background
  },
  streakSpark: {
    position: "absolute",
    top: 1,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(39,183,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(39,183,255,0.34)"
  },
  streakCopy: {
    flex: 1,
    minWidth: 0
  },
  streakTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  streakLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  streakPill: {
    minHeight: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.36)",
    backgroundColor: "rgba(139,92,246,0.13)",
    justifyContent: "center",
    paddingHorizontal: 9
  },
  streakPillActive: {
    borderColor: "rgba(36,229,164,0.38)",
    backgroundColor: "rgba(36,229,164,0.13)"
  },
  streakPillText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900"
  },
  streakPillTextActive: {
    color: colors.success
  },
  streakNumber: {
    color: colors.primary,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "900",
    marginTop: 2
  },
  itemTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1
  },
  itemMeta: {
    color: colors.muted,
    marginTop: 5,
    lineHeight: 18,
    fontSize: 12
  }
});
