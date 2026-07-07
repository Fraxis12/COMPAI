import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, AppState, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { AppText } from "../components/AppText";
import { BotAvatar } from "../components/BotAvatar";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { LoadingState } from "../components/LoadingState";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { EmptyState } from "../components/EmptyState";
import { Curso, Tarea } from "../interfaces/academic.interface";
import { DocumentoAcademico } from "../interfaces/documento-academico.interface";
import { useAuth } from "../hooks/useAuth";
import { appApi } from "../services/api";
import { colors } from "../theme/colors";
import { formatDate } from "../utils/helpers";

const calendarDayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const monthCalendarDays = (month: Date) => {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const mondayOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const gridStart = new Date(year, monthIndex, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return { date, currentMonth: date.getMonth() === monthIndex };
  });
};

const defaultDeadline = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(23, 59, 0, 0);
  return date;
};

const formatDeadline = (date: Date) => {
  return date.toLocaleString("es-PE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const courseTone = {
  main: colors.cyan,
  wash: "rgba(39,183,255,0.13)",
  border: "rgba(39,183,255,0.38)"
};

const cardPalette = [
  { id: "cyan", label: "Cian", main: colors.cyan, wash: "rgba(56,189,248,0.14)", border: "rgba(56,189,248,0.38)", card: "rgba(56,189,248,0.1)" },
  { id: "mint", label: "Menta", main: colors.aqua, wash: "rgba(94,234,212,0.14)", border: "rgba(94,234,212,0.36)", card: "rgba(94,234,212,0.1)" },
  { id: "violet", label: "Violeta", main: colors.primary, wash: "rgba(139,92,246,0.14)", border: "rgba(139,92,246,0.36)", card: "rgba(139,92,246,0.1)" },
  { id: "amber", label: "Ámbar", main: colors.accent, wash: "rgba(251,191,119,0.16)", border: "rgba(251,191,119,0.38)", card: "rgba(251,191,119,0.12)" },
  { id: "rose", label: "Rosa", main: colors.pink, wash: "rgba(244,114,182,0.14)", border: "rgba(244,114,182,0.36)", card: "rgba(244,114,182,0.1)" },
  { id: "green", label: "Verde", main: colors.success, wash: "rgba(52,211,153,0.14)", border: "rgba(52,211,153,0.36)", card: "rgba(52,211,153,0.1)" },
  { id: "blue", label: "Azul", main: colors.info, wash: "rgba(96,165,250,0.14)", border: "rgba(96,165,250,0.36)", card: "rgba(96,165,250,0.1)" },
  { id: "red", label: "Coral", main: colors.danger, wash: "rgba(251,113,133,0.14)", border: "rgba(251,113,133,0.36)", card: "rgba(251,113,133,0.1)" },
  { id: "lime", label: "Lima", main: "#A3E635", wash: "rgba(163,230,53,0.14)", border: "rgba(163,230,53,0.36)", card: "rgba(163,230,53,0.1)" },
  { id: "orange", label: "Naranja", main: "#FB923C", wash: "rgba(251,146,60,0.15)", border: "rgba(251,146,60,0.38)", card: "rgba(251,146,60,0.11)" },
  { id: "fuchsia", label: "Fucsia", main: "#E879F9", wash: "rgba(232,121,249,0.14)", border: "rgba(232,121,249,0.36)", card: "rgba(232,121,249,0.1)" },
  { id: "slate", label: "Humo", main: "#94A3B8", wash: "rgba(148,163,184,0.14)", border: "rgba(148,163,184,0.36)", card: "rgba(148,163,184,0.1)" }
] as const;

type CardTone = {
  id: string;
  label?: string;
  main: string;
  wash: string;
  border: string;
  card: string;
};

const taskTones = {
  pending: {
    id: "task-pending",
    label: "Pendiente",
    main: colors.cyan,
    wash: "rgba(39,183,255,0.11)",
    border: "rgba(39,183,255,0.34)",
    card: "rgba(39,183,255,0.075)"
  },
  completed: {
    id: "task-completed",
    label: "Completada",
    main: colors.success,
    wash: "rgba(36,229,164,0.12)",
    border: "rgba(36,229,164,0.42)",
    card: "rgba(36,229,164,0.12)"
  }
};

const focusInvitations = [
  "Elige una tarea y empezamos.",
  "Una tarea. Un bloque. Sin excusas.",
  "Compa está listo. ¿Tú también?"
];

const focusChallenges = [
  "Dale play. El primer minuto es el más difícil.",
  "Cero distracciones. Tú puedes con esto.",
  "Termínala y deja que el progreso hable."
];

const normalizeHexColor = (value: string) => {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#[0-9A-Fa-f]{6}$/.test(withHash) ? withHash.toUpperCase() : null;
};

const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
};

const rgbaFromHex = (hex: string, alpha: number) => {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
};

const customToneFromHex = (hex: string): CardTone => ({
  id: hex,
  label: "Personalizado",
  main: hex,
  wash: rgbaFromHex(hex, 0.16),
  border: rgbaFromHex(hex, 0.4),
  card: rgbaFromHex(hex, 0.11)
});

const getCardTone = (toneId: string | undefined, fallback: CardTone): CardTone => {
  const customHex = toneId ? normalizeHexColor(toneId) : null;
  if (customHex) return customToneFromHex(customHex);
  return cardPalette.find((tone) => tone.id === toneId) ?? fallback;
};

