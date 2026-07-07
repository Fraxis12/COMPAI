import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Alert,
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as SecureStore from "expo-secure-store";
import { AppText } from "../components/AppText";
import { AssistantChat } from "../components/AssistantChat";
import { BotAvatar } from "../components/BotAvatar";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { LoadingState } from "../components/LoadingState";
import { Screen } from "../components/Screen";
import { Recordatorio } from "../interfaces/reminder.interface";
import { RutinaBienestar } from "../interfaces/wellness.interface";
import { useAuth } from "../hooks/useAuth";
import { appApi } from "../services/api";
import { cancelCareNotification, isEyeCareScheduleActive, scheduleCareNotification, startEyeCareSchedule, stopEyeCareSchedule } from "../services/notifications";
import { colors } from "../theme/colors";
import { formatDate } from "../utils/helpers";

type HabitKey = "water" | "sleep" | "exercise" | "calm";
type IconName = keyof typeof Ionicons.glyphMap;

interface HabitState {
  current: number;
  target: number;
}

interface PendingMission {
  key: HabitKey;
  amount: number;
  title: string;
  subtitle: string;
  icon: IconName;
  color: string;
}

const habitDetails: Record<HabitKey, { title: string; unit: string; icon: IconName; color: string }> = {
  water: { title: "Beber agua", unit: "L", icon: "water-outline", color: "#38BDF8" },
  sleep: { title: "Dormir bien", unit: "h", icon: "moon-outline", color: "#34D399" },
  exercise: { title: "Ejercicio", unit: "min", icon: "walk-outline", color: "#FBBF77" },
  calm: { title: "Tiempo de calma", unit: "min", icon: "leaf-outline", color: "#F472B6" }
};

const initialHabits: Record<HabitKey, HabitState> = {
  water: { current: 0, target: 2 },
  sleep: { current: 0, target: 8 },
  exercise: { current: 0, target: 30 },
  calm: { current: 0, target: 10 }
};

