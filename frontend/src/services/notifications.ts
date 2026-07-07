import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Recordatorio } from "../interfaces/reminder.interface";

const CHANNEL_ID = "compai-care";
const IDS_KEY = "compai.notification.ids";
const EYE_CARE_KEY = "compai.eye-care.schedule";

export const eyeCareExercises = [
  "Cierra fuertemente los ojos",
  "Mueve los ojos de lado a lado varias veces",
  "Gira los ojos en sentido horario",
  "Gira los ojos en sentido antihorario",
  "Parpadea lentamente",
  "Enfócate en un punto distante"
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

async function readIds() {
  try {
    return JSON.parse((await SecureStore.getItemAsync(IDS_KEY)) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

async function saveIds(ids: Record<string, string>) {
  await SecureStore.setItemAsync(IDS_KEY, JSON.stringify(ids));
}

export async function initializeNotifications() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Cuidados de CompAI",
      description: "Recordatorios de bienestar programados por el usuario.",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 180, 250],
      lightColor: "#A855F7",
      sound: "default"
    });
  }
}

async function ensurePermission() {
  await initializeNotifications();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

export async function scheduleCareNotification(reminder: Recordatorio) {
  const date = new Date(reminder.fecha_hora);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) return false;
  if (!(await ensurePermission())) return false;

  await cancelCareNotification(reminder.id);
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "CompAI · Tu cuidado es ahora",
      body: reminder.titulo,
      sound: "default",
      color: "#A855F7",
      data: { type: "wellness-reminder", reminderId: reminder.id }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: CHANNEL_ID
    }
  });
  const ids = await readIds();
  ids[String(reminder.id)] = identifier;
  await saveIds(ids);
  return true;
}

export async function cancelCareNotification(reminderId: number) {
  const ids = await readIds();
  const identifier = ids[String(reminderId)];
  if (!identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
  delete ids[String(reminderId)];
  await saveIds(ids);
}

export async function startEyeCareSchedule() {
  if (!(await ensurePermission())) return false;
  await stopEyeCareSchedule();
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const identifiers: string[] = [];

  for (let date = new Date(now.getTime() + 20 * 60 * 1000); date <= endOfDay; date = new Date(date.getTime() + 20 * 60 * 1000)) {
    const exercise = eyeCareExercises[Math.floor(Math.random() * eyeCareExercises.length)];
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "CompAI · Descanso visual",
        body: `${exercise} durante 20 segundos.`,
        sound: "default",
        color: "#A855F7",
        data: { type: "eye-care", exercise }
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID }
    });
    identifiers.push(identifier);
  }

  await SecureStore.setItemAsync(EYE_CARE_KEY, JSON.stringify({ date: now.toDateString(), identifiers }));
  return identifiers.length > 0;
}

export async function stopEyeCareSchedule() {
  try {
    const stored = await SecureStore.getItemAsync(EYE_CARE_KEY);
    if (stored) {
      const schedule = JSON.parse(stored) as { identifiers?: string[] };
      await Promise.all((schedule.identifiers ?? []).map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
    }
  } finally {
    await SecureStore.deleteItemAsync(EYE_CARE_KEY);
  }
}

export async function isEyeCareScheduleActive() {
  try {
    const stored = await SecureStore.getItemAsync(EYE_CARE_KEY);
    if (!stored) return false;
    const schedule = JSON.parse(stored) as { date?: string; identifiers?: string[] };
    if (schedule.date !== new Date().toDateString() || !schedule.identifiers?.length) {
      await stopEyeCareSchedule();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
