import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../components/AppText";
import { BotAvatar } from "../components/BotAvatar";
import { LoadingState } from "../components/LoadingState";
import { Screen } from "../components/Screen";
import { EmptyState } from "../components/EmptyState";
import { SensorData, SensorInsight, SensorSnapshot, SensorSnapshotMetric, TendenciaSensor, TipoSensor } from "../interfaces/sensor.interface";
import { useAuth } from "../hooks/useAuth";
import { appApi } from "../services/api";
import { colors } from "../theme/colors";
import { formatDate } from "../utils/helpers";

type IconName = keyof typeof Ionicons.glyphMap;

const sensorUI: Record<TipoSensor, { label: string; icon: IconName; accent: string }> = {
  MOVIMIENTO: { label: "Movimiento", icon: "walk-outline", accent: "#9333EA" },
  CALIDAD_AIRE: { label: "Calidad de aire", icon: "cloud-outline", accent: "#A78BFA" },
  AMBIENTE: { label: "Ambiente", icon: "thermometer-outline", accent: "#D8B4FE" }
};

const liveSensorTypes: Array<{ type: TipoSensor; unit: string }> = [
  { type: "MOVIMIENTO", unit: "m" },
  { type: "CALIDAD_AIRE", unit: "ppm" },
  { type: "AMBIENTE", unit: "°C" }
];

function presentation(type: TipoSensor) {
  return sensorUI[type] ?? { label: type.replaceAll("_", " "), icon: "hardware-chip-outline" as IconName, accent: "#A855F7" };
}

const tendenciaUI: Record<TendenciaSensor, { icon: IconName; label: string }> = {
  subiendo: { icon: "trending-up-outline", label: "Subiendo" },
  bajando: { icon: "trending-down-outline", label: "Bajando" },
  estable: { icon: "remove-outline", label: "Estable" },
  sin_datos: { icon: "ellipse-outline", label: "Sin historial" }
};

// Cada usuario tiene su propio equipo fisico: al entrar a esta pantalla, la
// app lo vincula sola a la cuenta activa (sin que el usuario tenga que hacer
// nada mas que conectar el cable) para que sus lecturas lleguen aqui.
const SENSOR_DEVICE_API_KEY = process.env.EXPO_PUBLIC_SENSOR_API_KEY ?? "";