export function AcademicScreen() {
  const { session } = useAuth();
  const [data, setData] = useState<{ courses: Curso[]; tasks: Tarea[] } | null>(null);
  const [courseName, setCourseName] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDeadline, setTaskDeadline] = useState(defaultDeadline);
  const [taskEstimate, setTaskEstimate] = useState("25");
  const [taskFormError, setTaskFormError] = useState("");
  const [iosPickerMode, setIosPickerMode] = useState<"date" | "time" | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [courseFormVisible, setCourseFormVisible] = useState(false);
  const [taskFormVisible, setTaskFormVisible] = useState(false);
  const [coursePanelVisible, setCoursePanelVisible] = useState(false);
  const [taskPanelVisible, setTaskPanelVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [courseColorIds, setCourseColorIds] = useState<Record<number, string>>({});
  const [coursePaletteId, setCoursePaletteId] = useState<number | null>(null);
  const [customCourseColor, setCustomCourseColor] = useState("");
  const [savingCourse, setSavingCourse] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [documentos, setDocumentos] = useState<DocumentoAcademico[]>([]);
  const [subiendoDocumento, setSubiendoDocumento] = useState(false);
  const [documentoError, setDocumentoError] = useState("");
  const [explicandoTareaId, setExplicandoTareaId] = useState<number | null>(null);
  const [explicacionTarea, setExplicacionTarea] = useState("");
  const [explicarTareaError, setExplicarTareaError] = useState("");
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [focusModeVisible, setFocusModeVisible] = useState(false);
  const [focusWarning, setFocusWarning] = useState("");
  const [focusChallengeIndex, setFocusChallengeIndex] = useState(0);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const focusChallengeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    appApi.getAcademic(session?.user.id).then((nextData) => {
      setData(nextData);
      setSelectedCourseId(nextData.courses[0]?.id ?? null);
    });
    appApi.getDocumentosAcademicos().then(setDocumentos).catch(() => setDocumentos([]));
  }, [session?.user.id]);

  const subirDocumentoAcademico = async () => {
    if (subiendoDocumento) return;
    const seleccion = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "text/plain"],
      copyToCacheDirectory: true
    });
    if (seleccion.canceled || !seleccion.assets?.[0]) return;

    const archivo = seleccion.assets[0];
    setSubiendoDocumento(true);
    setDocumentoError("");
    try {
      const documento = await appApi.subirDocumentoAcademico({
        uri: archivo.uri,
        name: archivo.name,
        mimeType: archivo.mimeType || "application/octet-stream"
      });
      setDocumentos((current) => [documento, ...current]);
      if (documento.estado === "procesado") {
        const nextData = await appApi.getAcademic(session?.user.id);
        setData(nextData);
      }
    } catch (error) {
      setDocumentoError(error instanceof Error ? error.message : "No pudimos subir el documento.");
    } finally {
      setSubiendoDocumento(false);
    }
  };

  const explicarTareaConIA = async (tareaId: number) => {
    setExplicandoTareaId(tareaId);
    setExplicacionTarea("");
    setExplicarTareaError("");
    try {
      const resultado = await appApi.explicarTarea(tareaId);
      setExplicacionTarea(resultado.explicacion);
    } catch (error) {
      setExplicarTareaError(error instanceof Error ? error.message : "No pudimos explicar esta tarea.");
    }
  };

  useEffect(() => {
    if (!pomodoroRunning) return;
    const timer = setInterval(() => {
      setPomodoroSeconds((seconds) => {
        if (seconds <= 1) {
          setPomodoroRunning(false);
          if (selectedTaskId) {
            setShowCompletionPrompt(true);
          }
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pomodoroRunning, selectedTaskId]);

  useEffect(() => {
    if (!focusModeVisible) return;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && pomodoroRunning) {
        setFocusWarning("Tu sesión de concentración sigue activa.");
      }
    });

    return () => subscription.remove();
  }, [focusModeVisible, pomodoroRunning]);

  useEffect(() => {
    if (!focusModeVisible) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [focusModeVisible, pulseAnim]);

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(focusChallengeAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true
      }).start(() => {
        setFocusChallengeIndex((current) => current + 1);
        focusChallengeAnim.setValue(0);
        Animated.timing(focusChallengeAnim, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }).start();
      });
    }, 3600);

    return () => clearInterval(timer);
  }, [focusChallengeAnim]);

  const pomodoroLabel = useMemo(() => {
    const minutes = Math.floor(pomodoroSeconds / 60).toString().padStart(2, "0");
    const seconds = (pomodoroSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [pomodoroSeconds]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.08]
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.85]
  });

  const createCourse = async () => {
    if (!session?.user.id || !courseName.trim()) return;
    setSavingCourse(true);
    try {
      const course = await appApi.createCourse({
        nombre: courseName.trim(),
        descripcion: courseDescription.trim() || null,
        usuario_id: session.user.id
      });
      setData((current) => current ? { ...current, courses: [...current.courses, course] } : current);
      setSelectedCourseId(course.id);
      setCourseName("");
      setCourseDescription("");
      setCourseFormVisible(false);
    } finally {
      setSavingCourse(false);
    }
  };

  const closeCourseForm = () => {
    setCourseFormVisible(false);
  };

  const closeTaskForm = () => {
    setTaskFormVisible(false);
    setIosPickerMode(null);
  };

  const createTask = async () => {
    if (!session?.user.id || !taskTitle.trim()) return;
    const estimate = Math.floor(Number(taskEstimate) || 0);
    if (estimate < 1) {
      setTaskFormError("Los minutos estimados deben ser mínimo 1.");
      return;
    }

    setTaskFormError("");
    setSavingTask(true);
    try {
      const task = await appApi.createTask({
        titulo: taskTitle.trim(),
        descripcion: taskDescription.trim() || null,
        fecha_limite: taskDeadline.toISOString(),
        estimacion_minutos: estimate,
        curso_id: selectedCourseId,
        estado: "pendiente",
        prioridad: "media",
        usuario_id: session.user.id
      });
      setData((current) => current ? { ...current, tasks: [task, ...current.tasks] } : current);
      setSelectedTaskId(task.id);
      setPomodoroSeconds((task.estimacion_minutos || 25) * 60);
      setTaskTitle("");
      setTaskDescription("");
      setTaskDeadline(defaultDeadline());
      setTaskEstimate("25");
      setTaskFormVisible(false);
      setIosPickerMode(null);
    } finally {
      setSavingTask(false);
    }
  };

  const changeDeadline = (mode: "date" | "time", event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed" || !date) {
      setIosPickerMode(null);
      return;
    }

    setTaskDeadline((current) => {
      const next = new Date(current);
      if (mode === "date") {
        next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      } else {
        next.setHours(date.getHours(), date.getMinutes(), 0, 0);
      }
      return next;
    });

    if (Platform.OS !== "ios") {
      setIosPickerMode(null);
    }
  };

  const openDeadlinePicker = (mode: "date" | "time") => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: taskDeadline,
        mode,
        display: mode === "date" ? "calendar" : "clock",
        minimumDate: mode === "date" ? new Date() : undefined,
        is24Hour: true,
        onChange: (event, date) => changeDeadline(mode, event, date)
      });
      return;
    }

    setIosPickerMode(mode);
  };

  const updateEstimate = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, "");
    setTaskEstimate(sanitized);
    setTaskFormError("");
  };

  const normalizeEstimate = () => {
    const estimate = Math.max(1, Math.floor(Number(taskEstimate) || 1));
    setTaskEstimate(String(estimate));
  };

  const selectTask = (task: Tarea) => {
    if (task.estado === "completada") return;
    setSelectedTaskId(task.id);
    setPomodoroRunning(false);
    setShowCompletionPrompt(false);
    setPomodoroSeconds((task.estimacion_minutos || 25) * 60);
  };

  const startFocusMode = () => {
    if (!selectedTask) return;
    setFocusWarning("");
    setShowCompletionPrompt(false);
    setFocusModeVisible(true);
    setPomodoroRunning(true);
  };

  const pauseFocusMode = () => {
    setPomodoroRunning(false);
  };

  const resumeFocusMode = () => {
    if (!selectedTask || showCompletionPrompt) return;
    setFocusWarning("");
    setPomodoroRunning(true);
  };

  const cancelFocusMode = () => {
    setPomodoroRunning(false);
    setShowCompletionPrompt(false);
    setFocusModeVisible(false);
    setFocusWarning("");
    setPomodoroSeconds((selectedTask?.estimacion_minutos || 1) * 60);
  };

  const completeSelectedTask = async () => {
    const selected = data?.tasks.find((task) => task.id === selectedTaskId);
    if (!selected) return;
    const updated = await appApi.updateTask(selected.id, { estado: "completada" });
    setData((current) => current ? {
      ...current,
      tasks: current.tasks.map((item) => item.id === updated.id ? updated : item)
    } : current);
    setShowCompletionPrompt(false);
    setSelectedTaskId(null);
    setPomodoroRunning(false);
    setFocusModeVisible(false);
    setFocusWarning("");
    setPomodoroSeconds(60);
  };

  const deleteTask = async (taskId: number) => {
    await appApi.deleteTask(taskId);
    setData((current) => current ? {
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId)
    } : current);
    setSelectedTaskId((current) => current === taskId ? null : current);
    setShowCompletionPrompt(false);
    setFocusModeVisible(false);
    setPomodoroRunning(false);
  };

  const deleteCourse = async (courseId: number) => {
    await appApi.deleteCourse(courseId);
    setData((current) => current ? {
      courses: current.courses.filter((course) => course.id !== courseId),
      tasks: current.tasks.map((task) => task.curso_id === courseId ? { ...task, curso_id: null } : task)
    } : current);
    setSelectedCourseId((current) => current === courseId ? null : current);
  };

  const confirmDeleteCourse = (course: Curso) => {
    Alert.alert(
      "Eliminar curso",
      `¿Quieres eliminar "${course.nombre}"? Las tareas asociadas no se borrarán, pero quedarán como "Sin curso".`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => deleteCourse(course.id)
        }
      ]
    );
  };

  if (!data) return <Screen><LoadingState /></Screen>;

  const selectedTask = data.tasks.find((task) => task.id === selectedTaskId) ?? null;
  const selectedTaskCourse = selectedTask?.curso_id
    ? data.courses.find((course) => course.id === selectedTask.curso_id) ?? null
    : null;
  const courseForPalette = data.courses.find((course) => course.id === coursePaletteId) ?? null;
  const pendingTasks = data.tasks.filter((task) => task.estado === "pendiente");
  const completedTasks = data.tasks.filter((task) => task.estado === "completada");
  const totalFocusMinutes = pendingTasks.reduce((total, task) => total + (task.estimacion_minutos || 0), 0);
  const studyActivityDays = new Set(completedTasks.map((task) => task.completada_en ?? task.fecha_limite).filter(Boolean).map((date) => calendarDayKey(new Date(date!))));
  const taskDeadlineDays = new Set(pendingTasks.map((task) => task.fecha_limite).filter(Boolean).map((date) => calendarDayKey(new Date(date!))));
  const calendarDays = monthCalendarDays(visibleMonth);
  const todayKey = calendarDayKey(new Date());
  const monthLabel = visibleMonth.toLocaleDateString("es-PE", { month: "long", year: "numeric" });
  const focusMessages = selectedTask ? focusChallenges : focusInvitations;
  const focusChallenge = focusMessages[focusChallengeIndex % focusMessages.length];
  const selectedTaskDuration = Math.max(1, selectedTask?.estimacion_minutos || 1) * 60;
  const pomodoroProgress = selectedTaskDuration > 0
    ? Math.min(1, Math.max(0, 1 - pomodoroSeconds / selectedTaskDuration))
    : 0;

  return (
    <Screen>
      <View style={styles.academicHeading}>
        <View style={styles.headingMascot}>
          <View style={styles.headingMascotGlow} />
          <BotAvatar size={82} emotion="study" />
        </View>
        <View style={styles.academicHeadingCopy}>
          <View style={styles.academicEyebrowRow}>
            <Ionicons name="sparkles" color="#BD64FF" size={13} />
            <AppText style={styles.academicEyebrow}>MODO APRENDIZAJE</AppText>
          </View>
          <AppText style={styles.academicTitle}>Estudio</AppText>
          <AppText style={styles.academicSubtitle}>Organiza, enfócate y avanza a tu ritmo.</AppText>
        </View>
        <View style={styles.academicStatus}>
          <View style={styles.academicStatusDot} />
          <AppText style={styles.academicStatusText}>Hoy</AppText>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryTile, styles.summaryPending]}>
          <View style={[styles.summaryIcon, { backgroundColor: "rgba(56,189,248,0.14)" }]}>
            <Ionicons name="hourglass-outline" color={colors.cyan} size={18} />
          </View>
          <View style={styles.summaryCopy}>
            <AppText style={[styles.summaryValue, { color: colors.cyan }]}>{pendingTasks.length}</AppText>
            <AppText style={styles.summaryLabel}>Pendientes</AppText>
          </View>
          <View style={[styles.summaryAccent, { backgroundColor: colors.cyan }]} />
        </View>
        <View style={[styles.summaryTile, styles.summaryCompleted]}>
          <View style={[styles.summaryIcon, { backgroundColor: "rgba(52,211,153,0.14)" }]}>
            <Ionicons name="checkmark-done-outline" color={colors.success} size={18} />
          </View>
          <View style={styles.summaryCopy}>
            <AppText style={[styles.summaryValue, { color: colors.success }]}>{completedTasks.length}</AppText>
            <AppText style={styles.summaryLabel}>Completadas</AppText>
          </View>
          <View style={[styles.summaryAccent, { backgroundColor: colors.success }]} />
        </View>
        <View style={[styles.summaryTile, styles.summaryFocus]}>
          <View style={[styles.summaryIcon, { backgroundColor: "rgba(251,191,119,0.14)" }]}>
            <Ionicons name="timer-outline" color={colors.accent} size={18} />
          </View>
          <View style={styles.summaryCopy}>
            <AppText style={[styles.summaryValue, { color: colors.accent }]}>{totalFocusMinutes}</AppText>
            <AppText style={styles.summaryLabel}>Min enfoque</AppText>
          </View>
          <View style={[styles.summaryAccent, { backgroundColor: colors.accent }]} />
        </View>
      </View>

      <Pressable style={styles.calendarLauncher} onPress={() => setCalendarVisible(true)}>
        <View style={styles.calendarLauncherIcon}>
          <Ionicons name="calendar-outline" color={colors.ink} size={21} />
        </View>
        <View style={styles.calendarLauncherCopy}>
          <AppText style={styles.calendarLauncherTitle}>Calendario</AppText>
          <AppText style={styles.calendarLauncherText}>{studyActivityDays.size} días con actividad de estudio</AppText>
        </View>
        <View style={styles.calendarLauncherAction}>
          <AppText style={styles.calendarLauncherMonth}>{new Date().toLocaleDateString("es-PE", { month: "short" })}</AppText>
          <Ionicons name="chevron-forward" color={colors.primary} size={18} />
        </View>
      </Pressable>

      <Modal visible={calendarVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setCalendarVisible(false)}>
        <View style={styles.calendarBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCalendarVisible(false)} />
          <View style={styles.calendarPanel}>
            <View style={styles.calendarHeader}>
              <View>
                <AppText style={styles.calendarEyebrow}>TU CONSTANCIA</AppText>
                <AppText style={styles.calendarTitle}>Calendario de estudio</AppText>
              </View>
              <Pressable style={styles.libraryClose} onPress={() => setCalendarVisible(false)} accessibilityLabel="Cerrar calendario">
                <Ionicons name="close" color={colors.ink} size={22} />
              </Pressable>
            </View>
            <View style={styles.monthNavigation}>
              <Pressable style={styles.monthButton} onPress={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} accessibilityLabel="Mes anterior">
                <Ionicons name="chevron-back" color={colors.ink} size={20} />
              </Pressable>
              <AppText style={styles.monthTitle}>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</AppText>
              <Pressable style={styles.monthButton} onPress={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} accessibilityLabel="Mes siguiente">
                <Ionicons name="chevron-forward" color={colors.ink} size={20} />
              </Pressable>
            </View>
            <View style={styles.weekHeader}>
              {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => <AppText key={`${label}-${index}`} style={styles.weekLabel}>{label}</AppText>)}
            </View>
            <View style={styles.calendarGrid}>
              {calendarDays.map(({ date, currentMonth }) => {
                const key = calendarDayKey(date);
                const hasActivity = studyActivityDays.has(key);
                const hasDeadline = taskDeadlineDays.has(key);
                const isToday = key === todayKey;
                return (
                  <View key={key} style={[styles.calendarDay, hasActivity && styles.calendarDayActive, isToday && styles.calendarDayToday]}>
                    <AppText style={[styles.calendarDayText, !currentMonth && styles.calendarDayMuted, hasActivity && styles.calendarDayTextActive]}>{date.getDate()}</AppText>
                    {hasDeadline && !hasActivity ? <View style={styles.calendarDeadlineDot} /> : null}
                    {hasActivity ? <Ionicons name="checkmark" color={colors.ink} size={10} /> : null}
                  </View>
                );
              })}
            </View>
            <View style={styles.calendarLegend}>
              <View style={styles.legendItem}><View style={styles.legendActivity} /><AppText style={styles.legendText}>Actividad completada</AppText></View>
              <View style={styles.legendItem}><View style={styles.legendDeadline} /><AppText style={styles.legendText}>Tarea programada</AppText></View>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.documentUploadCard}>
        <View style={styles.documentUploadIcon}>
          <Ionicons name="document-attach-outline" color="#C084FC" size={20} />
        </View>
        <View style={styles.documentUploadCopy}>
          <AppText style={styles.documentUploadTitle}>Sube tus documentos</AppText>
          <AppText style={styles.documentUploadText} numberOfLines={2}>CompAI lee tu sílabo (PDF o .txt) y crea tus cursos y tareas solo.</AppText>
          {!!documentoError && <AppText style={styles.documentUploadError} numberOfLines={2}>{documentoError}</AppText>}
        </View>
        <Pressable style={styles.documentUploadButton} disabled={subiendoDocumento} onPress={subirDocumentoAcademico} accessibilityLabel="Subir documento académico">
          <Ionicons name={subiendoDocumento ? "hourglass-outline" : "add"} color="#FFFFFF" size={20} />
        </Pressable>
      </View>
      {documentos.length > 0 && (
        <View style={styles.documentList}>
          {documentos.slice(0, 3).map((documento) => (
            <View key={documento.id} style={styles.documentRow}>
              <Ionicons
                name={documento.estado === "procesado" ? "checkmark-circle" : documento.estado === "error" ? "alert-circle" : "hourglass-outline"}
                color={documento.estado === "procesado" ? "#34D399" : documento.estado === "error" ? "#FB7185" : "#A78BFA"}
                size={14}
              />
              <AppText style={styles.documentRowText} numberOfLines={1}>{documento.nombre_archivo}</AppText>
              <AppText style={styles.documentRowMeta}>
                {documento.estado === "procesado" ? `${documento.cursos_creados} curso(s)` : documento.estado === "error" ? "Error" : "Procesando"}
              </AppText>
            </View>
          ))}
        </View>
      )}

      <SectionTitle title="Organización" action="gestionar" actionColor="#BD64FF" />
      <View style={styles.libraryGrid}>
        <Pressable style={[styles.libraryLauncher, styles.courseLauncher]} onPress={() => setCoursePanelVisible(true)}>
          <View style={[styles.libraryIcon, styles.courseLibraryIcon]}>
            <Ionicons name="library-outline" color={colors.background} size={20} />
          </View>
          <View style={styles.libraryCopy}>
            <AppText style={styles.libraryCount}>{data.courses.length}</AppText>
            <AppText style={styles.libraryTitle}>Cursos</AppText>
            <AppText style={styles.libraryMeta} numberOfLines={1}>{data.courses.find((course) => course.id === selectedCourseId)?.nombre ?? "Sin curso activo"}</AppText>
          </View>
          <Ionicons name="chevron-forward" color="#BD64FF" size={19} />
        </Pressable>
        <Pressable style={[styles.libraryLauncher, styles.taskLauncher]} onPress={() => setTaskPanelVisible(true)}>
          <View style={[styles.libraryIcon, styles.taskLibraryIcon]}>
            <Ionicons name="checkbox-outline" color={colors.ink} size={20} />
          </View>
          <View style={styles.libraryCopy}>
            <AppText style={styles.libraryCount}>{pendingTasks.length}</AppText>
            <AppText style={styles.libraryTitle}>Tareas</AppText>
            <AppText style={styles.libraryMeta} numberOfLines={1}>{selectedTask?.titulo ?? "Ninguna seleccionada"}</AppText>
          </View>
          <Ionicons name="chevron-forward" color={colors.primary} size={19} />
        </Pressable>
      </View>

      <Modal visible={coursePanelVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setCoursePanelVisible(false)}>
        <View style={styles.libraryBackdrop}>
          <View style={styles.libraryPanel}>
            <View style={styles.libraryHandle} />
            <View style={styles.libraryPanelHeader}>
              <View style={styles.libraryPanelIdentity}>
                <View style={[styles.libraryIcon, styles.courseLibraryIcon]}><Ionicons name="library-outline" color={colors.background} size={20} /></View>
                <View><AppText style={styles.libraryPanelTitle}>Tus cursos</AppText><AppText style={styles.libraryPanelSubtitle}>{data.courses.length} registrados</AppText></View>
              </View>
              <Pressable style={styles.libraryClose} onPress={() => setCoursePanelVisible(false)} accessibilityLabel="Cerrar cursos"><Ionicons name="close" color={colors.ink} size={22} /></Pressable>
            </View>
            <Pressable style={styles.panelCreateButton} onPress={() => { setCoursePanelVisible(false); setCourseFormVisible(true); }}>
              <Ionicons name="add" color={colors.background} size={19} />
              <AppText style={styles.panelCreateText}>Nuevo curso</AppText>
            </Pressable>
            <ScrollView contentContainerStyle={styles.libraryPanelContent} showsVerticalScrollIndicator={false}>

      {data.courses.length === 0 ? (
        <EmptyState
          icon="school-outline"
          title="Registra tus cursos"
          message="Primero agrega los cursos que llevas; luego podrás asociar tus tareas a cada uno."
        />
      ) : (
        <View style={styles.courseCards}>
          {data.courses.map((course) => {
            const active = selectedCourseId === course.id;
            const selectedToneId = courseColorIds[course.id];
            const tone = getCardTone(selectedToneId, cardPalette[0]);
            const courseTasks = data.tasks.filter((task) => task.curso_id === course.id);
            const courseDone = courseTasks.filter((task) => task.estado === "completada").length;
            const courseProgress = courseTasks.length ? Math.round((courseDone / courseTasks.length) * 100) : 0;
            return (
              <Pressable
                key={course.id}
                style={[
                  styles.courseCard,
                  { borderColor: tone.border, backgroundColor: tone.card },
                  active && { borderColor: tone.main, backgroundColor: tone.wash }
                ]}
                onPress={() => setSelectedCourseId(course.id)}
              >
                <View style={[styles.courseColorWash, { backgroundColor: tone.wash }]} />
                <View style={[styles.courseAccent, { backgroundColor: tone.main }]} />
                <View style={[styles.courseAvatar, { backgroundColor: tone.wash, borderColor: tone.border }, active && { backgroundColor: tone.main, borderColor: tone.main }]}> 
                  <Ionicons name="book-outline" color={active ? colors.background : tone.main} size={19} />
                </View>
                <View style={styles.courseMain}>
                  <View style={styles.courseTitleRow}>
                    <AppText style={styles.courseCardTitle} numberOfLines={1}>{course.nombre}</AppText>
                    {active ? (
                      <View style={[styles.courseActivePill, { backgroundColor: tone.main }]}>
                        <Ionicons name="checkmark" color={colors.background} size={11} />
                        <AppText style={styles.courseActiveText}>Activo</AppText>
                      </View>
                    ) : null}
                  </View>
                  <AppText style={styles.courseCardDescription} numberOfLines={1}>{course.descripcion || "Sin descripción"}</AppText>
                  <View style={styles.courseCardFooter}>
                    <AppText style={styles.courseCardMeta}>{courseTasks.length} tareas · {courseDone} listas</AppText>
                    <AppText style={[styles.courseCardMeta, { color: tone.main }]}>{courseProgress}%</AppText>
                  </View>
                  <View style={styles.courseProgressTrack}>
                    <View style={[styles.courseProgressFill, { width: `${courseProgress}%`, backgroundColor: tone.main }]} />
                  </View>
                </View>
                <View style={styles.courseActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Elegir color del curso"
                    hitSlop={7}
                    style={[styles.courseActionButton, { borderColor: tone.border, backgroundColor: tone.wash }]}
                    onPress={(event) => {
                      event.stopPropagation();
                      setCoursePaletteId(course.id);
                    }}
                  >
                    <Ionicons name="color-palette-outline" color={tone.main} size={15} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Eliminar curso"
                    hitSlop={7}
                    style={styles.courseActionButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      confirmDeleteCourse(course);
                    }}
                  >
                    <Ionicons name="trash-outline" color={colors.danger} size={15} />
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={taskPanelVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setTaskPanelVisible(false)}>
        <View style={styles.libraryBackdrop}>
          <View style={[styles.libraryPanel, styles.taskPanel]}>
            <View style={styles.libraryHandle} />
            <View style={styles.libraryPanelHeader}>
              <View style={styles.libraryPanelIdentity}>
                <View style={[styles.libraryIcon, styles.taskLibraryIcon]}><Ionicons name="checkbox-outline" color={colors.ink} size={20} /></View>
                <View><AppText style={styles.libraryPanelTitle}>Tus tareas</AppText><AppText style={styles.libraryPanelSubtitle}>{pendingTasks.length} pendientes · {completedTasks.length} listas</AppText></View>
              </View>
              <Pressable style={styles.libraryClose} onPress={() => setTaskPanelVisible(false)} accessibilityLabel="Cerrar tareas"><Ionicons name="close" color={colors.ink} size={22} /></Pressable>
            </View>
            <Pressable style={[styles.panelCreateButton, styles.panelCreateTask]} onPress={() => { setTaskPanelVisible(false); setTaskFormVisible(true); }}>
              <Ionicons name="add" color={colors.ink} size={19} />
              <AppText style={[styles.panelCreateText, styles.panelCreateTaskText]}>Nueva tarea</AppText>
            </Pressable>
            <View style={styles.taskPanelStats}>
              <View style={[styles.taskPanelStat, styles.taskPanelPending]}>
                <View style={[styles.taskPanelDot, { backgroundColor: colors.cyan }]} />
                <AppText style={styles.taskPanelStatValue}>{pendingTasks.length}</AppText>
                <AppText style={styles.taskPanelStatLabel}>Pendientes</AppText>
              </View>
              <View style={[styles.taskPanelStat, styles.taskPanelCompleted]}>
                <Ionicons name="checkmark-circle" color={colors.success} size={15} />
                <AppText style={styles.taskPanelStatValue}>{completedTasks.length}</AppText>
                <AppText style={styles.taskPanelStatLabel}>Completadas</AppText>
              </View>
            </View>
            <ScrollView contentContainerStyle={styles.libraryPanelContent} showsVerticalScrollIndicator={false}>

      {data.tasks.length === 0 ? (
        <EmptyState
          icon="clipboard-outline"
          title="Sin tareas todavía"
          message="Cuando registres tus primeras tareas, aparecerán aquí ordenadas para tu día."
        />
      ) : null}

      {data.tasks.map((task) => {
        const baseTone = task.estado === "completada" ? taskTones.completed : taskTones.pending;
        const courseToneId = task.curso_id ? courseColorIds[task.curso_id] : undefined;
        const tone = getCardTone(courseToneId, baseTone);
        const selected = selectedTaskId === task.id;
        return (
          <Pressable key={task.id} onPress={() => { selectTask(task); if (task.estado !== "completada") setTaskPanelVisible(false); }}>
            <View style={[
              styles.taskCard,
              { borderColor: tone.border, backgroundColor: tone.card },
              selected && { borderColor: tone.main, backgroundColor: tone.wash },
              task.estado === "completada" && !courseToneId && styles.taskDoneCard
            ]}>
              <View style={[styles.taskColorWash, { backgroundColor: tone.wash }]} />
              <View style={[styles.taskAccent, { backgroundColor: tone.main }]} />
              <View style={styles.taskRow}>
                <View style={[styles.check, { borderColor: tone.main }, selected && styles.checkSelected, task.estado === "completada" && styles.checkDone]}>
                  {task.estado === "completada" || selected ? <Ionicons name="checkmark" color={task.estado === "completada" ? colors.background : "#FFFFFF"} size={14} /> : null}
                </View>
                <View style={styles.taskCopy}>
                  <View style={styles.taskHeaderLine}>
                    <AppText style={styles.title}>{task.titulo}</AppText>
                    <View style={[styles.taskStatusPill, { borderColor: tone.border, backgroundColor: tone.wash }, task.estado === "completada" && styles.taskStatusDone]}>
                      <AppText style={[styles.taskStatusText, { color: tone.main }, task.estado === "completada" && styles.taskStatusDoneText]}>
                        {task.estado === "completada" ? "Lista" : selected ? "En enfoque" : "Pendiente"}
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.taskMeta}>
                    <View style={[styles.coursePill, { borderColor: tone.border, backgroundColor: tone.wash }]}>
                      <Ionicons name="book-outline" color={tone.main} size={12} />
                      <AppText style={[styles.coursePillText, { color: tone.main }]}>{data.courses.find((course) => course.id === task.curso_id)?.nombre ?? "Sin curso"}</AppText>
                    </View>
                    <View style={styles.estimatePill}>
                      <Ionicons name="timer-outline" color={colors.cyan} size={12} />
                      <AppText style={styles.estimate}>{task.estimacion_minutos || 1} min</AppText>
                    </View>
                  </View>
                  {task.descripcion ? <AppText style={styles.taskDescription} numberOfLines={2}>{task.descripcion}</AppText> : null}
                  <View style={styles.taskFooter}>
                    <View style={styles.deadlinePill}>
                      <Ionicons name="calendar-outline" color={colors.muted} size={12} />
                      <AppText style={styles.time}>{formatDate(task.fecha_limite)}</AppText>
                    </View>
                    <View style={styles.taskFooterActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Explicar tarea con CompAI"
                        hitSlop={8}
                        style={styles.explainButton}
                        onPress={(event) => {
                          event.stopPropagation();
                          explicarTareaConIA(task.id);
                        }}
                      >
                        <Ionicons name="sparkles-outline" color="#C084FC" size={18} />
                      </Pressable>
                      {task.estado !== "completada" ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Eliminar tarea"
                          hitSlop={8}
                          style={styles.deleteButton}
                          onPress={(event) => {
                            event.stopPropagation();
                            deleteTask(task.id);
                          }}
                        >
                          <Ionicons name="trash-outline" color={colors.danger} size={18} />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </Pressable>
        );
      })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={styles.focus}>
        <View style={styles.focusSurfaceGlow} />
        <View style={styles.focusMascot}>
          <View style={styles.focusMascotGlow} />
          <BotAvatar size={76} emotion={selectedTask ? "focus" : "sassy"} />
        </View>
        <View style={styles.focusCopy}>
          <View style={styles.focusTitleRow}>
            <AppText style={styles.focusTitle} numberOfLines={1}>{selectedTaskCourse?.nombre ?? "Elige una tarea"}</AppText>
            <View style={styles.focusModePill}><AppText style={styles.focusModePillText}>MODO ENFOQUE</AppText></View>
          </View>
          {selectedTask ? <AppText style={styles.focusTask} numberOfLines={1}>{selectedTask.titulo}</AppText> : null}
          <Animated.View style={{ opacity: focusChallengeAnim, transform: [{ translateY: focusChallengeAnim.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) }] }}>
            <AppText style={styles.focusChallenge} numberOfLines={2}>{focusChallenge}</AppText>
          </Animated.View>
        </View>
        <View style={styles.focusActions}>
          <View style={styles.focusMiniTimer}>
            <Ionicons name="timer-outline" color="#C084FC" size={14} />
            <AppText style={styles.focusMiniTimerText}>{pomodoroLabel}</AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={selectedTask ? "Iniciar Pomodoro" : "Elegir una tarea"}
            style={[styles.play, !selectedTask && styles.playChoose]}
            onPress={selectedTask ? startFocusMode : () => setTaskPanelVisible(true)}
          >
            <Ionicons name={selectedTask ? "play" : "list"} color={colors.ink} size={22} />
          </Pressable>
        </View>
      </View>

      <Modal visible={courseFormVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={closeCourseForm}>
        <View style={styles.formBackdrop}>
          <View style={[styles.formModal, styles.courseFormCard]}>
            <View style={styles.courseFormWash} />
            <View style={styles.modalFormHeader}>
              <View style={styles.formHeaderRow}>
                <View style={styles.formIcon}>
                  <Ionicons name="library-outline" color={colors.background} size={19} />
                </View>
                <View style={styles.formHeaderCopy}>
                  <AppText style={styles.formEyebrow}>ORGANIZA TU SEMESTRE</AppText>
                  <AppText style={styles.formTitle}>Nuevo curso</AppText>
                  <AppText style={styles.formHint}>Crea un espacio para agrupar tus tareas.</AppText>
                </View>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar formulario de curso" hitSlop={10} style={styles.formClose} onPress={closeCourseForm}>
                <Ionicons name="close" color={colors.ink} size={24} />
              </Pressable>
            </View>
            <Input label="Nombre del curso" value={courseName} onChangeText={setCourseName} placeholder="Ej. Cálculo I" />
            <Input label="Descripción" value={courseDescription} onChangeText={setCourseDescription} placeholder="Docente, grupo o detalle opcional" />
            <View style={styles.formFooterHint}>
              <Ionicons name="color-palette-outline" color={colors.cyan} size={15} />
              <AppText style={styles.formFooterHintText}>Podrás elegir su color después de crearlo.</AppText>
            </View>
            <Button style={styles.academicModalButton} title="Crear curso" loading={savingCourse} onPress={createCourse} icon={<Ionicons name="add" color={colors.ink} size={19} />} />
          </View>
        </View>
      </Modal>

      <Modal visible={taskFormVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={closeTaskForm}>
        <View style={styles.formBackdrop}>
          <View style={[styles.formModal, styles.taskFormCard]}>
            <View style={styles.taskFormWash} />
            <View style={styles.modalFormHeader}>
              <View style={styles.formHeaderRow}>
                <View style={[styles.formIcon, styles.formIconTask]}>
                  <Ionicons name="create-outline" color={colors.background} size={19} />
                </View>
                <View style={styles.formHeaderCopy}>
                  <AppText style={styles.formTitle}>Nueva tarea</AppText>
                  <AppText style={styles.selectedCourse}>Curso: {data.courses.find((course) => course.id === selectedCourseId)?.nombre ?? "Sin curso"}</AppText>
                </View>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar formulario de tarea" hitSlop={10} style={styles.formClose} onPress={closeTaskForm}>
                <Ionicons name="close" color={colors.ink} size={24} />
              </Pressable>
            </View>
            <Input label="Título" value={taskTitle} onChangeText={setTaskTitle} placeholder="Ej. Leer capítulo 2" />
            <Input label="Descripción" value={taskDescription} onChangeText={setTaskDescription} placeholder="Detalle opcional" />
            <View style={styles.deadlineBlock}>
              <AppText style={styles.fieldLabel}>Fecha y hora límite</AppText>
              <View style={styles.deadlineSummary}>
                <Ionicons name="calendar-outline" color={colors.cyan} size={20} />
                <AppText style={styles.deadlineText}>{formatDeadline(taskDeadline)}</AppText>
              </View>
              <View style={styles.deadlineActions}>
                <Pressable style={styles.pickerButton} onPress={() => openDeadlinePicker("date")}>
                  <Ionicons name="calendar-clear-outline" color={colors.ink} size={18} />
                  <AppText style={styles.pickerButtonText}>Fecha</AppText>
                </Pressable>
                <Pressable style={styles.pickerButton} onPress={() => openDeadlinePicker("time")}>
                  <Ionicons name="time-outline" color={colors.ink} size={18} />
                  <AppText style={styles.pickerButtonText}>Hora</AppText>
                </Pressable>
              </View>
              {iosPickerMode ? (
                <DateTimePicker
                  value={taskDeadline}
                  mode={iosPickerMode}
                  display="spinner"
                  minimumDate={iosPickerMode === "date" ? new Date() : undefined}
                  is24Hour
                  onChange={(event, date) => changeDeadline(iosPickerMode, event, date)}
                />
              ) : null}
            </View>
            <Input
              label="Minutos estimados"
              value={taskEstimate}
              onChangeText={updateEstimate}
              onBlur={normalizeEstimate}
              keyboardType="numeric"
              placeholder="1"
            />
            {taskFormError ? <AppText style={styles.formError}>{taskFormError}</AppText> : null}
            <Button style={styles.academicModalButton} title="Guardar tarea" loading={savingTask} onPress={createTask} />
          </View>
        </View>
      </Modal>

      <Modal visible={!!coursePaletteId} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setCoursePaletteId(null)}>
        <View style={styles.paletteBackdrop}>
          <View style={styles.paletteSheet}>
            <View style={styles.paletteHeader}>
              <View>
                <AppText style={styles.paletteEyebrow}>Color del curso</AppText>
                <AppText style={styles.paletteTitle}>{courseForPalette?.nombre ?? "Curso"}</AppText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar paleta de color" hitSlop={10} style={styles.formClose} onPress={() => setCoursePaletteId(null)}>
                <Ionicons name="close" color={colors.ink} size={24} />
              </Pressable>
            </View>
            <View style={styles.paletteGrid}>
              {cardPalette.map((tone) => {
                const selected = coursePaletteId ? courseColorIds[coursePaletteId] === tone.id : false;
                return (
                  <Pressable
                    key={tone.id}
                    style={[styles.paletteChoice, { borderColor: selected ? colors.ink : tone.border, backgroundColor: tone.card }]}
                    onPress={() => {
                      if (coursePaletteId) {
                        setCourseColorIds((current) => ({ ...current, [coursePaletteId]: tone.id }));
                      }
                      setCoursePaletteId(null);
                    }}
                  >
                    <View style={[styles.paletteChoiceDot, { backgroundColor: tone.main }]} />
                    <AppText style={styles.paletteChoiceText}>{tone.label}</AppText>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.customColorBox}>
              <Input
                label="Color personalizado"
                value={customCourseColor}
                onChangeText={setCustomCourseColor}
                placeholder="#FF8A3D"
                autoCapitalize="characters"
              />
              <Pressable
                style={[
                  styles.customColorButton,
                  normalizeHexColor(customCourseColor) ? { backgroundColor: normalizeHexColor(customCourseColor) ?? colors.accent } : styles.customColorButtonDisabled
                ]}
                onPress={() => {
                  const hex = normalizeHexColor(customCourseColor);
                  if (!hex || !coursePaletteId) return;
                  setCourseColorIds((current) => ({ ...current, [coursePaletteId]: hex }));
                  setCustomCourseColor("");
                  setCoursePaletteId(null);
                }}
              >
                <Ionicons name="color-fill-outline" color={colors.background} size={17} />
                <AppText style={styles.customColorButtonText}>Usar color</AppText>
              </Pressable>
            </View>
            <AppText style={styles.paletteHint}>Las tareas de este curso usarán este color automáticamente.</AppText>
          </View>
        </View>
      </Modal>

      <Modal visible={focusModeVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={cancelFocusMode}>
        <View style={styles.focusBackdrop}>
          <Card style={styles.focusModal} glow>
            <View style={styles.focusModalHeader}>
              <View>
                <AppText style={styles.focusModalLabel}>Modo concentración</AppText>
                <AppText style={styles.focusModalTask}>{selectedTask?.titulo ?? "Tarea seleccionada"}</AppText>
              </View>
              <Pressable style={styles.focusClose} onPress={cancelFocusMode}>
                <Ionicons name="close" color={colors.ink} size={20} />
              </Pressable>
            </View>

            {focusWarning ? (
              <View style={styles.focusWarning}>
                <Ionicons name="alert-circle-outline" color={colors.accent} size={18} />
                <AppText style={styles.focusWarningText}>{focusWarning}</AppText>
              </View>
            ) : null}

            <View style={styles.timerStage}>
              <Animated.View
                style={[
                  styles.timerPulse,
                  {
                    opacity: pulseOpacity,
                    transform: [{ scale: pulseScale }]
                  }
                ]}
              />
              <View style={styles.timerRing}>
                <AppText style={styles.timerText}>{pomodoroLabel}</AppText>
                <AppText style={styles.timerSubtext}>{pomodoroRunning ? "Respira y avanza" : showCompletionPrompt ? "Sesión terminada" : "Pausado"}</AppText>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pomodoroProgress * 100}%` }]} />
            </View>

            {showCompletionPrompt ? (
              <View style={styles.focusQuestion}>
                <AppText style={styles.modalTitle}>¿Acabaste la tarea?</AppText>
                <AppText style={styles.modalText}>{selectedTask?.titulo ?? "Tarea seleccionada"}</AppText>
                <View style={styles.modalActions}>
                  <Button title="Sí" onPress={completeSelectedTask} style={styles.modalButton} />
                  <Button
                    title="No"
                    variant="ghost"
                    onPress={() => {
                      setShowCompletionPrompt(false);
                      setPomodoroSeconds((selectedTask?.estimacion_minutos || 1) * 60);
                    }}
                    style={styles.modalButton}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.focusControls}>
                <Pressable style={styles.focusControlPrimary} onPress={pomodoroRunning ? pauseFocusMode : resumeFocusMode}>
                  <Ionicons name={pomodoroRunning ? "pause" : "play"} color={colors.background} size={22} />
                  <AppText style={styles.focusControlPrimaryText}>{pomodoroRunning ? "Pausar" : "Continuar"}</AppText>
                </Pressable>
                <Pressable style={styles.focusControlGhost} onPress={cancelFocusMode}>
                  <Ionicons name="close-circle-outline" color={colors.ink} size={20} />
                  <AppText style={styles.focusControlGhostText}>Cancelar</AppText>
                </Pressable>
              </View>
            )}
          </Card>
        </View>
      </Modal>

      <Modal visible={explicandoTareaId !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setExplicandoTareaId(null)}>
        <View style={styles.explainModalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setExplicandoTareaId(null)} />
          <View style={styles.explainModal}>
            <View style={styles.explainModalHeader}>
              <View style={styles.explainModalIdentity}>
                <BotAvatar size={40} emotion={explicacionTarea ? "expert" : "focus"} />
                <View>
                  <AppText style={styles.explainModalEyebrow}>COMPAI EXPLICA</AppText>
                  <AppText style={styles.explainModalTitle}>{data.tasks.find((task) => task.id === explicandoTareaId)?.titulo ?? "Tarea"}</AppText>
                </View>
              </View>
              <Pressable style={styles.libraryClose} onPress={() => setExplicandoTareaId(null)}><Ionicons name="close" color={colors.ink} size={21} /></Pressable>
            </View>
            {!explicacionTarea && !explicarTareaError ? <AppText style={styles.explainLoading}>Leyendo la tarea...</AppText> : null}
            {!!explicarTareaError && <AppText style={styles.explainError}>{explicarTareaError}</AppText>}
            {!!explicacionTarea && <AppText style={styles.explainText}>{explicacionTarea}</AppText>}
          </View>
        </View>
      </Modal>

    </Screen>
  );
}

const styles = StyleSheet.create({
  academicHeading: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10
  },
  headingMascot: {
    width: 86,
    height: 88,
    alignItems: "center",
    justifyContent: "center"
  },
  headingMascotGlow: {
    position: "absolute",
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "rgba(139,92,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.14)"
  },
  academicHeadingCopy: {
    flex: 1,
    minWidth: 0
  },
  academicEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 1
  },
  academicEyebrow: {
    color: "#BD64FF",
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900"
  },
  academicTitle: {
    color: colors.ink,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "900"
  },
  academicSubtitle: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700"
  },
  academicStatus: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(189,100,255,0.28)",
    backgroundColor: "rgba(189,100,255,0.09)",
    paddingHorizontal: 10
  },
  academicStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#BD64FF"
  },
  academicStatusText: {
    color: "#BD64FF",
    fontSize: 11,
    fontWeight: "900"
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 10
  },
  summaryTile: {
    flex: 1,
    minWidth: 0,
    minHeight: 88,
    borderRadius: 15,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
    padding: 10,
    justifyContent: "space-between"
  },
  summaryPending: {
    borderColor: "rgba(56,189,248,0.28)",
    backgroundColor: "rgba(56,189,248,0.075)"
  },
  summaryCompleted: {
    borderColor: "rgba(52,211,153,0.27)",
    backgroundColor: "rgba(52,211,153,0.07)"
  },
  summaryFocus: {
    borderColor: "rgba(251,191,119,0.28)",
    backgroundColor: "rgba(251,191,119,0.07)"
  },
  summaryIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  summaryCopy: {
    minWidth: 0
  },
  summaryValue: {
    fontSize: 19,
    lineHeight: 21,
    fontWeight: "900"
  },
  summaryLabel: {
    color: colors.text,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "800",
    marginTop: 1
  },
  summaryAccent: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 0,
    height: 2,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2
  },
  calendarLauncher: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.28)",
    backgroundColor: "rgba(139,92,246,0.075)",
    paddingHorizontal: 11,
    marginTop: 2,
    marginBottom: 2
  },
  calendarLauncherIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  calendarLauncherCopy: {
    flex: 1,
    minWidth: 0
  },
  calendarLauncherTitle: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "900"
  },
  calendarLauncherText: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 13,
    marginTop: 2
  },
  calendarLauncherAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3
  },
  calendarLauncherMonth: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  calendarBackdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(2,6,23,0.86)"
  },
  calendarPanel: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.3)",
    backgroundColor: colors.surface,
    padding: 15
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  calendarEyebrow: {
    color: colors.aqua,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "900"
  },
  calendarTitle: {
    color: colors.ink,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: "900",
    marginTop: 2
  },
  monthNavigation: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10
  },
  monthButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  monthTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  weekHeader: {
    flexDirection: "row",
    marginTop: 3,
    marginBottom: 4
  },
  weekLabel: {
    width: "14.285%",
    color: colors.muted,
    fontSize: 10,
    lineHeight: 18,
    textAlign: "center",
    fontWeight: "900"
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  calendarDay: {
    width: "14.285%",
    aspectRatio: 1,
    maxHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent"
  },
  calendarDayActive: {
    backgroundColor: colors.primary,
    borderColor: "rgba(244,114,182,0.5)"
  },
  calendarDayToday: {
    borderColor: colors.cyan
  },
  calendarDayText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "800"
  },
  calendarDayMuted: {
    color: "rgba(154,168,199,0.3)"
  },
  calendarDayTextActive: {
    color: colors.ink,
    fontWeight: "900"
  },
  calendarDeadlineDot: {
    position: "absolute",
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.cyan
  },
  calendarLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)"
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  legendActivity: {
    width: 9,
    height: 9,
    borderRadius: 3,
    backgroundColor: colors.primary
  },
  legendDeadline: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cyan
  },
  legendText: {
    color: colors.muted,
    fontSize: 10
  },
  form: {
    gap: 12,
    marginBottom: 10
  },
  libraryGrid: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 8
  },
  libraryLauncher: {
    flex: 1,
    minWidth: 0,
    minHeight: 78,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    overflow: "hidden"
  },
  courseLauncher: {
    borderColor: "rgba(189,100,255,0.34)",
    backgroundColor: "rgba(189,100,255,0.1)"
  },
  taskLauncher: {
    borderColor: "rgba(189,100,255,0.3)",
    backgroundColor: "rgba(189,100,255,0.085)"
  },
  libraryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  courseLibraryIcon: {
    backgroundColor: "#BD64FF"
  },
  taskLibraryIcon: {
    backgroundColor: "#9B4DE3"
  },
  libraryCopy: {
    flex: 1,
    minWidth: 0
  },
  libraryCount: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "900"
  },
  libraryTitle: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "900"
  },
  libraryMeta: {
    color: colors.muted,
    fontSize: 9,
    lineHeight: 12,
    marginTop: 2
  },
  libraryBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(3,2,16,0.86)"
  },
  libraryPanel: {
    width: "100%",
    maxHeight: "88%",
    minHeight: "50%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(192,132,252,0.28)",
    backgroundColor: "#151126",
    paddingTop: 9,
    paddingHorizontal: 15,
    overflow: "hidden",
    elevation: 0,
    shadowOpacity: 0
  },
  taskPanel: {
    borderColor: "rgba(192,132,252,0.28)",
    backgroundColor: "#151126"
  },
  libraryHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    backgroundColor: "rgba(216,180,254,0.3)",
    marginBottom: 12
  },
  libraryPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12
  },
  libraryPanelIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  libraryPanelTitle: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900"
  },
  libraryPanelSubtitle: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 1
  },
  libraryClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(192,132,252,0.2)",
    backgroundColor: "rgba(168,85,247,0.08)",
    elevation: 0,
    shadowOpacity: 0
  },
  panelCreateButton: {
    minHeight: 40,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#A855F7",
    marginBottom: 11,
    elevation: 0,
    shadowOpacity: 0
  },
  panelCreateTask: {
    backgroundColor: "#9333EA"
  },
  panelCreateText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: "900"
  },
  panelCreateTaskText: {
    color: "#FFFFFF"
  },
  taskPanelStats: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10
  },
  taskPanelStat: {
    flex: 1,
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 8,
    elevation: 0,
    shadowOpacity: 0
  },
  taskPanelPending: {
    borderColor: "rgba(56,189,248,0.22)",
    backgroundColor: "rgba(56,189,248,0.07)"
  },
  taskPanelCompleted: {
    borderColor: "rgba(52,211,153,0.22)",
    backgroundColor: "rgba(52,211,153,0.07)"
  },
  taskPanelDot: {
    width: 7,
    height: 7,
    borderRadius: 4
  },
  taskPanelStatValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  taskPanelStatLabel: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "800"
  },
  libraryPanelContent: {
    paddingTop: 2,
    paddingBottom: 36
  },
  quickAction: {
    minHeight: 66,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(39,183,255,0.28)",
    backgroundColor: "rgba(39,183,255,0.09)",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    overflow: "hidden"
  },
  quickActionTask: {
    borderColor: "rgba(124,58,237,0.34)",
    backgroundColor: "rgba(124,58,237,0.1)"
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: colors.cyan,
    alignItems: "center",
    justifyContent: "center"
  },
  quickActionIconTask: {
    backgroundColor: colors.primary
  },
  quickActionCopy: {
    flex: 1,
    minWidth: 0
  },
  quickActionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  quickActionText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3
  },
  formHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    flex: 1,
    minWidth: 0
  },
  formIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#A855F7",
    alignItems: "center",
    justifyContent: "center"
  },
  formIconTask: {
    backgroundColor: "#9333EA"
  },
  formHeaderCopy: {
    flex: 1,
    minWidth: 0
  },
  formTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  formEyebrow: {
    color: "#C084FC",
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "900",
    marginBottom: 1
  },
  formHint: {
    color: colors.muted,
    marginTop: 4,
    lineHeight: 18
  },
  formBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3,2,16,0.9)",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 28
  },
  formModal: {
    width: "100%",
    maxWidth: 430,
    maxHeight: "90%",
    alignSelf: "center",
    gap: 11,
    paddingVertical: 17,
    overflow: "hidden"
  },
  modalFormHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  formClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.22)",
    backgroundColor: "rgba(251,113,133,0.82)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 0,
    shadowOpacity: 0
  },
  courseFormCard: {
    borderWidth: 1,
    borderRadius: 24,
    borderColor: "rgba(192,132,252,0.34)",
    backgroundColor: "#171329",
    paddingHorizontal: 16,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0
  },
  courseFormWash: {
    position: "absolute",
    width: 128,
    height: 128,
    borderRadius: 64,
    right: -42,
    top: -48,
    backgroundColor: "rgba(168,85,247,0.11)"
  },
  formFooterHint: {
    minHeight: 34,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    backgroundColor: "rgba(168,85,247,0.07)",
    borderWidth: 1,
    borderColor: "rgba(192,132,252,0.18)"
  },
  formFooterHintText: {
    flex: 1,
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14
  },
  courseCards: {
    gap: 10,
    marginBottom: 12
  },
  paletteButton: {
    position: "absolute",
    right: 8,
    top: 50,
    zIndex: 3,
    minHeight: 28,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    borderWidth: 1,
  },
  paletteButtonDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  paletteBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3,5,31,0.9)",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 28
  },
  paletteSheet: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.28)",
    backgroundColor: colors.surface,
    padding: 16,
    gap: 14
  },
  paletteHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10
  },
  paletteEyebrow: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: "900"
  },
  paletteTitle: {
    color: colors.ink,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "900",
    marginTop: 3
  },
  paletteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9
  },
  paletteChoice: {
    width: "31%",
    minWidth: 92,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8
  },
  paletteChoiceDot: {
    width: 20,
    height: 20,
    borderRadius: 10
  },
  paletteChoiceText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "900"
  },
  customColorBox: {
    gap: 10
  },
  customColorButton: {
    minHeight: 44,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12
  },
  customColorButtonDisabled: {
    backgroundColor: "rgba(148,163,184,0.22)"
  },
  customColorButtonText: {
    color: colors.background,
    fontWeight: "900"
  },
  paletteHint: {
    color: colors.muted,
    lineHeight: 18,
    fontSize: 12,
    fontWeight: "800"
  },
  courseCard: {
    width: "100%",
    minHeight: 98,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: courseTone.border,
    backgroundColor: "rgba(39,183,255,0.075)",
    paddingVertical: 10,
    paddingLeft: 15,
    paddingRight: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    elevation: 0,
    shadowOpacity: 0
  },
  courseColorWash: {
    position: "absolute",
    left: -45,
    top: -50,
    width: 130,
    height: 130,
    borderRadius: 65,
    opacity: 0.6,
    backgroundColor: courseTone.wash
  },
  courseAccent: {
    position: "absolute",
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3
  },
  courseAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: courseTone.wash,
    borderWidth: 1,
    borderColor: courseTone.border,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1
  },
  courseMain: {
    flex: 1,
    minWidth: 0
  },
  courseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  courseCardTitle: {
    flex: 1,
    minWidth: 0,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "900"
  },
  courseActivePill: {
    minHeight: 20,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6
  },
  courseActiveText: {
    color: colors.background,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "900"
  },
  courseCardDescription: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 13,
    marginTop: 2
  },
  courseCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginTop: 6
  },
  courseCardMeta: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "900"
  },
  courseProgressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.1)",
    marginTop: 5
  },
  courseProgressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: courseTone.main
  },
  courseActions: {
    gap: 7
  },
  courseActionButton: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)"
  },
  selectedCourse: {
    color: colors.cyan,
    fontWeight: "900"
  },
  fieldLabel: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 13
  },
  deadlineBlock: {
    gap: 9
  },
  deadlineSummary: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  deadlineText: {
    color: colors.ink,
    fontWeight: "900",
    flex: 1,
    lineHeight: 20
  },
  deadlineActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap"
  },
  pickerButton: {
    minHeight: 44,
    flex: 1,
    minWidth: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(192,132,252,0.24)",
    backgroundColor: "rgba(168,85,247,0.09)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14
  },
  academicModalButton: { elevation: 0, shadowOpacity: 0 },
  pickerButtonText: {
    color: colors.ink,
    fontWeight: "900"
  },
  formError: {
    color: colors.danger,
    lineHeight: 20,
    fontWeight: "800"
  },
  taskFormCard: {
    borderWidth: 1,
    borderRadius: 24,
    borderColor: "rgba(192,132,252,0.34)",
    backgroundColor: "#171329",
    paddingHorizontal: 16,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0
  },
  taskFormWash: {
    position: "absolute",
    right: -36,
    top: -44,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(168,85,247,0.11)"
  },
  taskCard: {
    marginBottom: 8,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 12,
    position: "relative",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "rgba(168,85,247,0.075)",
    elevation: 0,
    shadowOpacity: 0
  },
  taskColorWash: {
    position: "absolute",
    right: -34,
    top: -42,
    width: 108,
    height: 108,
    borderRadius: 54,
    opacity: 0.72
  },
  taskSelected: {
    borderColor: colors.cyan,
    backgroundColor: "rgba(39,183,255,0.14)"
  },
  taskDoneCard: {
    backgroundColor: "rgba(36,229,164,0.14)",
    borderColor: "rgba(36,229,164,0.45)"
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9
  },
  taskAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: colors.cyan,
    opacity: 0.75
  },
  check: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2
  },
  checkDone: {
    borderColor: colors.success,
    backgroundColor: colors.success
  },
  checkSelected: {
    borderColor: "#A855F7",
    backgroundColor: "#A855F7"
  },
  taskCopy: {
    flex: 1,
    minWidth: 0
  },
  taskHeaderLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8
  },
  time: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  coursePill: {
    minHeight: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(39,183,255,0.24)",
    backgroundColor: "rgba(39,183,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    maxWidth: "100%"
  },
  coursePillText: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: "900",
    flexShrink: 1
  },
  estimatePill: {
    minHeight: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(39,183,255,0.24)",
    backgroundColor: "rgba(39,183,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8
  },
  estimate: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: "900"
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 5
  },
  completedPill: {
    minHeight: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9
  },
  completedText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: "900"
  },
  taskStatusPill: {
    minHeight: 23,
    borderRadius: 12,
    backgroundColor: "rgba(39,183,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(39,183,255,0.25)",
    justifyContent: "center",
    paddingHorizontal: 8
  },
  taskStatusDone: {
    backgroundColor: colors.success,
    borderColor: colors.success
  },
  taskStatusText: {
    color: colors.cyan,
    fontSize: 10,
    fontWeight: "900"
  },
  taskStatusDoneText: {
    color: colors.background
  },
  taskFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 8
  },
  deadlinePill: {
    minHeight: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    flexShrink: 1
  },
  focus: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 11,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(189,100,255,0.38)",
    backgroundColor: "#21153D",
    overflow: "hidden",
    elevation: 0,
    shadowOpacity: 0
  },
  focusSurfaceGlow: {
    position: "absolute",
    width: 132,
    height: 132,
    borderRadius: 66,
    left: -42,
    top: -48,
    backgroundColor: "rgba(189,100,255,0.1)"
  },
  focusMascot: {
    width: 70,
    height: 78,
    alignItems: "center",
    justifyContent: "center"
  },
  focusMascotGlow: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(139,92,246,0.13)",
    borderWidth: 1,
    borderColor: "rgba(244,114,182,0.14)"
  },
  focusCopy: {
    flex: 1,
    minWidth: 0
  },
  focusTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap"
  },
  focusTitle: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900"
  },
  focusModePill: {
    minHeight: 18,
    borderRadius: 9,
    justifyContent: "center",
    paddingHorizontal: 6,
    backgroundColor: "rgba(168,85,247,0.14)",
    borderWidth: 1,
    borderColor: "rgba(192,132,252,0.3)"
  },
  focusModePillText: {
    color: "#D8B4FE",
    fontSize: 7,
    lineHeight: 10,
    fontWeight: "900"
  },
  focusTask: {
    color: "#C084FC",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    marginTop: 3
  },
  focusChallenge: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 4
  },
  focusActions: {
    alignItems: "center",
    gap: 6
  },
  focusMiniTimer: {
    minHeight: 30,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(192,132,252,0.34)",
    backgroundColor: "rgba(168,85,247,0.13)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 7
  },
  focusMiniTimerText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "900"
  },
  pomodoroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#BD64FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#BD64FF",
    shadowOpacity: 0.7,
    shadowRadius: 14
  },
  playChoose: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary
  },
  reset: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  taskFooterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  explainButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(168,85,247,0.14)",
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.32)"
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,80,104,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,80,104,0.32)"
  },
  focusBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3,5,31,0.88)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 28
  },
  focusModal: {
    width: "100%",
    maxWidth: 430,
    gap: 18,
    paddingVertical: 22,
    borderColor: "rgba(192,132,252,0.42)",
    backgroundColor: "#1B1230"
  },
  focusModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  focusModalLabel: {
    color: "#C084FC",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  focusModalTask: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25,
    marginTop: 4,
    maxWidth: 300
  },
  focusClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center"
  },
  focusWarning: {
    minHeight: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,204,102,0.36)",
    backgroundColor: "rgba(255,204,102,0.12)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12
  },
  focusWarningText: {
    flex: 1,
    color: colors.ink,
    lineHeight: 19,
    fontWeight: "800"
  },
  timerStage: {
    minHeight: 242,
    alignItems: "center",
    justifyContent: "center"
  },
  timerPulse: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: "#A855F7",
    backgroundColor: "rgba(168,85,247,0.09)"
  },
  timerRing: {
    width: 204,
    height: 204,
    borderRadius: 102,
    borderWidth: 3,
    borderColor: "#C084FC",
    backgroundColor: "rgba(30,18,52,0.96)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    shadowColor: "#A855F7",
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 8
  },
  timerText: {
    color: colors.ink,
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "900",
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    textAlign: "center",
    includeFontPadding: false,
    width: "100%"
  },
  timerSubtext: {
    color: colors.muted,
    marginTop: 8,
    fontWeight: "800"
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: colors.border
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: "#A855F7"
  },
  focusControls: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap"
  },
  focusControlPrimary: {
    flex: 1,
    minWidth: 138,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#A855F7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  focusControlPrimaryText: {
    color: colors.background,
    fontWeight: "900"
  },
  focusControlGhost: {
    flex: 1,
    minWidth: 138,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  focusControlGhostText: {
    color: colors.ink,
    fontWeight: "900"
  },
  focusQuestion: {
    gap: 12
  },
  title: {
    flex: 1,
    color: colors.ink,
    fontWeight: "900",
    fontSize: 15,
    lineHeight: 19,
    flexShrink: 1
  },
  text: {
    color: colors.text,
    marginTop: 7,
    lineHeight: 20
  },
  taskDescription: {
    color: colors.text,
    marginTop: 6,
    lineHeight: 17,
    fontSize: 12
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3,5,31,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    gap: 12
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "900"
  },
  modalText: {
    color: colors.text,
    lineHeight: 21
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap"
  },
  modalButton: {
    flex: 1,
    minWidth: 120
  },
  explainModalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, backgroundColor: "rgba(2,4,12,0.88)" },
  explainModal: { width: "100%", maxWidth: 420, borderRadius: 24, borderWidth: 1, borderColor: "rgba(192,132,252,0.4)", backgroundColor: "#151126", padding: 16 },
  explainModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 },
  explainModalIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 },
  explainModalEyebrow: { color: "#A78BFA", fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  explainModalTitle: { color: colors.ink, fontSize: 15, fontWeight: "900", marginTop: 2 },
  explainLoading: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  explainError: { color: "#FCA5A5", fontSize: 12, lineHeight: 17 },
  explainText: { color: colors.text, fontSize: 12, lineHeight: 18 },
  documentUploadCard: { minHeight: 58, borderRadius: 15, borderWidth: 1, borderColor: "rgba(168,85,247,0.28)", backgroundColor: "rgba(139,92,246,0.075)", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 9, marginTop: 8 },
  documentUploadIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(168,85,247,0.14)" },
  documentUploadCopy: { flex: 1, minWidth: 0 },
  documentUploadTitle: { color: colors.ink, fontSize: 11, fontWeight: "900" },
  documentUploadText: { color: colors.muted, fontSize: 8, lineHeight: 11, marginTop: 2 },
  documentUploadError: { color: "#FCA5A5", fontSize: 8, marginTop: 2 },
  documentUploadButton: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#7C3AED" },
  documentList: { gap: 6, marginTop: 6 },
  documentRow: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 2 },
  documentRowText: { flex: 1, color: colors.text, fontSize: 8, lineHeight: 11 },
  documentRowMeta: { color: colors.muted, fontSize: 7 }
});