const localDayKey = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const localWeekKey = () => {
  const date = new Date();
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const percentage = ({ current, target }: HabitState) => Math.min(100, Math.round((current / target) * 100));

export function WellnessScreen() {
  const { session } = useAuth();
  const [data, setData] = useState<{ routines: RutinaBienestar[]; reminders: Recordatorio[] } | null>(null);
  const [habits, setHabits] = useState(initialHabits);
  const [habitDay, setHabitDay] = useState(localDayKey);
  const [habitsReady, setHabitsReady] = useState(false);
  const [dailyConfigured, setDailyConfigured] = useState(false);
  const [dailySetupVisible, setDailySetupVisible] = useState(false);
  const [waterGoal, setWaterGoal] = useState("2");
  const [exerciseGoal, setExerciseGoal] = useState("30");
  const [calmGoal, setCalmGoal] = useState("10");
  const [lastNightSleep, setLastNightSleep] = useState("");
  const [routineModalVisible, setRoutineModalVisible] = useState(false);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [activity, setActivity] = useState("");
  const [duration, setDuration] = useState("");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [showIosTime, setShowIosTime] = useState(false);
  const [savingRoutine, setSavingRoutine] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);
  const [pendingMission, setPendingMission] = useState<PendingMission | null>(null);
  const [missionAmount, setMissionAmount] = useState("");
  const [missionError, setMissionError] = useState("");
  const [missionAdvice, setMissionAdvice] = useState("");
  const [askingCompAI, setAskingCompAI] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [eyeCareActive, setEyeCareActive] = useState(false);
  const [eyeCareLoading, setEyeCareLoading] = useState(false);
  const [eyeCareStartTime, setEyeCareStartTime] = useState("00:00");
  const [eyeCareNextTime, setEyeCareNextTime] = useState("00:00");
  const [eyeCareStartedAt, setEyeCareStartedAt] = useState<number | null>(null);
  const [eyeCareNextAt, setEyeCareNextAt] = useState<number | null>(null);
  const [eyeExercisesCompleted, setEyeExercisesCompleted] = useState(0);
  const [eyeCareWeek, setEyeCareWeek] = useState(localWeekKey);
  const [eyeCareModalVisible, setEyeCareModalVisible] = useState(false);
  const [showScheduledReminders, setShowScheduledReminders] = useState(false);
  const [personalizedAdvice, setPersonalizedAdvice] = useState("");
  const [refreshingAdvice, setRefreshingAdvice] = useState(false);
  const adviceGlow = useRef(new Animated.Value(0)).current;
  const adviceMascotMotion = useRef(new Animated.Value(0)).current;
  const eyeCareProgressKey = `compa.eye-care.progress.${session?.user.id ?? "guest"}`;

  useEffect(() => {
    appApi.getWellness(session?.user.id).then(setData).catch((error: Error) => Alert.alert("No pudimos cargar Bienestar", error.message));
    Promise.all([isEyeCareScheduleActive(), SecureStore.getItemAsync(eyeCareProgressKey)]).then(([active, stored]) => {
      setEyeCareActive(active);
      if (!stored) return;
      const saved = JSON.parse(stored) as { date?: string; week?: string; startedAt?: number; nextAt?: number; completed?: number };
      const sameWeek = saved.week === localWeekKey();
      setEyeExercisesCompleted(sameWeek ? saved.completed ?? 0 : 0);
      if (saved.date !== localDayKey()) return;
      if (!saved.startedAt) return;
      const startedAt = new Date(saved.startedAt);
      const nextTimestamp = saved.nextAt && saved.nextAt > Date.now() ? saved.nextAt : Date.now() + 20 * 60 * 1000;
      const nextAt = new Date(nextTimestamp);
      const time = (date: Date) => date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false });
      setEyeCareStartedAt(saved.startedAt);
      setEyeCareNextAt(nextTimestamp);
      setEyeCareStartTime(time(startedAt));
      setEyeCareNextTime(time(nextAt));
    }).catch(() => undefined);
  }, [eyeCareProgressKey, session?.user.id]);

  useEffect(() => {
    const glowLoop = Animated.loop(Animated.sequence([
      Animated.timing(adviceGlow, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(adviceGlow, { toValue: 0, duration: 1200, useNativeDriver: true })
    ]));
    const mascotLoop = Animated.loop(Animated.sequence([
      Animated.delay(1800),
      Animated.timing(adviceMascotMotion, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(adviceMascotMotion, { toValue: -1, duration: 520, useNativeDriver: true }),
      Animated.timing(adviceMascotMotion, { toValue: 0, duration: 380, useNativeDriver: true }),
      Animated.delay(2200)
    ]));
    glowLoop.start();
    mascotLoop.start();
    return () => { glowLoop.stop(); mascotLoop.stop(); };
  }, [adviceGlow, adviceMascotMotion]);

  useEffect(() => {
    if (!eyeCareActive || eyeCareNextAt === null) return;
    const updateEyeCareProgress = () => {
      const interval = 20 * 60 * 1000;
      const next = eyeCareNextAt > Date.now() ? eyeCareNextAt : eyeCareNextAt + (Math.floor((Date.now() - eyeCareNextAt) / interval) + 1) * interval;
      if (next !== eyeCareNextAt) setEyeCareNextAt(next);
      setEyeCareNextTime(new Date(next).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false }));
    };
    updateEyeCareProgress();
    const timer = setInterval(updateEyeCareProgress, 1000);
    return () => clearInterval(timer);
  }, [eyeCareActive, eyeCareNextAt]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener("eye-care-completed", (event: { userId?: number; completed?: number }) => {
      if (event.userId === session?.user.id && typeof event.completed === "number") setEyeExercisesCompleted(event.completed);
    });
    return () => subscription.remove();
  }, [session?.user.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      const currentWeek = localWeekKey();
      if (currentWeek === eyeCareWeek) return;
      setEyeCareWeek(currentWeek);
      setEyeExercisesCompleted(0);
      SecureStore.setItemAsync(eyeCareProgressKey, JSON.stringify({ date: localDayKey(), week: currentWeek, completed: 0 })).catch(() => undefined);
    }, 60000);
    return () => clearInterval(timer);
  }, [eyeCareProgressKey, eyeCareWeek]);

  useEffect(() => {
    let active = true;
    const storageKey = `compa.wellness.habits.${session?.user.id ?? "guest"}`;
    const today = localDayKey();
    setHabitsReady(false);
    SecureStore.getItemAsync(storageKey)
      .then((stored) => {
        if (!active) return;
        if (stored) {
          const saved = JSON.parse(stored) as { date?: string; habits?: Record<HabitKey, HabitState>; configured?: boolean };
          if (saved.date === today && saved.habits && saved.configured === true) {
            setHabits(saved.habits);
            setDailyConfigured(true);
            setDailySetupVisible(false);
          } else {
            setHabits(initialHabits);
            setDailyConfigured(false);
            setDailySetupVisible(true);
          }
        } else {
          setHabits(initialHabits);
          setDailyConfigured(false);
          setDailySetupVisible(true);
        }
        setHabitDay(today);
      })
      .catch(() => {
        if (active) {
          setHabits(initialHabits);
          setHabitDay(today);
          setDailyConfigured(false);
          setDailySetupVisible(true);
        }
      })
      .finally(() => active && setHabitsReady(true));
    return () => { active = false; };
  }, [session?.user.id]);

  useEffect(() => {
    if (!habitsReady || !dailyConfigured) return;
    const storageKey = `compa.wellness.habits.${session?.user.id ?? "guest"}`;
    SecureStore.setItemAsync(storageKey, JSON.stringify({ date: habitDay, habits, configured: true })).catch(() => undefined);
  }, [dailyConfigured, habitDay, habits, habitsReady, session?.user.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      const today = localDayKey();
      if (today !== habitDay) {
        setHabits(initialHabits);
        setHabitDay(today);
        setDailyConfigured(false);
        setDailySetupVisible(true);
        setLastNightSleep("");
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [habitDay]);

  const habitPercentages = useMemo(() => ({
    water: percentage(habits.water),
    sleep: habits.sleep.current > 0 ? 100 : 0,
    exercise: percentage(habits.exercise),
    calm: percentage(habits.calm)
  }), [habits]);

  const wellbeing = Math.round(Object.values(habitPercentages).reduce((total, value) => total + value, 0) / 4);
  const wellbeingReminders = data?.reminders.filter((reminder) => reminder.tipo === "bienestar" && !reminder.titulo.startsWith("Descansar más temprano")) ?? [];

  const advice = useMemo(() => {
    if (habitPercentages.water < 70) return "Tu cuerpo necesita hidratación. Toma un vaso de agua ahora.";
    if (habits.sleep.current > 0 && habits.sleep.current < 7) return "Tu descanso fue corto. CompAI te recordará prepararte para dormir más temprano.";
    if (habitPercentages.exercise < 70) return "No necesitas entrenar fuerte. Una caminata corta también cuenta.";
    if (habitPercentages.calm < 70) return "Haz una pausa de 2 minutos y respira lento.";
    return "Pequeños hábitos, grandes cambios. Sigue así, estoy orgulloso de ti.";
  }, [habitPercentages, habits.sleep.current]);

  const saveDailySetup = async () => {
    const water = Number(waterGoal);
    const exercise = Number(exerciseGoal);
    const calm = Number(calmGoal);
    const sleep = Number(lastNightSleep);
    if (![water, exercise, calm, sleep].every((value) => Number.isFinite(value) && value > 0) || water > 10 || exercise > 300 || calm > 180 || sleep > 24) {
      Alert.alert("Revisa tus datos", "Ingresa metas válidas y las horas que dormiste anoche.");
      return;
    }
    const configuredHabits: Record<HabitKey, HabitState> = {
      water: { current: dailyConfigured ? Math.min(habits.water.current, water) : 0, target: water },
      sleep: { current: sleep, target: sleep },
      exercise: { current: dailyConfigured ? Math.min(habits.exercise.current, exercise) : 0, target: exercise },
      calm: { current: dailyConfigured ? Math.min(habits.calm.current, calm) : 0, target: calm }
    };
    setHabits(configuredHabits);
    setHabitDay(localDayKey());
    setDailyConfigured(true);
    setDailySetupVisible(false);

    if (session?.user.id) {
      const automaticSleepReminders = data?.reminders.filter((reminder) => reminder.tipo === "bienestar" && reminder.titulo.startsWith("Descansar más temprano") && !reminder.enviado) ?? [];
      if (sleep < 7 && automaticSleepReminders.length === 0) {
        const reminderTime = new Date();
        reminderTime.setHours(21, 30, 0, 0);
        if (reminderTime.getTime() <= Date.now()) reminderTime.setDate(reminderTime.getDate() + 1);
        try {
          const reminder = await appApi.createReminder({ titulo: `Descansar más temprano · dormiste ${sleep} h`, tipo: "bienestar", fecha_hora: reminderTime.toISOString(), usuario_id: session.user.id });
          setData((current) => current ? { ...current, reminders: [reminder, ...current.reminders] } : current);
          await scheduleCareNotification(reminder).catch(() => false);
        } catch {
          // La configuración diaria se conserva aunque el aviso remoto no esté disponible.
        }
      } else if (sleep >= 7 && automaticSleepReminders.length > 0) {
        await Promise.all(automaticSleepReminders.map((reminder) => cancelCareNotification(reminder.id).catch(() => undefined)));
        await Promise.all(automaticSleepReminders.map((reminder) => appApi.deleteReminder(reminder.id).catch(() => undefined)));
        const automaticIds = new Set(automaticSleepReminders.map((reminder) => reminder.id));
        setData((current) => current ? { ...current, reminders: current.reminders.filter((reminder) => !automaticIds.has(reminder.id)) } : current);
      }
    }
  };

  const addToHabit = (key: HabitKey, amount: number) => {
    setHabits((current) => ({
      ...current,
      [key]: { ...current[key], current: Math.min(current[key].target, current[key].current + amount) }
    }));
  };

  const openMission = (mission: PendingMission) => {
    setPendingMission(mission);
    setMissionAmount("");
    setMissionError("");
    setMissionAdvice("");
  };

  const closeMission = () => {
    setPendingMission(null);
    setMissionAmount("");
    setMissionError("");
    setMissionAdvice("");
  };

  const confirmMission = () => {
    if (!pendingMission) return;
    const amount = Number(missionAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setMissionError(pendingMission.key === "water" ? "Escribe cuántos litros tomaste." : "Escribe cuántos minutos realizaste.");
      return;
    }
    addToHabit(pendingMission.key, amount);
    closeMission();
  };

  const askCompAIForMission = async () => {
    if (!pendingMission || askingCompAI) return;
    const prompts: Record<HabitKey, string> = {
      water: "Dame tres ideas breves y prácticas para hidratarme mejor hoy.",
      exercise: "Recomiéndame tres ejercicios sencillos que pueda hacer hoy, incluyendo una opción suave y una sin equipo.",
      calm: "Recomiéndame tres opciones para un momento de calma hoy: puede ser una película reconfortante, una lectura corta o una actividad tranquila.",
      sleep: "Dame tres consejos breves para descansar mejor esta noche."
    };
    setAskingCompAI(true);
    setMissionAdvice("");
    try {
      const previousIdeas = missionAdvice ? ` Ya me sugeriste lo siguiente: ${missionAdvice}. Ahora dame opciones nuevas y diferentes, sin repetirlas.` : "";
      const response = await appApi.chat([{ role: "user", content: `${prompts[pendingMission.key]}${previousIdeas}` }]);
      setMissionAdvice(response.message);
    } catch (error) {
      setMissionAdvice(error instanceof Error ? error.message : "CompAI no pudo responder en este momento.");
    } finally {
      setAskingCompAI(false);
    }
  };

  const continueMissionInChat = () => {
    const topic = pendingMission?.title ?? "mi bienestar";
    setChatDraft(`Quiero saber más sobre opciones para ${topic.toLowerCase()}. `);
    closeMission();
    setTimeout(() => setChatVisible(true), 180);
  };

  const startEyeCare = async () => {
    setEyeCareLoading(true);
    const active = await startEyeCareSchedule().catch(() => false);
    setEyeCareActive(active);
    if (active) {
      const startedAt = new Date();
      const nextAt = new Date(startedAt.getTime() + 20 * 60 * 1000);
      const time = (date: Date) => date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false });
      setEyeCareStartTime(time(startedAt));
      setEyeCareNextTime(time(nextAt));
      setEyeCareStartedAt(startedAt.getTime());
      setEyeCareNextAt(nextAt.getTime());
      await SecureStore.setItemAsync(eyeCareProgressKey, JSON.stringify({ date: localDayKey(), week: localWeekKey(), startedAt: startedAt.getTime(), nextAt: nextAt.getTime(), completed: eyeExercisesCompleted }));
    }
    setEyeCareLoading(false);
    if (!active) Alert.alert("Activa las notificaciones", "Permite las notificaciones para iniciar los descansos visuales cada 20 minutos.");
  };

  const stopEyeCare = async () => {
    setEyeCareLoading(true);
    await stopEyeCareSchedule().catch(() => undefined);
    setEyeCareActive(false);
    if (eyeCareStartedAt !== null) await SecureStore.setItemAsync(eyeCareProgressKey, JSON.stringify({ date: localDayKey(), week: localWeekKey(), startedAt: eyeCareStartedAt, nextAt: eyeCareNextAt, completed: eyeExercisesCompleted }));
    setEyeCareLoading(false);
  };

  const resetEyeCare = async () => {
    setEyeCareLoading(true);
    await stopEyeCareSchedule().catch(() => undefined);
    setEyeCareActive(false);
    setEyeCareStartTime("00:00");
    setEyeCareNextTime("00:00");
    setEyeCareStartedAt(null);
    setEyeCareNextAt(null);
    await SecureStore.setItemAsync(eyeCareProgressKey, JSON.stringify({ date: localDayKey(), week: localWeekKey(), completed: eyeExercisesCompleted })).catch(() => undefined);
    setEyeCareLoading(false);
  };

  const refreshPersonalizedAdvice = async () => {
    if (refreshingAdvice) return;
    const historyKey = `compa.wellness.advice.${session?.user.id ?? "guest"}`;
    setRefreshingAdvice(true);
    try {
      const stored = await SecureStore.getItemAsync(historyKey);
      const history = stored ? JSON.parse(stored) as string[] : [];
      const response = await appApi.chat([{ role: "user", content: `Escribe un único consejo valioso y personalizado. Alterna entre salud física, salud mental, emociones, ejercicio, descanso, concentración, relaciones y sabiduría práctica; nunca hables de nutrición y elige un ámbito diferente a los consejos recientes. Debe ser accionable, tener una sola oración, entre 25 y 30 palabras, sin saludos ni explicaciones. Datos de hoy: agua ${habits.water.current}/${habits.water.target} litros, sueño ${habits.sleep.current} horas, ejercicio ${habits.exercise.current}/${habits.exercise.target} minutos y calma ${habits.calm.current}/${habits.calm.target} minutos. Consejos recientes que no debes repetir ni imitar: ${history.join(" | ") || "ninguno"}. Responde solamente con el consejo.` }]);
      const normalized = response.message.replace(/\s+/g, " ").trim();
      const compactAdvice = normalized.length > 185 ? `${normalized.slice(0, 182).replace(/\s+\S*$/, "")}…` : normalized;
      setPersonalizedAdvice(compactAdvice);
      await SecureStore.setItemAsync(historyKey, JSON.stringify([...history, compactAdvice].slice(-10)));
    } catch (error) {
      Alert.alert("No pudimos renovar el consejo", error instanceof Error ? error.message : "Inténtalo nuevamente.");
    } finally {
      setRefreshingAdvice(false);
    }
  };

  const closeRoutineModal = () => {
    setRoutineModalVisible(false);
    setActivity("");
    setDuration("");
  };

  const createRoutine = async () => {
    const parsedDuration = Number(duration);
    if (!session?.user.id || !activity.trim() || !Number.isFinite(parsedDuration) || parsedDuration < 1) {
      Alert.alert("Revisa la rutina", "Escribe una actividad y una duración válida.");
      return;
    }
    setSavingRoutine(true);
    try {
      const routine = await appApi.createRoutine({
        actividad: activity.trim(),
        duracion_minutos: parsedDuration,
        fecha: new Date().toISOString(),
        usuario_id: session.user.id
      });
      setData((current) => current ? { ...current, routines: [routine, ...current.routines] } : current);
      closeRoutineModal();
    } catch (error) {
      Alert.alert("No pudimos guardar la rutina", error instanceof Error ? error.message : "Inténtalo nuevamente.");
    } finally {
      setSavingRoutine(false);
    }
  };

  const createReminder = async () => {
    if (!session?.user.id || !reminderTitle.trim()) {
      Alert.alert("Falta el título", "Escribe qué deseas recordar.");
      return;
    }
    setSavingReminder(true);
    try {
      const scheduledDate = new Date(reminderDate);
      if (scheduledDate.getTime() <= Date.now()) scheduledDate.setDate(scheduledDate.getDate() + 1);
      const reminder = await appApi.createReminder({
        titulo: reminderTitle.trim(),
        tipo: "bienestar",
        fecha_hora: scheduledDate.toISOString(),
        usuario_id: session.user.id
      });
      setData((current) => current ? { ...current, reminders: [reminder, ...current.reminders] } : current);
      setReminderModalVisible(false);
      setReminderTitle("");
      setReminderDate(new Date(Date.now() + 60 * 60 * 1000));
      const scheduled = await scheduleCareNotification(reminder).catch(() => false);
      if (!scheduled) Alert.alert("Activa las notificaciones", "El cuidado quedó guardado, pero debes permitir notificaciones para recibir el aviso fuera de CompAI.");
    } catch (error) {
      Alert.alert("No pudimos guardar el recordatorio", error instanceof Error ? error.message : "Inténtalo nuevamente.");
    } finally {
      setSavingReminder(false);
    }
  };

  const openTimePicker = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: reminderDate,
        mode: "time",
        is24Hour: false,
        onChange: (event, selectedDate) => {
          if (event.type === "set" && selectedDate) setReminderDate(selectedDate);
        }
      });
      return;
    }
    setShowIosTime(true);
  };

  const changeIosTime = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) setReminderDate(selectedDate);
  };

  const deleteRoutine = (routine: RutinaBienestar) => {
    Alert.alert("Eliminar rutina", `¿Deseas eliminar “${routine.actividad}”?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await appApi.deleteRoutine(routine.id);
          setData((current) => current ? { ...current, routines: current.routines.filter((item) => item.id !== routine.id) } : current);
        }
      }
    ]);
  };

  const completeReminder = async (reminder: Recordatorio) => {
    try {
      await cancelCareNotification(reminder.id).catch(() => undefined);
      await appApi.deleteReminder(reminder.id);
      setData((current) => current ? { ...current, reminders: current.reminders.filter((item) => item.id !== reminder.id) } : current);
    } catch (error) {
      Alert.alert("No pudimos completarlo", error instanceof Error ? error.message : "Inténtalo nuevamente.");
    }
  };

  if (!data) return <Screen><LoadingState /></Screen>;

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerMascot}><View style={styles.headerGlow} /><BotAvatar size={82} emotion="celebration" /></View>
        <View style={styles.headerCopy}>
          <View style={styles.headerEyebrow}><Ionicons name="sparkles" color="#BD64FF" size={12} /><AppText style={styles.headerEyebrowText}>TU EQUILIBRIO</AppText></View>
          <AppText style={styles.screenTitle}>Bienestar</AppText>
          <AppText style={styles.screenSubtitle}>Tu mente también merece cuidado.</AppText>
        </View>
      </View>

      <SectionHeader title="Hábitos de hoy" action="Ajustar" onAction={() => { setWaterGoal(String(habits.water.target)); setExerciseGoal(String(habits.exercise.target)); setCalmGoal(String(habits.calm.target)); setLastNightSleep(String(habits.sleep.current)); setDailySetupVisible(true); }} />
      <View style={styles.habitsGrid}>
        {(Object.keys(habitDetails) as HabitKey[]).map((key) => (
          <HabitTile key={key} detail={habitDetails[key]} state={habits[key]} percent={habitPercentages[key]} />
        ))}
      </View>

      <SectionHeader title="Misiones rápidas" />
      <View style={styles.missions}>
        <Mission icon="water" title="Tomar agua" subtitle="Registrar litros" color="#C084FC" onPress={() => openMission({ key: "water", amount: 0.5, title: "Tomar agua", subtitle: "Registra la cantidad real", icon: "water", color: "#C084FC" })} />
        <Mission icon="leaf" title="Tiempo de calma" subtitle="Registrar minutos" color="#A855F7" onPress={() => openMission({ key: "calm", amount: 2, title: "Tiempo de calma", subtitle: "Registra el tiempo real", icon: "leaf", color: "#A855F7" })} />
        <Mission icon="walk" title="Ejercicio" subtitle="Registrar minutos" color="#D8B4FE" onPress={() => openMission({ key: "exercise", amount: 10, title: "Ejercicio", subtitle: "Registra el tiempo real", icon: "walk", color: "#D8B4FE" })} />
      </View>

      <SectionHeader title="Recordatorios" action="+ Programar" onAction={() => setReminderModalVisible(true)} />
      <View style={styles.eyeCareCard}>
        <View style={styles.eyeCareMain}>
          <View style={styles.eyeCareIcon}><Ionicons name="eye-outline" color="#D8B4FE" size={22} /></View>
          <View style={styles.eyeCareCopy}><AppText style={styles.eyeCareLabel}>REGLA 20-20-20</AppText><AppText style={styles.eyeCareTitle}>Cierra los ojos 20 segundos</AppText><AppText style={styles.eyeCareMeta}>Repite este descanso cada 20 minutos.</AppText></View>
          <View style={styles.eyeExerciseCounter}><AppText style={styles.eyeExerciseCount}>{eyeExercisesCompleted}</AppText><AppText style={styles.eyeExerciseCountLabel}>EJERCICIOS</AppText></View>
        </View>
        <Pressable style={({ pressed }) => [styles.eyeCareOpenButton, pressed && styles.pressed]} onPress={() => setEyeCareModalVisible(true)} accessibilityLabel="Abrir controles de ejercicios visuales"><Ionicons name="eye" size={15} color="#E9D5FF" /><AppText style={styles.eyeCareOpenText}>Abrir control visual</AppText><Ionicons name="arrow-forward" size={14} color="#C084FC" /></Pressable>
      </View>
      <Modal visible={eyeCareModalVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setEyeCareModalVisible(false)}>
        <View style={styles.eyeCareModalBackdrop}>
          <View style={styles.eyeCareModal}>
            <View style={styles.eyeCareModalHeader}><View style={styles.eyeCareModalHeading}><View style={styles.eyeCareModalIcon}><Ionicons name="eye-outline" size={22} color="#D8B4FE" /></View><View><AppText style={styles.eyeCareModalTitle}>Descanso visual</AppText><AppText style={styles.eyeCareModalSubtitle}>Ejercicio cada 20 minutos</AppText></View></View><Pressable style={styles.closeButton} onPress={() => setEyeCareModalVisible(false)} accessibilityLabel="Cerrar controles"><Ionicons name="close" size={20} color={colors.text} /></Pressable></View>
          <View style={styles.eyeCareModalCounter}><AppText style={styles.eyeCareModalCounterValue}>{eyeExercisesCompleted}</AppText><AppText style={styles.eyeCareModalCounterLabel}>ejercicios completados hoy</AppText></View>
          <View style={styles.eyeCareControls}>
          <View style={styles.eyeControlColumn}>
            <Pressable style={({ pressed }) => [styles.eyeControl, styles.eyePlay, eyeCareActive && styles.eyeControlActive, pressed && styles.eyeControlPressed]} onPress={startEyeCare} disabled={eyeCareLoading || eyeCareActive} hitSlop={5} accessibilityLabel="Iniciar descansos visuales"><Ionicons name="play" color={eyeCareActive ? "#D8B4FE" : "#FFFFFF"} size={15} /></Pressable>
            <AppText style={styles.eyeControlLabel}>Inicio</AppText><AppText style={styles.eyeControlTime}>{eyeCareStartTime}</AppText>
          </View>
          <View style={styles.eyeControlColumn}>
            <Pressable style={({ pressed }) => [styles.eyeControl, styles.eyeStop, !eyeCareActive && styles.eyeControlDisabled, pressed && styles.eyeControlPressed]} onPress={stopEyeCare} disabled={eyeCareLoading || !eyeCareActive} hitSlop={5} accessibilityLabel="Detener descansos visuales"><Ionicons name="stop" color="#FDA4AF" size={14} /></Pressable>
            <AppText style={styles.eyeControlLabel}>Siguiente</AppText><AppText style={styles.eyeControlTime}>{eyeCareNextTime}</AppText>
          </View>
          <View style={styles.eyeControlColumn}>
            <Pressable style={({ pressed }) => [styles.eyeControl, styles.eyeReset, pressed && styles.eyeControlPressed]} onPress={resetEyeCare} disabled={eyeCareLoading} hitSlop={5} accessibilityLabel="Reiniciar descansos visuales"><Ionicons name="refresh" color="#BAE6FD" size={15} /></Pressable>
            <AppText style={styles.eyeControlLabel}>Reiniciar</AppText><AppText style={styles.eyeControlTime}>Limpiar</AppText>
          </View>
        </View>
          </View>
        </View>
      </Modal>
      <Pressable style={({ pressed }) => [styles.scheduledButton, pressed && styles.pressed]} onPress={() => setShowScheduledReminders(true)} accessibilityLabel="Ver recordatorios agendados">
        <View style={styles.scheduledButtonIcon}><Ionicons name="calendar-outline" size={18} color="#E9D5FF" /></View>
        <View style={styles.scheduledButtonCopy}><AppText style={styles.scheduledButtonText}>Agendados</AppText><AppText style={styles.scheduledButtonMeta}>{wellbeingReminders.length} recordatorios programados</AppText></View>
        <Ionicons name="arrow-forward" size={17} color="#C084FC" />
      </Pressable>

      <Modal visible={showScheduledReminders} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowScheduledReminders(false)}>
        <View style={styles.scheduledModalBackdrop}>
          <View style={styles.scheduledModal}>
            <View style={styles.scheduledModalHeader}>
              <View style={styles.scheduledModalHeading}><View style={styles.scheduledModalIcon}><Ionicons name="calendar" size={21} color="#D8B4FE" /></View><View><AppText style={styles.scheduledModalTitle}>Tus recordatorios</AppText><AppText style={styles.scheduledModalSubtitle}>Todo lo que tienes programado</AppText></View></View>
              <Pressable style={styles.closeButton} onPress={() => setShowScheduledReminders(false)} accessibilityLabel="Cerrar recordatorios"><Ionicons name="close" size={20} color={colors.text} /></Pressable>
            </View>
            <ScrollView style={styles.scheduledModalList} contentContainerStyle={styles.scheduledModalContent} showsVerticalScrollIndicator={false}>
              {wellbeingReminders.length === 0 ? <CompactEmpty icon="calendar-outline" title="Sin recordatorios" text="Programa un cuidado y aparecerá aquí." /> : wellbeingReminders.map((reminder) => <SwipeReminderCard key={reminder.id} reminder={reminder} onComplete={() => completeReminder(reminder)} />)}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Card style={styles.adviceCard} glow>
        <LinearGradient colors={["rgba(168,85,247,0.28)", "rgba(76,29,149,0.08)", "rgba(8,10,22,0.08)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.adviceOrb} />
        <View style={styles.adviceAvatar}>
          <Animated.View style={{ transform: [{ rotate: adviceMascotMotion.interpolate({ inputRange: [-1, 0, 1], outputRange: ["-5deg", "0deg", "5deg"] }) }, { scale: adviceMascotMotion.interpolate({ inputRange: [-1, 0, 1], outputRange: [1, 1, 1.04] }) }] }}><BotAvatar size={72} animated={false} emotion="encourage" /></Animated.View>
          <View pointerEvents="none" style={styles.adviceMascotSparkle}><Ionicons name="sparkles" size={11} color="#F5D0FE" /></View>
        </View>
        <View style={styles.adviceCopy}>
          <Animated.View style={{ opacity: adviceGlow.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }), transform: [{ scale: adviceGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) }] }}>
            <Pressable style={({ pressed }) => [styles.adviceLabelRow, pressed && styles.adviceLabelPressed]} onPress={refreshPersonalizedAdvice} disabled={refreshingAdvice} accessibilityLabel="Generar otro consejo personalizado">
              <Ionicons name={refreshingAdvice ? "hourglass-outline" : "sparkles"} size={13} color="#FFFFFF" /><AppText style={styles.adviceLabel}>{refreshingAdvice ? "CREANDO CONSEJO..." : "CONSEJO PARA TI"}</AppText>
            </Pressable>
          </Animated.View>
          <View style={styles.adviceTextFrame}><AppText style={styles.adviceTitle} numberOfLines={4} adjustsFontSizeToFit minimumFontScale={0.75}>{personalizedAdvice || advice}</AppText></View>
        </View>
      </Card>

      <Modal visible={dailySetupVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
        <KeyboardAvoidingView style={styles.dailySetupBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.dailySetupCard}>
            <View style={styles.dailySetupTop}>
              <BotAvatar size={78} emotion="curious" />
              <View style={styles.dailySetupCopy}><AppText style={styles.dailySetupEyebrow}>PLAN DEL DÍA</AppText><AppText style={styles.dailySetupTitle}>{dailyConfigured ? "Ajusta tus metas" : "¿Qué quieres cumplir hoy?"}</AppText><AppText style={styles.dailySetupText}>Tú decides los límites. CompAI usará estas metas para calcular tu progreso.</AppText></View>
            </View>
            <ScrollView contentContainerStyle={styles.dailySetupFields} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Input label="Meta de agua (litros)" value={waterGoal} onChangeText={setWaterGoal} keyboardType="decimal-pad" placeholder="2" />
              <Input label="Meta de ejercicio (minutos)" value={exerciseGoal} onChangeText={setExerciseGoal} keyboardType="number-pad" placeholder="30" />
              <Input label="Meta de calma (minutos)" value={calmGoal} onChangeText={setCalmGoal} keyboardType="number-pad" placeholder="10" />
              <View style={styles.sleepFieldHeader}><Ionicons name="moon-outline" color="#34D399" size={16} /><View><AppText style={styles.sleepFieldTitle}>Sueño de anoche</AppText><AppText style={styles.sleepFieldHint}>Registra lo que dormiste, no una meta futura.</AppText></View></View>
              <Input label="Horas dormidas" value={lastNightSleep} onChangeText={setLastNightSleep} keyboardType="decimal-pad" placeholder="Ej. 7.5" />
              <Button title={dailyConfigured ? "Guardar ajustes" : "Comenzar mi día"} onPress={saveDailySetup} icon={<Ionicons name="checkmark" size={19} color={colors.ink} />} />
              {dailyConfigured ? <Pressable style={styles.dailySetupCancel} onPress={() => setDailySetupVisible(false)}><AppText style={styles.dailySetupCancelText}>Cancelar</AppText></Pressable> : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={Boolean(pendingMission)} transparent animationType="fade" statusBarTranslucent onRequestClose={closeMission}>
        <KeyboardAvoidingView style={styles.missionModalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMission} />
          <View style={[styles.missionModal, { borderColor: `${pendingMission?.color ?? "#C084FC"}66` }]}>
            <View style={[styles.missionModalGlow, { backgroundColor: `${pendingMission?.color ?? "#C084FC"}18` }]} />
            <View style={styles.missionModalHeader}>
              <View style={styles.missionMascot}><BotAvatar size={72} emotion="question" /></View>
              <View style={styles.missionModalHeaderCopy}><AppText style={styles.missionModalEyebrow}>CONFIRMAR MISIÓN</AppText><AppText style={styles.missionModalTitle}>¿Cuánto realizaste?</AppText><AppText style={styles.missionModalText}>Registra la cantidad real para actualizar tu progreso.</AppText></View>
              <Pressable style={styles.missionModalClose} onPress={closeMission}><Ionicons name="close" color={colors.ink} size={20} /></Pressable>
            </View>
            <View style={[styles.missionModalSummary, { backgroundColor: `${pendingMission?.color ?? "#C084FC"}12` }]}>
              <View style={[styles.missionModalIcon, { backgroundColor: `${pendingMission?.color ?? "#C084FC"}25` }]}><Ionicons name={pendingMission?.icon ?? "sparkles"} color={pendingMission?.color ?? "#C084FC"} size={20} /></View>
              <View><AppText style={styles.missionModalMission}>{pendingMission?.title}</AppText><AppText style={styles.missionModalSubtitle}>{pendingMission?.subtitle}</AppText></View>
            </View>
            <Input label={pendingMission?.key === "water" ? "Litros que tomaste" : "Minutos que realizaste"} value={missionAmount} onChangeText={(value) => { setMissionAmount(value); setMissionError(""); }} keyboardType="decimal-pad" placeholder={pendingMission?.key === "water" ? "Ej. 0.5" : "Ej. 10"} returnKeyType="done" />
            {missionError ? <AppText style={styles.missionError}>{missionError}</AppText> : null}
            <Pressable style={({ pressed }) => [styles.askCompAIButton, pressed && styles.pressed]} onPress={askCompAIForMission} disabled={askingCompAI}>
              <View style={styles.askCompAIIcon}><BotAvatar size={39} emotion={askingCompAI ? "focus" : "curious"} /></View>
              <View style={styles.askCompAICopy}><AppText style={styles.askCompAITitle}>{askingCompAI ? "CompAI está pensando..." : missionAdvice ? "Buscar ideas diferentes" : "No sé qué hacer"}</AppText><AppText style={styles.askCompAIText}>{missionAdvice ? "Vuelve a consultar la IA sin repetir recomendaciones." : "Pregúntale a CompAI por ideas para esta misión."}</AppText></View>
              <Ionicons name="sparkles" color="#C084FC" size={17} />
            </Pressable>
            {missionAdvice ? <ScrollView style={styles.missionAdviceScroll} nestedScrollEnabled><View style={styles.missionAdvice}><View style={styles.missionAdviceHeader}><View style={styles.missionAdviceAvatar}><BotAvatar size={34} emotion="expert" animated={false} /></View><View><AppText style={styles.missionAdviceLabel}>COMPAI</AppText><AppText style={styles.missionAdviceSource}>RESPUESTA GENERADA POR IA</AppText></View></View><AppText style={styles.missionAdviceText}>{missionAdvice}</AppText><View style={styles.missionAdviceActions}><Pressable style={({ pressed }) => [styles.retryAdviceButton, pressed && styles.pressed]} onPress={askCompAIForMission} disabled={askingCompAI}><Ionicons name="refresh" color="#C084FC" size={15} /><AppText style={styles.retryAdviceText}>{askingCompAI ? "Buscando..." : "Otras ideas"}</AppText></Pressable><Pressable style={({ pressed }) => [styles.continueChatButton, pressed && styles.pressed]} onPress={continueMissionInChat}><Ionicons name="chatbubble-ellipses-outline" color="#E9D5FF" size={15} /><AppText style={styles.continueChatText}>Abrir chat</AppText></Pressable></View></View></ScrollView> : null}
            <View style={styles.missionModalActions}>
              <Pressable style={({ pressed }) => [styles.missionCancel, pressed && styles.pressed]} onPress={closeMission}><AppText style={styles.missionCancelText}>Cancelar</AppText></Pressable>
              <Pressable style={({ pressed }) => [styles.missionConfirm, { backgroundColor: pendingMission?.color ?? "#A855F7" }, pressed && styles.pressed]} onPress={confirmMission}><Ionicons name="checkmark" color="#0B1020" size={18} /><AppText style={styles.missionConfirmText}>Guardar progreso</AppText></Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <AssistantChat visible={chatVisible} onClose={() => setChatVisible(false)} userName={session?.user.nombre ?? "Compa"} initialDraft={chatDraft} />

      <FormModal visible={reminderModalVisible} title="Programar un cuidado" icon="notifications-outline" onClose={() => setReminderModalVisible(false)}>
        <View style={styles.formHint}><Ionicons name="time-outline" color="#C084FC" size={17} /><AppText style={styles.formHintText}>Elige algo saludable que quieras recordar después.</AppText></View>
        <Input label="¿Qué quieres recordar?" value={reminderTitle} onChangeText={setReminderTitle} placeholder="Ej. Tomar agua o hacer una pausa" returnKeyType="done" />
        <Pressable style={styles.selector} onPress={openTimePicker}>
          <Ionicons name="time-outline" size={20} color="#C084FC" />
          <View style={styles.selectorCopy}>
            <AppText style={styles.selectorLabel}>Hora</AppText>
            <AppText style={styles.selectorValue}>{reminderDate.toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit" })}</AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
        {showIosTime && Platform.OS === "ios" ? <DateTimePicker value={reminderDate} mode="time" onChange={changeIosTime} themeVariant="dark" /> : null}
        <Button title="Programar cuidado" loading={savingReminder} onPress={createReminder} icon={<Ionicons name="checkmark" size={19} color={colors.ink} />} />
      </FormModal>
    </Screen>
  );
}

function MiniIndicator({ icon, label, value, color }: { icon: IconName; label: string; value: number; color: string }) {
  return <View style={styles.indicator}><Ionicons name={icon} color={color} size={16} /><View><AppText style={styles.indicatorValue}>{value}%</AppText><AppText style={styles.indicatorLabel}>{label}</AppText></View></View>;
}

function QuickStat({ icon, value, label, color }: { icon: IconName; value: number; label: string; color: string }) {
  return <Card style={styles.quickCard}><View style={[styles.quickIcon, { backgroundColor: `${color}20` }]}><Ionicons name={icon} size={20} color={color} /></View><View style={styles.quickCopy}><AppText style={styles.quickValue}>{value}</AppText><AppText style={styles.quickLabel}>{label}</AppText></View><Ionicons name="chevron-forward" size={17} color={colors.muted} /></Card>;
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.sectionHeader}><View style={styles.sectionCopy}><AppText style={styles.sectionTitle}>{title}</AppText></View>{action ? <Pressable style={({ pressed }) => [styles.sectionActionButton, pressed && styles.pressed]} onPress={onAction} disabled={!onAction}><AppText style={styles.sectionAction}>{action}</AppText></Pressable> : null}</View>;
}

function HabitTile({ detail, state, percent }: { detail: typeof habitDetails[HabitKey]; state: HabitState; percent: number }) {
  const current = Number.isInteger(state.current) ? state.current : state.current.toFixed(1);
  const isSleep = detail.icon === "moon-outline";
  return <View style={[styles.habitTile, { borderColor: `${detail.color}4D`, backgroundColor: `${detail.color}14` }]}><View style={styles.habitTileTop}><View style={[styles.habitIcon, { backgroundColor: `${detail.color}29` }]}><Ionicons name={detail.icon} color={detail.color} size={20} /></View><AppText style={[styles.habitPercent, { color: detail.color }]}>{percent}%</AppText></View><AppText style={styles.habitTitle}>{detail.title}</AppText><AppText style={styles.habitValue}>{isSleep ? `${current} h anoche` : `${current} / ${state.target} ${detail.unit}`}</AppText><View style={styles.track}><View style={[styles.trackFill, { width: `${percent}%`, backgroundColor: detail.color }]} /></View></View>;
}

function Mission({ icon, title, subtitle, color, onPress }: { icon: IconName; title: string; subtitle: string; color: string; onPress: () => void }) {
  return <Pressable accessibilityLabel={`${title}, ${subtitle}`} style={({ pressed }) => [styles.mission, { borderColor: `${color}66`, backgroundColor: `${color}18` }, pressed && styles.pressed]} onPress={onPress}><View style={[styles.missionShine, { backgroundColor: `${color}66` }]} /><View style={[styles.missionGlow, { backgroundColor: `${color}18` }]} /><Ionicons name={icon} color={color} size={23} /><View style={[styles.missionAdd, { borderColor: `${color}70`, backgroundColor: "#171329" }]}><Ionicons name="add" size={12} color={color} /></View></Pressable>;
}

function CompactEmpty({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return <View style={styles.empty}><Ionicons name={icon} size={22} color={colors.primary} /><View style={styles.emptyCopy}><AppText style={styles.emptyTitle}>{title}</AppText><AppText style={styles.emptyText}>{text}</AppText></View></View>;
}

function SwipeReminderCard({ reminder, onComplete }: { reminder: Recordatorio; onComplete: () => void }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [deleteRevealed, setDeleteRevealed] = useState(false);
  const [completedByUser, setCompletedByUser] = useState(false);
  const [now, setNow] = useState(Date.now());
  const available = new Date(reminder.fecha_hora).getTime() <= now;
  useEffect(() => {
    if (available) return;
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [available]);
  const markCompleted = () => {
    if (!available) return;
    if (completedByUser) {
      setDeleteRevealed(true);
      return;
    }
    setCompletedByUser(true);
    setDeleteRevealed(true);
    Animated.sequence([
      Animated.timing(translateX, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 9 })
    ]).start();
  };

  const removeReminder = () => {
    setDeleteRevealed(false);
    Animated.sequence([
      Animated.timing(translateX, { toValue: -135, duration: 120, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -430, duration: 260, useNativeDriver: true })
    ]).start(onComplete);
  };

  return <View style={styles.swipeReminder}>
    <Animated.View style={{ transform: [{ translateX }] }}>
      <Pressable onPress={markCompleted} disabled={!available} accessibilityLabel={available ? completedByUser ? "Mostrar opciones del recordatorio cumplido" : "Marcar recordatorio como cumplido" : "Recordatorio todavía no disponible"}>
      <Card style={styles.listCard}>
        <View style={[styles.listIcon, { backgroundColor: completedByUser ? "rgba(52,211,153,0.12)" : "rgba(168,85,247,0.12)" }]}><Ionicons name={completedByUser ? "checkmark-done-outline" : "notifications-outline"} size={22} color={completedByUser ? "#34D399" : "#C084FC"} /></View>
        <View style={styles.listCopy}><AppText style={[styles.listLabel, completedByUser && styles.listLabelReady]}>{completedByUser ? "CUMPLIDO" : "AGENDADO"}</AppText><AppText style={styles.listTitle}>{reminder.titulo}</AppText><AppText style={styles.listMeta}>{formatDate(reminder.fecha_hora)} · {completedByUser ? "Toca para mostrar opciones" : available ? "Toca para marcarlo como cumplido" : "Aún no está disponible para completar"}</AppText></View>
        <Ionicons name={completedByUser ? "checkmark-circle" : available ? "chevron-back" : "lock-closed-outline"} size={17} color={completedByUser ? "#34D399" : available ? "#C084FC" : colors.muted} />
      </Card>
      </Pressable>
    </Animated.View>
    {deleteRevealed ? <View style={styles.completedActions}>
      <Pressable style={({ pressed }) => [styles.completedKeepButton, pressed && styles.pressed]} onPress={() => setDeleteRevealed(false)} accessibilityLabel="Dejar recordatorio cumplido"><Ionicons name="bookmark-outline" size={13} color="#A7F3D0" /><AppText style={styles.completedKeepText}>Dejar</AppText></Pressable>
      <Pressable style={({ pressed }) => [styles.completedDeleteButton, pressed && styles.swipeDeletePressed]} onPress={removeReminder} accessibilityLabel="Eliminar recordatorio cumplido"><Ionicons name="trash-outline" size={13} color="#FDA4AF" /><AppText style={styles.swipeDeleteText}>Eliminar</AppText></Pressable>
    </View> : null}
  </View>;
}

function FormModal({ visible, title, icon, onClose, children }: { visible: boolean; title: string; icon: IconName; onClose: () => void; children: React.ReactNode }) {
  return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}><KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} /><View style={styles.modalCard}><View style={styles.modalHeader}><View style={styles.modalTitleRow}><View style={styles.modalIcon}><Ionicons name={icon} size={21} color="#C084FC" /></View><AppText style={styles.modalTitle}>{title}</AppText></View><Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Cerrar"><Ionicons name="close" size={22} color={colors.ink} /></Pressable></View><View style={styles.modalBody}>{children}</View></View></KeyboardAvoidingView></Modal>;
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 138 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 4, minHeight: 68 },
  headerMascot: { width: 86, height: 88, alignItems: "center", justifyContent: "center" },
  headerGlow: { position: "absolute", width: 66, height: 66, borderRadius: 33, backgroundColor: "rgba(189,100,255,0.12)", borderWidth: 1, borderColor: "rgba(189,100,255,0.2)" },
  headerCopy: { flex: 1, minWidth: 0 },
  headerEyebrow: { flexDirection: "row", alignItems: "center", gap: 5 },
  headerEyebrowText: { color: "#BD64FF", fontSize: 8, lineHeight: 11, fontWeight: "900", letterSpacing: 0.6 },
  screenTitle: { color: colors.ink, fontSize: 29, lineHeight: 34, fontWeight: "900" },
  screenSubtitle: { color: colors.text, fontSize: 12, lineHeight: 16, fontWeight: "700" },
  kidsButton: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(168,85,247,0.1)", borderWidth: 1, borderColor: "rgba(192,132,252,0.22)" },
  heroCard: { padding: 15, marginBottom: 10, borderColor: "rgba(168,85,247,0.3)", backgroundColor: "#19132D" },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  progressRing: { width: 104, height: 104, borderRadius: 52, borderWidth: 8, borderColor: "#A855F7", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(168,85,247,0.08)" },
  progressRingInner: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  progressValue: { color: colors.ink, fontSize: 25, fontWeight: "900" },
  progressCaption: { color: "#C084FC", fontSize: 9, fontWeight: "900", marginTop: -2 },
  heroCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: "#C084FC", fontSize: 10, fontWeight: "900" },
  heroTitle: { color: colors.ink, fontSize: 18, fontWeight: "900", marginTop: 4 },
  heroMessage: { color: colors.text, fontSize: 12, lineHeight: 17, marginTop: 5 },
  indicatorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 14 },
  indicator: { width: "48%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.045)" },
  indicatorValue: { color: colors.ink, fontSize: 12, fontWeight: "900" },
  indicatorLabel: { color: colors.muted, fontSize: 10 },
  quickStats: { flexDirection: "row", gap: 9, marginBottom: 10 },
  quickCard: { flex: 1, padding: 11, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 15 },
  quickIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  quickCopy: { flex: 1, minWidth: 0 },
  quickValue: { color: colors.ink, fontSize: 19, fontWeight: "900" },
  quickLabel: { color: colors.muted, fontSize: 10, lineHeight: 13 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 11, marginBottom: 6 },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { color: colors.ink, fontSize: 14, lineHeight: 18, fontWeight: "900" },
  sectionActionButton: { minHeight: 30, borderRadius: 10, justifyContent: "center", backgroundColor: "rgba(168,85,247,0.1)", borderWidth: 1, borderColor: "rgba(192,132,252,0.2)", paddingHorizontal: 9 },
  sectionAction: { color: "#C084FC", fontSize: 9, fontWeight: "900" },
  habitsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9, justifyContent: "space-between" },
  habitTile: { width: "23%", minHeight: 82, borderRadius: 13, borderWidth: 1, backgroundColor: "#161227", padding: 7 },
  habitTileTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  habitIcon: { width: 25, height: 25, borderRadius: 8, alignItems: "center", justifyContent: "center", transform: [{ scale: 0.82 }] },
  habitTitle: { color: colors.ink, fontSize: 8, lineHeight: 10, fontWeight: "900" },
  habitPercent: { fontSize: 9, fontWeight: "900" },
  habitValue: { color: colors.muted, fontSize: 6, marginTop: 2 },
  track: { height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.08)", marginTop: 6, overflow: "hidden" },
  trackFill: { height: "100%", borderRadius: 3 },
  missions: { flexDirection: "row", gap: 9 },
  mission: { flex: 1, height: 46, borderRadius: 14, borderWidth: 1, overflow: "hidden", alignItems: "center", justifyContent: "center", elevation: 0, shadowOpacity: 0 },
  missionShine: { position: "absolute", height: 1, left: 15, right: 15, top: 0 },
  missionGlow: { position: "absolute", width: 42, height: 42, borderRadius: 21 },
  missionAdd: { position: "absolute", right: 5, bottom: 5, width: 18, height: 18, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  listCard: { padding: 12, flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 16 },
  listIcon: { width: 43, height: 43, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  listCopy: { flex: 1, minWidth: 0 },
  listLabel: { color: "#C084FC", fontSize: 9, fontWeight: "900" },
  listTitle: { color: colors.ink, fontSize: 14, fontWeight: "900", marginTop: 2 },
  listMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  swipeReminder: { marginBottom: 8, borderRadius: 16, overflow: "hidden" },
  completedActions: { marginTop: 5, flexDirection: "row", justifyContent: "flex-end", gap: 6 },
  completedKeepButton: { minHeight: 27, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: "rgba(52,211,153,0.25)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "rgba(5,150,105,0.14)" },
  completedKeepText: { color: "#A7F3D0", fontSize: 8, fontWeight: "900" },
  completedDeleteButton: { minHeight: 27, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: "rgba(251,113,133,0.25)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "rgba(190,18,60,0.18)" },
  swipeDeletePressed: { backgroundColor: "rgba(225,29,72,0.95)", transform: [{ scale: 0.96 }] },
  swipeDeleteText: { color: "#FDA4AF", fontSize: 8, fontWeight: "900" },
  listLabelReady: { color: "#34D399" },
  eyeCareCard: { borderRadius: 15, borderWidth: 1, borderColor: "rgba(192,132,252,0.3)", backgroundColor: "rgba(168,85,247,0.09)", paddingHorizontal: 9, paddingVertical: 8, marginBottom: 8, overflow: "hidden" },
  eyeCareMain: { flexDirection: "row", alignItems: "center", gap: 10 },
  eyeCareIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(168,85,247,0.17)" },
  eyeCareCopy: { flex: 1, minWidth: 0 },
  eyeCareLabel: { color: "#C084FC", fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  eyeCareTitle: { color: colors.ink, fontSize: 11, fontWeight: "900", marginTop: 2 },
  eyeCareMeta: { color: colors.muted, fontSize: 8, marginTop: 3 },
  eyeExerciseCounter: { minWidth: 48, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(192,132,252,0.28)", backgroundColor: "rgba(168,85,247,0.13)" },
  eyeExerciseCount: { color: "#E9D5FF", fontSize: 14, fontWeight: "900" },
  eyeExerciseCountLabel: { color: colors.muted, fontSize: 5, fontWeight: "900", marginTop: 1 },
  eyeCareOpenButton: { minHeight: 32, marginTop: 7, paddingHorizontal: 9, borderRadius: 10, borderWidth: 1, borderColor: "rgba(192,132,252,0.24)", backgroundColor: "rgba(168,85,247,0.1)", flexDirection: "row", alignItems: "center", gap: 7 },
  eyeCareOpenText: { flex: 1, color: "#D8B4FE", fontSize: 9, fontWeight: "900" },
  eyeCareModalBackdrop: { flex: 1, justifyContent: "center", paddingHorizontal: 22, backgroundColor: "rgba(2,4,12,0.9)" },
  eyeCareModal: { width: "100%", maxWidth: 390, alignSelf: "center", borderRadius: 22, borderWidth: 1, borderColor: "rgba(192,132,252,0.4)", backgroundColor: "#171329", padding: 15 },
  eyeCareModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyeCareModalHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  eyeCareModalIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(168,85,247,0.18)" },
  eyeCareModalTitle: { color: colors.ink, fontSize: 16, fontWeight: "900" },
  eyeCareModalSubtitle: { color: colors.muted, fontSize: 9, marginTop: 2 },
  eyeCareModalCounter: { minHeight: 52, marginTop: 13, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(168,85,247,0.1)" },
  eyeCareModalCounterValue: { color: "#E9D5FF", fontSize: 20, fontWeight: "900" },
  eyeCareModalCounterLabel: { color: colors.muted, fontSize: 8, marginTop: 1 },
  eyeExerciseCountdown: { minHeight: 55, marginTop: 12, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: "rgba(52,211,153,0.38)", backgroundColor: "rgba(5,150,105,0.18)", flexDirection: "row", alignItems: "center", gap: 11 },
  eyeExerciseCountdownValue: { width: 38, color: "#D1FAE5", fontSize: 25, fontWeight: "900", textAlign: "center" },
  eyeExerciseCountdownTitle: { color: "#D1FAE5", fontSize: 10, fontWeight: "900" },
  eyeExerciseCountdownText: { color: colors.muted, fontSize: 8, marginTop: 2 },
  eyeExerciseWaiting: { minHeight: 38, marginTop: 12, paddingHorizontal: 10, borderRadius: 11, backgroundColor: "rgba(168,85,247,0.08)", flexDirection: "row", alignItems: "center", gap: 7 },
  eyeExerciseWaitingText: { flex: 1, color: colors.muted, fontSize: 8 },
  eyeCareControls: { flexDirection: "row", justifyContent: "space-around", marginTop: 8, paddingVertical: 7, borderRadius: 11, borderWidth: 1, borderColor: "rgba(192,132,252,0.12)", backgroundColor: "rgba(8,10,22,0.22)" },
  eyeControlColumn: { flex: 1, alignItems: "center" },
  eyeControlLabel: { color: colors.muted, fontSize: 7, fontWeight: "800", marginTop: 5 },
  eyeControlTime: { color: colors.ink, fontSize: 10, fontWeight: "900", marginTop: 2 },
  scheduledButton: { minHeight: 58, paddingHorizontal: 11, borderRadius: 14, borderWidth: 1, borderColor: "rgba(216,180,254,0.5)", backgroundColor: "rgba(168,85,247,0.16)", flexDirection: "row", alignItems: "center", gap: 10 },
  scheduledButtonIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(168,85,247,0.28)" },
  scheduledButtonCopy: { flex: 1 },
  scheduledButtonText: { color: "#D8B4FE", fontSize: 11, fontWeight: "900" },
  scheduledButtonMeta: { color: colors.muted, fontSize: 8, marginTop: 2 },
  scheduledModalBackdrop: { flex: 1, justifyContent: "center", paddingHorizontal: 18, backgroundColor: "rgba(2,4,12,0.9)" },
  scheduledModal: { width: "100%", maxWidth: 420, maxHeight: "78%", alignSelf: "center", borderRadius: 22, borderWidth: 1, borderColor: "rgba(192,132,252,0.38)", backgroundColor: "#171329", padding: 14 },
  scheduledModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 13 },
  scheduledModalHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  scheduledModalIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(168,85,247,0.18)" },
  scheduledModalTitle: { color: colors.ink, fontSize: 16, fontWeight: "900" },
  scheduledModalSubtitle: { color: colors.muted, fontSize: 9, marginTop: 2 },
  scheduledModalList: { width: "100%" },
  scheduledModalContent: { paddingBottom: 4 },
  eyeControl: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  eyePlay: { backgroundColor: "#7C3AED", borderColor: "rgba(216,180,254,0.45)" },
  eyeStop: { backgroundColor: "rgba(190,18,60,0.18)", borderColor: "rgba(251,113,133,0.32)" },
  eyeReset: { backgroundColor: "rgba(14,116,144,0.2)", borderColor: "rgba(125,211,252,0.35)" },
  eyeControlActive: { backgroundColor: "rgba(168,85,247,0.2)" },
  eyeControlPressed: { opacity: 0.72, transform: [{ scale: 0.9 }] },
  eyeControlDisabled: { opacity: 0.35 },
  empty: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.025)" },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: colors.ink, fontSize: 13, fontWeight: "900" },
  emptyText: { color: colors.muted, fontSize: 11, marginTop: 2 },
  adviceCard: { marginTop: 12, minHeight: 105, padding: 11, flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderColor: "rgba(216,180,254,0.42)", borderRadius: 18, overflow: "hidden", backgroundColor: "#171329" },
  adviceOrb: { position: "absolute", width: 125, height: 125, borderRadius: 63, left: -42, top: -34, backgroundColor: "rgba(192,132,252,0.13)" },
  adviceAvatar: { width: 72, height: 78, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "rgba(168,85,247,0.12)", overflow: "hidden" },
  adviceMascotSparkle: { position: "absolute", right: 6, top: 6 },
  adviceCopy: { flex: 1, minWidth: 0 },
  adviceLabelRow: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, minHeight: 27, borderRadius: 9, borderWidth: 1, borderColor: "rgba(233,213,255,0.7)", backgroundColor: "#7C3AED", shadowColor: "#C084FC", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 7 },
  adviceLabelPressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
  adviceLabel: { color: "#FFFFFF", fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  adviceTextFrame: { height: 57, justifyContent: "center", marginTop: 4 },
  adviceTitle: { color: "#FFFFFF", fontSize: 13, lineHeight: 17, fontWeight: "500", letterSpacing: 0.15 },
  missionModalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, backgroundColor: "rgba(2,4,12,0.88)" },
  missionModal: { width: "100%", maxWidth: 390, maxHeight: "92%", borderRadius: 24, borderWidth: 1, alignItems: "center", backgroundColor: "#171329", paddingHorizontal: 18, paddingTop: 10, paddingBottom: 15, overflow: "hidden" },
  missionModalGlow: { position: "absolute", width: 190, height: 190, borderRadius: 95, top: -118 },
  missionModalHeader: { width: "100%", minHeight: 73, flexDirection: "row", alignItems: "center", gap: 7 },
  missionMascot: { width: 68, height: 68, borderRadius: 19, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "rgba(168,85,247,0.1)" },
  missionModalHeaderCopy: { flex: 1, minWidth: 0 },
  missionModalClose: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.055)", alignSelf: "flex-start", marginTop: 5 },
  missionModalEyebrow: { color: "#A78BFA", fontSize: 7, fontWeight: "900", letterSpacing: 1 },
  missionModalTitle: { color: colors.ink, fontSize: 17, lineHeight: 21, fontWeight: "900", marginTop: 3 },
  missionModalText: { color: colors.text, fontSize: 9, lineHeight: 13, marginTop: 3 },
  missionModalSummary: { width: "100%", minHeight: 50, borderRadius: 13, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 10, marginTop: 8 },
  missionModalIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  missionModalMission: { color: colors.ink, fontSize: 12, fontWeight: "900" },
  missionModalSubtitle: { color: colors.muted, fontSize: 9, marginTop: 2 },
  missionError: { alignSelf: "flex-start", color: colors.danger, fontSize: 8, lineHeight: 11, marginTop: -7, marginLeft: 3 },
  askCompAIButton: { width: "100%", minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: "rgba(192,132,252,0.28)", backgroundColor: "rgba(168,85,247,0.08)", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 9, marginTop: 10 },
  askCompAIIcon: { width: 37, height: 37, borderRadius: 11, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "rgba(168,85,247,0.12)" },
  askCompAICopy: { flex: 1, minWidth: 0 },
  askCompAITitle: { color: colors.ink, fontSize: 10, fontWeight: "900" },
  askCompAIText: { color: colors.muted, fontSize: 8, lineHeight: 11, marginTop: 2 },
  missionAdviceScroll: { width: "100%", maxHeight: 165, marginTop: 9 },
  missionAdvice: { borderRadius: 13, borderWidth: 1, borderColor: "rgba(168,85,247,0.18)", backgroundColor: "rgba(8,10,22,0.35)", padding: 10 },
  missionAdviceHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  missionAdviceAvatar: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "rgba(168,85,247,0.12)" },
  missionAdviceLabel: { color: "#C084FC", fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  missionAdviceSource: { color: colors.muted, fontSize: 6, marginTop: 1 },
  missionAdviceText: { color: colors.text, fontSize: 9, lineHeight: 14, marginTop: 7 },
  missionAdviceActions: { flexDirection: "row", gap: 6, marginTop: 9 },
  retryAdviceButton: { flex: 1, minHeight: 36, borderRadius: 10, borderWidth: 1, borderColor: "rgba(192,132,252,0.24)", backgroundColor: "rgba(168,85,247,0.07)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 7 },
  retryAdviceText: { color: "#C084FC", fontSize: 8, fontWeight: "900" },
  continueChatButton: { flex: 1, minHeight: 36, borderRadius: 10, borderWidth: 1, borderColor: "rgba(192,132,252,0.3)", backgroundColor: "rgba(168,85,247,0.14)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 7 },
  continueChatText: { flex: 1, color: "#E9D5FF", fontSize: 8, fontWeight: "900" },
  missionModalActions: { width: "100%", flexDirection: "row", gap: 8, marginTop: 13 },
  missionCancel: { flex: 1, height: 44, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.04)" },
  missionCancelText: { color: colors.text, fontSize: 10, fontWeight: "900" },
  missionConfirm: { flex: 1, height: 44, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  missionConfirmText: { color: "#0B1020", fontSize: 10, fontWeight: "900" },
  dailySetupBackdrop: { flex: 1, justifyContent: "center", paddingHorizontal: 17, paddingVertical: 28, backgroundColor: "rgba(2,4,12,0.9)" },
  dailySetupCard: { width: "100%", maxWidth: 430, maxHeight: "92%", alignSelf: "center", borderRadius: 24, borderWidth: 1, borderColor: "rgba(192,132,252,0.38)", backgroundColor: "#171329", padding: 15 },
  dailySetupTop: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10 },
  dailySetupCopy: { flex: 1, minWidth: 0 },
  dailySetupEyebrow: { color: "#C084FC", fontSize: 7, fontWeight: "900", letterSpacing: 1 },
  dailySetupTitle: { color: colors.ink, fontSize: 18, lineHeight: 22, fontWeight: "900", marginTop: 3 },
  dailySetupText: { color: colors.text, fontSize: 9, lineHeight: 13, marginTop: 3 },
  dailySetupFields: { gap: 11, paddingBottom: 2 },
  sleepFieldHeader: { minHeight: 43, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, backgroundColor: "rgba(52,211,153,0.07)" },
  sleepFieldTitle: { color: colors.ink, fontSize: 10, fontWeight: "900" },
  sleepFieldHint: { color: colors.muted, fontSize: 8, marginTop: 2 },
  dailySetupCancel: { height: 35, alignItems: "center", justifyContent: "center" },
  dailySetupCancelText: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  modalBackdrop: { flex: 1, justifyContent: "center", paddingHorizontal: 18, backgroundColor: "rgba(2,6,23,0.82)" },
  modalCard: { borderRadius: 20, borderWidth: 1, borderColor: "rgba(192,132,252,0.3)", backgroundColor: "#171329", padding: 16, maxHeight: "88%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(168,85,247,0.13)" },
  modalTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  closeButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
  modalBody: { gap: 13 },
  formHint: { minHeight: 44, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, backgroundColor: "rgba(168,85,247,0.075)" },
  formHintText: { flex: 1, color: colors.text, fontSize: 9, lineHeight: 13 },
  selector: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.055)" },
  selectorCopy: { flex: 1 },
  selectorLabel: { color: colors.muted, fontSize: 10 },
  selectorValue: { color: colors.ink, fontSize: 14, fontWeight: "800", marginTop: 2 },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: "800" },
  frequencyRow: { flexDirection: "row", gap: 7 },
  frequencyChip: { flex: 1, minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.035)" },
  frequencyChipActive: { backgroundColor: "rgba(168,85,247,0.16)", borderColor: "#A855F7" },
  frequencyText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  frequencyTextActive: { color: "#D8B4FE" }
});