export function SensorsScreen() {
  const { width } = useWindowDimensions();
  const { session, setSessionUser } = useAuth();
  const [readings, setReadings] = useState<SensorData[] | null>(null);
  const [snapshots, setSnapshots] = useState<SensorSnapshot[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [selectedSnapshot, setSelectedSnapshot] = useState<SensorSnapshot | null>(null);
  const [insight, setInsight] = useState<SensorInsight | null>(null);
  const [askingInsight, setAskingInsight] = useState(false);
  const [insightError, setInsightError] = useState("");
  const [insightSnapshotId, setInsightSnapshotId] = useState<number | null>(null);
  const [resettingMovimiento, setResettingMovimiento] = useState(false);

  useEffect(() => {
    if (SENSOR_DEVICE_API_KEY) {
      appApi.vincularDispositivo(SENSOR_DEVICE_API_KEY).catch(() => {});
    }
  }, [session?.user.id]);

  useEffect(() => {
    let active = true;
    const loadLiveReadings = () => appApi.getSensorsForUser(session?.user.id).then((data) => active && setReadings(data)).catch(() => active && setReadings([]));
    loadLiveReadings();
    appApi.getSensorSnapshots().then((data) => active && setSnapshots(data)).catch(() => active && setSnapshots([]));
    const interval = setInterval(loadLiveReadings, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [session?.user.id]);

  if (!readings || !snapshots) return <Screen><LoadingState /></Screen>;

  const metricWidth = Math.max(138, Math.floor((width - 42) / 2));
  const newestTimestamp = readings.reduce((latest, reading) => Math.max(latest, new Date(reading.timestamp).getTime()), 0);
  const hardwareConnected = newestTimestamp > 0 && Date.now() - newestTimestamp < 30000;
  const movimientoOffset = session?.user.preferencias?.movimiento_offset ?? 0;
  const liveMetrics: SensorSnapshotMetric[] = liveSensorTypes.map(({ type, unit }) => {
    const latest = readings.filter((item) => item.tipo_sensor === type).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    const valorCrudo = hardwareConnected && latest ? latest.valor : 0;
    // Si el equipo se reinició (se apagó/colgó), su contador interno vuelve a 0 y
    // queda por debajo del offset guardado; en ese caso mostramos el valor crudo
    // directo en vez de un negativo recortado a 0 para siempre.
    const valor = type === "MOVIMIENTO"
      ? (valorCrudo >= movimientoOffset ? valorCrudo - movimientoOffset : valorCrudo)
      : valorCrudo;
    return { tipo_sensor: type, valor, unidad: latest?.unidad ?? unit };
  });

  const reiniciarMovimiento = async () => {
    if (resettingMovimiento) return;
    setResettingMovimiento(true);
    setSaveMessage("");
    try {
      const usuario = await appApi.reiniciarMovimiento();
      await setSessionUser(usuario);
      setSaveMessage("El contador de movimiento vuelve a arrancar en 0.");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No pudimos reiniciar el contador.");
    } finally {
      setResettingMovimiento(false);
    }
  };

  const pedirInsightParaSnapshot = async (snapshot: SensorSnapshot) => {
    setInsightSnapshotId(snapshot.id);
    setInsight(null);
    setInsightError("");
    setAskingInsight(true);
    try {
      const metricas = snapshot.lecturas.map((metrica) => ({ tipo_sensor: metrica.tipo_sensor, valor: metrica.valor, unidad: metrica.unidad }));
      // Historial guardado (últimas 20 lecturas) para que CompAI vea tendencias, no solo esta lectura.
      const historial = (snapshots ?? [])
        .slice(0, 20)
        .flatMap((item) => item.lecturas.map((metrica) => ({ ...metrica, creado_en: item.creado_en })));
      const resultado = await appApi.getSensorInsight(metricas, historial);
      setInsight(resultado);
    } catch (error) {
      setInsightError(error instanceof Error ? error.message : "No pudimos analizar esta lectura.");
    } finally {
      setAskingInsight(false);
    }
  };

  const saveMetrics = async () => {
    if (!hardwareConnected || saving) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const saved = await appApi.saveSensorSnapshot(liveMetrics);
      setSnapshots((current) => [saved, ...(current ?? [])]);
      setSaveMessage("Las métricas se guardaron correctamente.");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No pudimos guardar las métricas.");
    } finally {
      setSaving(false);
    }
  };

  const removeSnapshot = async (id: number) => {
    try {
      await appApi.deleteSensorSnapshot(id);
      setSnapshots((current) => current?.filter((snapshot) => snapshot.id !== id) ?? []);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No pudimos eliminar el registro.");
    }
  };
  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerMascot}>
          <View style={styles.headerGlow} />
          <BotAvatar size={82} emotion="expert" />
        </View>
        <View style={styles.headerCopy}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="hardware-chip-outline" color="#BD64FF" size={13} />
            <AppText style={styles.eyebrow}>MONITOREO IOT</AppText>
          </View>
          <AppText style={styles.title}>Sensores</AppText>
          <AppText style={styles.subtitle}>Lecturas para entender tu ritmo diario.</AppText>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <AppText style={styles.sectionTitle}>Últimas lecturas</AppText>
        <View style={[styles.livePill, !hardwareConnected && styles.offlinePill]}><View style={[styles.liveDot, !hardwareConnected && styles.offlineDot]} /><AppText style={[styles.liveText, !hardwareConnected && styles.offlineText]}>{hardwareConnected ? "LIVE" : "SIN EQUIPO"}</AppText></View>
      </View>

      {!hardwareConnected && (
        <View style={styles.connectionNotice}>
          <View style={styles.connectionIcon}><Ionicons name="hardware-chip-outline" color="#D8B4FE" size={22} /></View>
          <View style={styles.connectionCopy}><AppText style={styles.connectionTitle}>Conecta el equipo</AppText><AppText style={styles.connectionText}>Enciende y vincula el dispositivo para ver las métricas en tiempo real.</AppText></View>
          <Ionicons name="radio-outline" color="#A78BFA" size={20} />
        </View>
      )}

      <View style={styles.grid}>
            {liveMetrics.map((metric) => {
              const ui = presentation(metric.tipo_sensor);
              return (
                <View key={metric.tipo_sensor} style={[styles.metric, { width: metricWidth, borderColor: `${ui.accent}45` }]}>
                  <View style={[styles.metricGlow, { backgroundColor: `${ui.accent}12` }]} />
                  <View style={styles.metricTop}>
                    <View style={[styles.metricIcon, { backgroundColor: `${ui.accent}18` }]}><Ionicons name={ui.icon} color={ui.accent} size={19} /></View>
                    {metric.tipo_sensor === "MOVIMIENTO" ? (
                      <Pressable onPress={reiniciarMovimiento} disabled={resettingMovimiento} hitSlop={8} accessibilityLabel="Reiniciar contador de movimiento">
                        <Ionicons name={resettingMovimiento ? "hourglass-outline" : "refresh-outline"} color="#A78BFA" size={15} />
                      </Pressable>
                    ) : (
                      <AppText style={styles.metricLatest}>ÚLTIMO</AppText>
                    )}
                  </View>
                  <View style={styles.metricNumberRow}><AppText style={[styles.metricValue, { color: hardwareConnected ? ui.accent : "#746886" }]}>{metric.valor}</AppText><AppText style={styles.metricUnit}>{metric.unidad}</AppText></View>
                  <AppText style={styles.metricLabel}>{ui.label}</AppText>
                  <View style={styles.metricRule} />
                  <AppText style={styles.metricTime} numberOfLines={1}>{hardwareConnected ? "Actualización automática" : "Esperando conexión"}</AppText>
                </View>
              );
            })}
      </View>

      <Pressable style={({ pressed }) => [styles.saveButton, !hardwareConnected && styles.saveButtonDisabled, pressed && hardwareConnected && styles.pressed]} onPress={saveMetrics} disabled={!hardwareConnected || saving}>
        <Ionicons name={saving ? "hourglass-outline" : "bookmark-outline"} color={hardwareConnected ? "#FFFFFF" : "#746886"} size={18} />
        <AppText style={[styles.saveButtonText, !hardwareConnected && styles.saveButtonTextDisabled]}>{saving ? "Guardando..." : "Guardar métricas"}</AppText>
      </Pressable>
      {!!saveMessage && <AppText style={styles.saveMessage}>{saveMessage}</AppText>}

      <View style={styles.sectionHeading}>
        <AppText style={styles.sectionTitle}>Historial guardado</AppText>
        <View style={styles.historyIcon}><Ionicons name="time-outline" color="#C084FC" size={18} /></View>
      </View>

      {snapshots.length === 0 ? (
        <EmptyState icon="bookmark-outline" title="Aún no guardaste lecturas" message="Cuando el equipo esté conectado, podrás guardar sus métricas y encontrarlas aquí." />
      ) : (
        <View style={styles.historyList}>
          {snapshots.map((snapshot) => (
              <View key={snapshot.id} style={styles.snapshotCard}>
                <Pressable style={({ pressed }) => [styles.snapshotOpen, pressed && styles.pressed]} onPress={() => setSelectedSnapshot(snapshot)}>
                  <View style={styles.savedIcon}><Ionicons name="bookmark" color="#C084FC" size={16} /></View>
                  <View style={styles.savedCopy}><AppText style={styles.snapshotTitle}>Lectura guardada</AppText><AppText style={styles.snapshotDate}>{formatDate(snapshot.creado_en)} · {snapshot.lecturas.length} {snapshot.lecturas.length === 1 ? "métrica" : "métricas"}</AppText></View>
                  <Ionicons name="chevron-forward" color="#A78BFA" size={18} />
                </Pressable>
                  <Pressable style={({ pressed }) => [styles.assistantButton, pressed && styles.pressed]} onPress={() => pedirInsightParaSnapshot(snapshot)} accessibilityLabel="Analizar con CompAI"><Ionicons name="sparkles-outline" color="#C084FC" size={16} /></Pressable>
                  <Pressable style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]} onPress={() => removeSnapshot(snapshot.id)} accessibilityLabel="Eliminar lectura guardada"><Ionicons name="trash-outline" color="#FB7185" size={16} /></Pressable>
              </View>
          ))}
        </View>
      )}

      <Modal visible={Boolean(selectedSnapshot)} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setSelectedSnapshot(null)}>
        <View style={styles.snapshotModalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedSnapshot(null)} />
          <View style={styles.snapshotModal}>
            <View style={styles.snapshotModalGlow} />
            <View style={styles.snapshotModalHeader}>
              <View style={styles.snapshotModalIdentity}>
                <View style={styles.snapshotModalIcon}><Ionicons name="analytics-outline" color="#D8B4FE" size={20} /></View>
                <View><AppText style={styles.snapshotModalEyebrow}>CAPTURA DE SENSORES</AppText><AppText style={styles.snapshotModalTitle}>Métricas guardadas</AppText></View>
              </View>
              <Pressable style={styles.snapshotModalClose} onPress={() => setSelectedSnapshot(null)}><Ionicons name="close" color={colors.ink} size={21} /></Pressable>
            </View>
            <View style={styles.snapshotModalDate}><Ionicons name="calendar-outline" color="#A78BFA" size={14} /><AppText style={styles.snapshotModalDateText}>{selectedSnapshot ? formatDate(selectedSnapshot.creado_en) : ""}</AppText></View>
            <View style={styles.snapshotModalGrid}>
              {selectedSnapshot?.lecturas.map((metric) => {
                const ui = presentation(metric.tipo_sensor);
                return <View key={metric.tipo_sensor} style={[styles.snapshotDetailMetric, { borderColor: `${ui.accent}38` }]}><View style={[styles.snapshotDetailIcon, { backgroundColor: `${ui.accent}16` }]}><Ionicons name={ui.icon} color={ui.accent} size={18} /></View><AppText style={styles.snapshotDetailLabel}>{ui.label}</AppText><View style={styles.snapshotDetailValueRow}><AppText style={[styles.snapshotDetailValue, { color: ui.accent }]}>{metric.valor}</AppText><AppText style={styles.snapshotDetailUnit}>{metric.unidad}</AppText></View></View>;
              })}
            </View>
            <Pressable style={({ pressed }) => [styles.snapshotModalButton, pressed && styles.pressed]} onPress={() => setSelectedSnapshot(null)}><AppText style={styles.snapshotModalButtonText}>Cerrar detalle</AppText></Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={insightSnapshotId !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setInsightSnapshotId(null)}>
        <View style={styles.snapshotModalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setInsightSnapshotId(null)} />
          <View style={styles.snapshotModal}>
            <View style={styles.snapshotModalGlow} />
            <View style={styles.snapshotModalHeader}>
              <View style={styles.snapshotModalIdentity}>
                <BotAvatar size={40} emotion={askingInsight ? "focus" : "expert"} />
                <View><AppText style={styles.snapshotModalEyebrow}>ANÁLISIS DE COMPAI</AppText><AppText style={styles.snapshotModalTitle}>{insight ? "Esto encontré" : "Analizando..."}</AppText></View>
              </View>
              <Pressable style={styles.snapshotModalClose} onPress={() => setInsightSnapshotId(null)}><Ionicons name="close" color={colors.ink} size={21} /></Pressable>
            </View>

            {askingInsight && <AppText style={styles.insightLoading}>Revisando tus métricas guardadas...</AppText>}
            {!!insightError && <AppText style={styles.insightError}>{insightError}</AppText>}

            {insight && (
              <>
                <AppText style={[styles.insightSummary, { marginTop: 12 }]}>{insight.resumen}</AppText>
                <View style={[styles.insightMetrics, { marginTop: 11 }]}>
                  {insight.metricas.map((item) => {
                    const ui = presentation(item.tipo_sensor);
                    const tendencia = tendenciaUI[item.tendencia];
                    return (
                      <View key={item.tipo_sensor} style={[styles.insightMetric, { borderColor: `${ui.accent}38` }]}>
                        <View style={styles.insightMetricHeader}>
                          <View style={[styles.insightMetricIcon, { backgroundColor: `${ui.accent}18` }]}><Ionicons name={ui.icon} color={ui.accent} size={15} /></View>
                          <AppText style={styles.insightMetricLabel}>{ui.label}</AppText>
                          <View style={styles.tendenciaPill}>
                            <Ionicons name={tendencia.icon} color="#A78BFA" size={11} />
                            <AppText style={styles.tendenciaText}>{tendencia.label}</AppText>
                          </View>
                        </View>
                        <AppText style={styles.insightMeaning}>{item.significado}</AppText>
                        <View style={styles.insightRecoRow}>
                          <Ionicons name="bulb-outline" color="#FBBF24" size={12} />
                          <AppText style={styles.insightReco}>{item.recomendacion}</AppText>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            <Pressable style={({ pressed }) => [styles.snapshotModalButton, pressed && styles.pressed]} onPress={() => setInsightSnapshotId(null)}><AppText style={styles.snapshotModalButtonText}>Cerrar</AppText></Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 132 },
  header: { minHeight: 82, flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 1 },
  headerMascot: { width: 78, height: 78, alignItems: "center", justifyContent: "center", transform: [{ scale: 0.9 }] },
  headerGlow: { position: "absolute", width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(189,100,255,0.12)", borderWidth: 1, borderColor: "rgba(189,100,255,0.2)" },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  eyebrow: { color: "#BD64FF", fontSize: 9, lineHeight: 12, fontWeight: "900", letterSpacing: 0.4 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 31, fontWeight: "900" },
  subtitle: { color: colors.text, fontSize: 11, lineHeight: 15, fontWeight: "700" },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 8, paddingHorizontal: 2 }, sectionTitle: { color: colors.ink, fontSize: 16, lineHeight: 20, fontWeight: "900", marginTop: 1 }, livePill: { height: 22, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(168,85,247,0.11)", borderWidth: 1, borderColor: "rgba(192,132,252,0.22)", paddingHorizontal: 7 }, liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#C084FC" }, liveText: { color: "#D8B4FE", fontSize: 6, fontWeight: "900", letterSpacing: 0.7 }, historyIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(168,85,247,0.11)" },
  offlinePill: { backgroundColor: "rgba(148,163,184,0.07)", borderColor: "rgba(148,163,184,0.18)" }, offlineDot: { backgroundColor: "#64748B" }, offlineText: { color: "#8491AA" },
  connectionNotice: { minHeight: 58, borderRadius: 15, borderWidth: 1, borderColor: "rgba(168,85,247,0.28)", backgroundColor: "rgba(139,92,246,0.075)", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 9, marginBottom: 8 }, connectionIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(168,85,247,0.14)", transform: [{ scale: 0.9 }] }, connectionCopy: { flex: 1, minWidth: 0 }, connectionTitle: { color: colors.ink, fontSize: 11, fontWeight: "900" }, connectionText: { color: colors.muted, fontSize: 8, lineHeight: 11, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 7, justifyContent: "space-between" }, metric: { minHeight: 104, borderRadius: 15, borderWidth: 1, backgroundColor: "#171329", paddingHorizontal: 9, paddingVertical: 8, overflow: "hidden" }, metricGlow: { position: "absolute", width: 70, height: 70, borderRadius: 35, right: -32, top: -31 }, metricTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, metricIcon: { width: 27, height: 27, borderRadius: 9, alignItems: "center", justifyContent: "center", transform: [{ scale: 0.82 }] }, metricLatest: { color: "#7F8BA8", fontSize: 5, fontWeight: "900", letterSpacing: 0.6 }, metricNumberRow: { flexDirection: "row", alignItems: "baseline", gap: 3, marginTop: 2 }, metricValue: { fontSize: 20, lineHeight: 23, fontWeight: "900" }, metricUnit: { color: colors.muted, fontSize: 7, fontWeight: "800" }, metricLabel: { color: colors.ink, fontSize: 9, lineHeight: 11, fontWeight: "900" }, metricRule: { height: 1, backgroundColor: "rgba(255,255,255,0.055)", marginTop: 4, marginBottom: 3 }, metricTime: { color: colors.muted, fontSize: 5 },
  saveButton: { alignSelf: "center", minWidth: 190, height: 40, borderRadius: 13, backgroundColor: "#7C3AED", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 15, marginTop: 10 }, saveButtonDisabled: { backgroundColor: "rgba(116,104,134,0.12)", borderWidth: 1, borderColor: "rgba(116,104,134,0.2)" }, saveButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" }, saveButtonTextDisabled: { color: "#746886" }, saveMessage: { color: "#C4B5FD", fontSize: 8, lineHeight: 11, textAlign: "center", marginTop: 5 },
  insightLoading: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 12 },
  insightError: { color: "#FCA5A5", fontSize: 9, lineHeight: 12, marginTop: 12 },
  insightSummary: { color: colors.text, fontSize: 10, lineHeight: 14, fontWeight: "700" },
  insightMetrics: { gap: 8 },
  insightMetric: { borderRadius: 13, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.025)", padding: 9, gap: 5 },
  insightMetricHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  insightMetricIcon: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  insightMetricLabel: { flex: 1, color: colors.ink, fontSize: 9, fontWeight: "900" },
  tendenciaPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(168,85,247,0.11)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  tendenciaText: { color: "#A78BFA", fontSize: 7, fontWeight: "900" },
  insightMeaning: { color: colors.text, fontSize: 9, lineHeight: 13 },
  insightRecoRow: { flexDirection: "row", alignItems: "flex-start", gap: 5 },
  insightReco: { flex: 1, color: "#FBBF9E", fontSize: 9, lineHeight: 13, fontWeight: "700" },
  historyList: { gap: 7 }, snapshotCard: { minHeight: 58, borderRadius: 15, borderWidth: 1, borderColor: "rgba(168,85,247,0.2)", backgroundColor: "#141125", flexDirection: "row", alignItems: "center", paddingHorizontal: 8 }, snapshotOpen: { flex: 1, minHeight: 56, flexDirection: "row", alignItems: "center", gap: 8 }, savedIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(168,85,247,0.11)" }, savedCopy: { flex: 1, minWidth: 0 }, snapshotTitle: { color: colors.ink, fontSize: 11, fontWeight: "900" }, snapshotDate: { color: colors.muted, fontSize: 7, marginTop: 2 }, assistantButton: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(168,85,247,0.1)", marginLeft: 4 }, deleteButton: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(251,113,133,0.08)", marginLeft: 4 },
  snapshotModalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, backgroundColor: "rgba(2,4,12,0.88)" }, snapshotModal: { width: "100%", maxWidth: 420, borderRadius: 24, borderWidth: 1, borderColor: "rgba(192,132,252,0.4)", backgroundColor: "#151126", padding: 15, overflow: "hidden" }, snapshotModalGlow: { position: "absolute", width: 180, height: 180, borderRadius: 90, right: -80, top: -100, backgroundColor: "rgba(168,85,247,0.12)" }, snapshotModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, snapshotModalIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 }, snapshotModalIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(168,85,247,0.16)" }, snapshotModalEyebrow: { color: "#A78BFA", fontSize: 6, fontWeight: "900", letterSpacing: 0.9 }, snapshotModalTitle: { color: colors.ink, fontSize: 17, fontWeight: "900", marginTop: 2 }, snapshotModalClose: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.055)" }, snapshotModalDate: { minHeight: 34, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, backgroundColor: "rgba(139,92,246,0.065)", marginTop: 12 }, snapshotModalDateText: { color: colors.text, fontSize: 9 }, snapshotModalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 11 }, snapshotDetailMetric: { width: "48%", minHeight: 92, borderRadius: 14, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.025)", padding: 9 }, snapshotDetailIcon: { width: 29, height: 29, borderRadius: 9, alignItems: "center", justifyContent: "center" }, snapshotDetailLabel: { color: colors.text, fontSize: 8, lineHeight: 11, fontWeight: "800", marginTop: 6 }, snapshotDetailValueRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 2 }, snapshotDetailValue: { fontSize: 18, fontWeight: "900" }, snapshotDetailUnit: { color: colors.muted, fontSize: 7 }, snapshotModalButton: { height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#7C3AED", marginTop: 13 }, snapshotModalButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] }
});
