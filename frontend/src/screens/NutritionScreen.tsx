import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { BotAvatar } from "../components/BotAvatar";
import { Input } from "../components/Input";
import { LoadingState } from "../components/LoadingState";
import { ProgressLine } from "../components/ProgressLine";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { StatCard } from "../components/StatCard";
import { EmptyState } from "../components/EmptyState";
import { AINutritionMealRecommendation, AINutritionMenu, CuratedNutritionPlan, DailyNutritionMeal, FoodAnalysisResult, FoodLog } from "../types/nutrition";
import { useAuth } from "../hooks/useAuth";
import { appApi } from "../services/api";
import {
  calculateConsumedNutrition,
  getDailyCaloriesProgress,
  getMacroProgress,
  selectActiveNutritionPlan
} from "../services/nutritionReferences";
import { colors } from "../theme/colors";
import { formatDate } from "../utils/helpers";

type RecommendedMealIdea = {
  id: string;
  mealId: string;
  nombre: string;
  descripcion: string;
  caloriasAprox: number;
  proteinasG: number;
  carbohidratosG: number;
  grasasG: number;
  foods: string[];
};

const mealEmojiByName = (name: string) => {
  const normalized = name.toLowerCase();
  if (normalized.includes("desayuno")) return "🌅";
  if (normalized.includes("almuerzo")) return "🍽️";
  if (normalized.includes("cena")) return "🌙";
  if (normalized.includes("snack") || normalized.includes("merienda") || normalized.includes("refrigerio")) return "🍎";
  return "🥗";
};

const planEmojiById: Record<string, string> = {
  "myplate-balanced": "🌈",
  "dash-heart": "❤️",
  mediterranean: "🫒",
  "moderate-high-protein": "💪",
  "moderate-low-carb": "🥑",
  "balanced-vegetarian": "🥦"
};

const planEmoji = (plan: CuratedNutritionPlan) => planEmojiById[plan.id] ?? "✨";

const mealPalette = [
  { id: "amber", label: "Ámbar", main: colors.accent, wash: "rgba(251,191,119,0.18)", border: "rgba(251,191,119,0.38)", card: "rgba(251,191,119,0.13)" },
  { id: "mint", label: "Menta", main: colors.aqua, wash: "rgba(94,234,212,0.15)", border: "rgba(94,234,212,0.36)", card: "rgba(94,234,212,0.1)" },
  { id: "cyan", label: "Cian", main: colors.cyan, wash: "rgba(56,189,248,0.14)", border: "rgba(56,189,248,0.36)", card: "rgba(56,189,248,0.1)" },
  { id: "violet", label: "Violeta", main: colors.primary, wash: "rgba(139,92,246,0.14)", border: "rgba(139,92,246,0.36)", card: "rgba(139,92,246,0.1)" },
  { id: "rose", label: "Rosa", main: colors.pink, wash: "rgba(244,114,182,0.14)", border: "rgba(244,114,182,0.36)", card: "rgba(244,114,182,0.1)" },
  { id: "green", label: "Verde", main: colors.success, wash: "rgba(52,211,153,0.14)", border: "rgba(52,211,153,0.36)", card: "rgba(52,211,153,0.1)" },
  { id: "blue", label: "Azul", main: colors.info, wash: "rgba(96,165,250,0.14)", border: "rgba(96,165,250,0.36)", card: "rgba(96,165,250,0.1)" },
  { id: "coral", label: "Coral", main: colors.danger, wash: "rgba(251,113,133,0.14)", border: "rgba(251,113,133,0.36)", card: "rgba(251,113,133,0.1)" },
  { id: "lime", label: "Lima", main: "#A3E635", wash: "rgba(163,230,53,0.14)", border: "rgba(163,230,53,0.36)", card: "rgba(163,230,53,0.1)" },
  { id: "orange", label: "Naranja", main: "#FB923C", wash: "rgba(251,146,60,0.15)", border: "rgba(251,146,60,0.38)", card: "rgba(251,146,60,0.11)" },
  { id: "fuchsia", label: "Fucsia", main: "#E879F9", wash: "rgba(232,121,249,0.14)", border: "rgba(232,121,249,0.36)", card: "rgba(232,121,249,0.1)" },
  { id: "slate", label: "Humo", main: "#94A3B8", wash: "rgba(148,163,184,0.14)", border: "rgba(148,163,184,0.36)", card: "rgba(148,163,184,0.1)" }
] as const;

const purpleMirrorGradient = ["rgba(126,34,206,0.24)", "rgba(76,29,149,0.13)", "rgba(23,19,41,0.94)"] as const;

type MealTone = {
  id: string;
  label?: string;
  main: string;
  wash: string;
  border: string;
  card: string;
};

type MealCategory = "desayuno" | "almuerzo" | "cena" | "refrigerio";

const mealCategoryDefaults: Record<MealCategory, typeof mealPalette[number]["id"]> = {
  desayuno: "amber",
  almuerzo: "mint",
  cena: "violet",
  refrigerio: "rose"
};

const mealCategoryLabel: Record<MealCategory, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Cena",
  refrigerio: "Refrigerio"
};

const mealCategoryOptions: MealCategory[] = ["desayuno", "almuerzo", "cena", "refrigerio"];

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

const customMealToneFromHex = (hex: string): MealTone => ({
  id: hex,
  label: "Personalizado",
  main: hex,
  wash: rgbaFromHex(hex, 0.16),
  border: rgbaFromHex(hex, 0.4),
  card: rgbaFromHex(hex, 0.11)
});

const getMealTone = (toneId: string): MealTone => {
  const customHex = normalizeHexColor(toneId);
  if (customHex) return customMealToneFromHex(customHex);
  return mealPalette.find((tone) => tone.id === toneId) ?? mealPalette[0];
};

function EmojiText({ children, style }: { children: string; style?: object }) {
  return <Text style={[styles.emojiText, style]}>{children}</Text>;
}

export function NutritionScreen() {
  const { session } = useAuth();
  const registerDraftMotion = useRef(new Animated.Value(0)).current;
  const [data, setData] = useState<{ meals: FoodLog[] } | null>(null);
  const [guidelinePlans, setGuidelinePlans] = useState<CuratedNutritionPlan[]>([]);
  const [foodText, setFoodText] = useState("");
  const [foodQuantity, setFoodQuantity] = useState("");
  const [analysis, setAnalysis] = useState<FoodAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [saveValidationError, setSaveValidationError] = useState("");
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [selectedFoodCategory, setSelectedFoodCategory] = useState<MealCategory | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [dailyMeals, setDailyMeals] = useState<DailyNutritionMeal[]>([]);
  const [plansPanelVisible, setPlansPanelVisible] = useState(false);
  const [recommendedMenuVisible, setRecommendedMenuVisible] = useState(false);
  const [foodFormVisible, setFoodFormVisible] = useState(false);
  const [mealsVisible, setMealsVisible] = useState(false);
  const [detailPlan, setDetailPlan] = useState<CuratedNutritionPlan | null>(null);
  const [changePlanCandidate, setChangePlanCandidate] = useState<CuratedNutritionPlan | null>(null);
  const [mealPaletteCategory, setMealPaletteCategory] = useState<MealCategory | null>(null);
  const [mealCategoryColorIds, setMealCategoryColorIds] = useState<Partial<Record<MealCategory, string>>>({});
  const [mealCategoryOverrides, setMealCategoryOverrides] = useState<Record<number, MealCategory>>({});
  const [mealCategoryModalId, setMealCategoryModalId] = useState<number | null>(null);
  const [customMealColor, setCustomMealColor] = useState("");
  const [planMessage, setPlanMessage] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<"api" | "compai" | "photo" | null>(null);
  const [savingMeal, setSavingMeal] = useState(false);
  const [aiMeals, setAiMeals] = useState<Partial<Record<MealCategory, AINutritionMealRecommendation>>>({});
  const [aiMealLoading, setAiMealLoading] = useState<Partial<Record<MealCategory, boolean>>>({});
  const [aiMealErrors, setAiMealErrors] = useState<Partial<Record<MealCategory, string>>>({});
  const legacyMenuPromiseRef = useRef<Promise<AINutritionMenu> | null>(null);
  const hasPendingFoodDraft = Boolean(foodText.trim() || foodQuantity.trim());

  useEffect(() => {
    if (!hasPendingFoodDraft) {
      registerDraftMotion.stopAnimation();
      registerDraftMotion.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(registerDraftMotion, { toValue: 1, duration: 620, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(registerDraftMotion, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.delay(700)
    ]));
    loop.start();
    return () => loop.stop();
  }, [hasPendingFoodDraft, registerDraftMotion]);

  useEffect(() => {
    Promise.all([
      appApi.getFoodLogsToday(),
      appApi.getNutritionPlans(),
      appApi.getActiveNutritionPlan()
    ]).then(([meals, plans, planState]) => {
      setData({ meals });
      setGuidelinePlans(plans);
      if (planState.activePlan) {
        setSelectedPlanId(planState.activePlan.id);
        setDailyMeals(selectActiveNutritionPlan(planState.activePlan.id)?.meals ?? []);
      }
      if (planState.message) setPlanMessage(planState.message);
    });
  }, [session?.user.id]);

  useEffect(() => {
    setAiMeals({});
    setAiMealErrors({});
    legacyMenuPromiseRef.current = null;
  }, [selectedPlanId]);

  const analyzeMeal = async () => {
    if (!foodText.trim()) return;
    setAnalyzing(true);
    setAnalysisStage("api");
    const missingQuantityWarning = !foodQuantity.trim() ? "No se indicó cantidad. Se usará una porción estándar." : "";
    setAnalysisError(missingQuantityWarning);
    setAnalysis(null);
    try {
      const baseResult = await appApi.analyzeFood(foodText, foodQuantity);
      let result: FoodAnalysisResult = baseResult;
      setAnalysisStage("compai");
      try {
        const review = await appApi.reviewNutrition(foodText, foodQuantity, baseResult);
        result = {
          ...baseResult,
          name: review.name,
          displayName: review.name,
          calories: Math.round(review.calories),
          protein: Math.round(review.protein * 10) / 10,
          carbs: Math.round(review.carbs * 10) / 10,
          fat: Math.round(review.fat * 10) / 10,
          confidence: review.confidence,
          source: `${baseResult.source} + CompAI`,
          reviewedByCompAI: true,
          reviewExplanation: review.explanation,
          baseCalories: baseResult.calories,
          message: "Estimación revisada por CompAI."
        };
      } catch {
        setAnalysisError("CompAI no pudo completar la segunda revisión. Se muestra la estimación de la base nutricional.");
      }
      setAnalysis(result);
      setFoodName(result.displayName || result.originalText || result.name);
      setCalories(String(result.calories));
      setProtein(String(result.protein));
      setCarbs(String(result.carbs));
      setFats(String(result.fat));
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos analizar la comida.";
      setAnalysisError(message.includes("Servicio nutricional no configurado") ? "Servicio nutricional no configurado." : message);
    } finally {
      setAnalyzing(false);
      setAnalysisStage(null);
    }
  };

  const analyzeMealPhoto = async (source: "camera" | "library") => {
    const permission = source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAnalysisError(source === "camera" ? "Necesitamos permiso de cámara para tomar la foto." : "Necesitamos permiso para acceder a tu galería.");
      return;
    }
    const pickerResult = source === "camera"
      ? await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsEditing: true, mediaTypes: ["images"] });
    if (pickerResult.canceled || !pickerResult.assets?.length) return;

    const asset = pickerResult.assets[0];
    setAnalyzing(true);
    setAnalysisStage("photo");
    setAnalysisError("");
    setAnalysis(null);
    try {
      const extension = (asset.fileName?.split(".").pop() || asset.uri.split(".").pop() || "jpg").toLowerCase();
      const mimeType = asset.mimeType || (extension === "png" ? "image/png" : "image/jpeg");
      const result = await appApi.analyzeFoodPhoto({ uri: asset.uri, name: `comida.${extension}`, mimeType });
      setAnalysis(result);
      setFoodName(result.displayName || result.name);
      setCalories(String(result.calories));
      setProtein(String(result.protein));
      setCarbs(String(result.carbs));
      setFats(String(result.fat));
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos analizar la foto.";
      setAnalysisError(message);
    } finally {
      setAnalyzing(false);
      setAnalysisStage(null);
    }
  };

  const createMeal = async () => {
    const values = [Number(calories), Number(protein), Number(carbs), Number(fats)];
    if (!selectedFoodCategory) {
      setSaveValidationError("Selecciona si esta comida es desayuno, almuerzo, cena o refrigerio antes de guardarla.");
      return;
    }
    if (!foodName.trim() || values.some((value) => !Number.isFinite(value) || value < 0)) {
      setAnalysisError("Revisa los valores antes de guardar. No pueden estar vacios ni ser negativos.");
      return;
    }
    setSaveValidationError("");
    setSavingMeal(true);
    try {
      const meal = await appApi.createFoodLog({
        name: foodName.trim(),
        calories: Number(calories),
        protein: Number(protein),
        carbs: Number(carbs),
        fat: Number(fats),
        source: analysis?.source ?? null
      });
      setData((current) => current ? { ...current, meals: [meal, ...current.meals] } : current);
      setMealCategoryOverrides((current) => ({ ...current, [meal.id]: selectedFoodCategory }));
      setFoodText("");
      setFoodQuantity("");
      setFoodName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFats("");
      setSelectedFoodCategory(null);
      setAnalysis(null);
      setAnalysisError("");
      setSaveValidationError("");
      setFoodFormVisible(false);
    } finally {
      setSavingMeal(false);
    }
  };

  const deleteMeal = async (mealId: number) => {
    await appApi.deleteMeal(mealId);
    setData((current) => current ? {
      ...current,
      meals: current.meals.filter((meal) => meal.id !== mealId)
    } : current);
  };

  const activatePlanToday = (planId: string) => {
    const selection = selectActiveNutritionPlan(planId);
    if (!selection) return;
    setSelectedPlanId(planId);
    setDailyMeals(selection.meals);
    setPlanMessage("");
    setDetailPlan(null);
    setPlansPanelVisible(false);
  };

  const choosePlan = (planId: string) => {
    if (selectedPlanId === planId) return;
    const plan = guidelinePlans.find((item) => item.id === planId);
    if (!plan) return;

    const consumed = calculateConsumedNutrition(dailyMeals);
    const loggedCalories = data?.meals.reduce((total, meal) => total + meal.calories, 0) ?? 0;
    const hasProgressToday = consumed.comidasConsumidas > 0 || consumed.calorias > 0 || loggedCalories > 0;

    if (selectedPlanId && hasProgressToday) {
      setDetailPlan(null);
      setPlansPanelVisible(false);
      setChangePlanCandidate(plan);
      return;
    }

    appApi.selectNutritionPlan(planId, "today").then(() => activatePlanToday(planId));
  };

  const changePlanToday = () => {
    if (!changePlanCandidate) return;
    appApi.selectNutritionPlan(changePlanCandidate.id, "today").then(() => {
      activatePlanToday(changePlanCandidate.id);
      setChangePlanCandidate(null);
    });
  };

  const togglePlanMeal = (mealId: string) => {
    setDailyMeals((current) => current.map((meal) => (
      meal.id === mealId
        ? { ...meal, estado: meal.estado === "consumida" ? "pendiente" : "consumida" }
        : meal
    )));
  };

  if (!data) return <Screen><LoadingState /></Screen>;

  const activePlan = guidelinePlans.find((plan) => plan.id === selectedPlanId) ?? null;
  const consumedFromPlan = calculateConsumedNutrition(dailyMeals);
  const consumedNutrition = data.meals.reduce(
    (total, meal) => ({
      calorias: total.calorias + meal.calories,
      proteinasG: total.proteinasG + meal.protein,
      carbohidratosG: total.carbohidratosG + meal.carbs,
      grasasG: total.grasasG + meal.fat,
      comidasConsumidas: total.comidasConsumidas + 1
    }),
    { ...consumedFromPlan }
  );
  const calorieProgress = activePlan
    ? getDailyCaloriesProgress(consumedNutrition.calorias, activePlan.objetivosDiarios.calorias)
    : getDailyCaloriesProgress(0, 0);
  const proteinProgress = activePlan
    ? getMacroProgress(consumedNutrition.proteinasG, activePlan.objetivosDiarios.proteinasG)
    : getMacroProgress(0, 0);
  const carbProgress = activePlan
    ? getMacroProgress(consumedNutrition.carbohidratosG, activePlan.objetivosDiarios.carbohidratosG)
    : getMacroProgress(0, 0);
  const fatProgress = activePlan
    ? getMacroProgress(consumedNutrition.grasasG, activePlan.objetivosDiarios.grasasG)
    : getMacroProgress(0, 0);
  const generateAIMeal = async (category: MealCategory) => {
    if (!activePlan || aiMealLoading[category]) return;
    setAiMealLoading((current) => ({ ...current, [category]: true }));
    setAiMealErrors((current) => ({ ...current, [category]: "" }));
    try {
      const recommendation = await appApi.getAINutritionMeal(activePlan, category, "", aiMeals[category]?.meal.name ?? "");
      setAiMeals((current) => ({ ...current, [category]: recommendation }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("No encontramos esa información")) {
        try {
          if (!legacyMenuPromiseRef.current) {
            const fallbackRequest = appApi.getAINutritionMenu(activePlan);
            legacyMenuPromiseRef.current = fallbackRequest;
            const clearFallback = () => {
              if (legacyMenuPromiseRef.current === fallbackRequest) legacyMenuPromiseRef.current = null;
            };
            void fallbackRequest.then(clearFallback, clearFallback);
          }
          const legacyMenu = await legacyMenuPromiseRef.current;
          const meal = legacyMenu.meals.find((item) => item.category === category);
          if (!meal) throw new Error("La recomendación llegó incompleta");
          setAiMeals((current) => ({
            ...current,
            [category]: { message: `Esta opción respeta el enfoque de ${activePlan.nombre} y utiliza alimentos habituales en Latinoamérica.`, meal }
          }));
        } catch {
          setAiMealErrors((current) => ({ ...current, [category]: `CompAI no pudo crear el ${category}. Toca el botón para intentarlo otra vez.` }));
        }
      } else {
        setAiMealErrors((current) => ({ ...current, [category]: message || `CompAI no pudo crear el ${category}. Toca el botón para intentarlo otra vez.` }));
      }
    } finally {
      setAiMealLoading((current) => ({ ...current, [category]: false }));
    }
  };

  const generateInitialMeals = () => mealCategoryOptions.forEach((category) => void generateAIMeal(category));

  const openRecommendedMenu = () => {
    setRecommendedMenuVisible(true);
    if (Object.keys(aiMeals).length === 0 && activePlan) generateInitialMeals();
  };

  const useRecommendedIdea = (idea: RecommendedMealIdea) => {
    setFoodText(idea.foods.length ? idea.foods.join(" con ") : idea.nombre);
    setFoodQuantity("1 porción");
    setAnalysis(null);
    setAnalysisError("");
    setRecommendedMenuVisible(false);
  };

  return (
    <Screen>
      <View style={styles.screenHeader}>
        <View style={styles.headerMascot}><View style={styles.headerGlow} /><BotAvatar size={82} emotion="nutrition" /></View>
        <View style={styles.headerCopy}>
          <View style={styles.headerEyebrow}><Ionicons name="sparkles" color="#C084FC" size={12} /><AppText style={styles.headerEyebrowText}>TU ALIMENTACIÓN</AppText></View>
          <AppText style={styles.screenTitle}>Nutrición</AppText>
          <AppText style={styles.screenSubtitle}>Alimentación que te hace bien.</AppText>
        </View>
      </View>
      {activePlan ? (
        <View style={styles.statsRow}>
          <StatCard label="Proteínas" detail={`${proteinProgress.consumed} / ${proteinProgress.target} g`} value={`${proteinProgress.percent}%`} />
          <StatCard label="Carbohidratos" detail={`${carbProgress.consumed} / ${carbProgress.target} g`} value={`${carbProgress.percent}%`} tone="info" />
          <StatCard label="Grasas" detail={`${fatProgress.consumed} / ${fatProgress.target} g`} value={`${fatProgress.percent}%`} tone="accent" />
        </View>
      ) : null}
      {activePlan ? (
        <Card style={styles.planStatusCard} gradientColors={purpleMirrorGradient}>
          <View style={styles.planStatusRow}>
            <View style={styles.planStatusCopy}>
              <View style={styles.activeGoalHead}>
                <AppText style={styles.goalLabel}>Plan nutricional</AppText>
                <View style={styles.planTagActiveSmall}>
                  <AppText style={styles.planTagTextActive}>Plan elegido</AppText>
                </View>
              </View>
              <AppText style={styles.planStatusTitle}>{activePlan.nombre}</AppText>
              <AppText style={styles.planStatusMeta}>{activePlan.objetivosDiarios.calorias} kcal objetivo · {activePlan.objetivosDiarios.comidas} comidas</AppText>
              {planMessage ? <AppText style={styles.planMessage}>{planMessage}</AppText> : null}
            </View>
            <Pressable style={styles.changePlanButton} onPress={() => setPlansPanelVisible(true)}>
              <Ionicons name="swap-horizontal-outline" color={colors.background} size={17} />
              <AppText style={styles.changePlanButtonText}>Cambiar plan</AppText>
            </Pressable>
          </View>
        </Card>
      ) : (
        <Card style={styles.planStatusCard} gradientColors={purpleMirrorGradient}>
          <View style={styles.planStatusRow}>
            <View style={styles.planStatusCopy}>
              <AppText style={styles.planStatusTitle}>Elige tu plan nutricional</AppText>
              <AppText style={styles.planStatusMeta}>Elige un plan para activar tus metas diarias.</AppText>
            </View>
            <Pressable style={styles.changePlanButton} onPress={() => setPlansPanelVisible(true)}>
              <Ionicons name="library-outline" color={colors.background} size={17} />
              <AppText style={styles.changePlanButtonText}>Ver planes</AppText>
            </Pressable>
          </View>
        </Card>
      )}

      {activePlan ? (
        <Card style={styles.goal} gradientColors={purpleMirrorGradient}>
          <View style={styles.goalRow}>
            <View style={styles.goalCopy}>
              <AppText style={styles.goalLabel}>Meta diaria</AppText>
              <AppText style={styles.goalValue}>
                {calorieProgress.consumed} <AppText style={styles.goalMuted}>/ {calorieProgress.target} kcal</AppText>
              </AppText>
              <AppText style={styles.goalMuted}>{consumedNutrition.comidasConsumidas} / {activePlan.objetivosDiarios.comidas} comidas consumidas</AppText>
            </View>
            <View style={styles.goalCircle}>
              <AppText style={styles.goalPercent}>{calorieProgress.percent}%</AppText>
            </View>
          </View>
          <ProgressLine label="Avance kcal" value={calorieProgress.percent} color="#A855F7" />
        </Card>
      ) : null}

      {activePlan ? (
        <Pressable onPress={openRecommendedMenu} style={({ pressed }) => pressed && styles.launcherPressed}>
          <Card style={styles.recommendedMenuCard} gradientColors={purpleMirrorGradient}>
            <View style={styles.recommendedMenuHead}>
              <View style={styles.recommendedMenuIcon}>
                <EmojiText style={styles.recommendedMenuEmoji}>{planEmoji(activePlan)}</EmojiText>
              </View>
              <View style={styles.recommendedMenuCopy}>
                <AppText style={styles.recommendedMenuTitle}>Menú recomendado de hoy</AppText>
                <AppText style={styles.recommendedMenuMeta}>
                  {consumedNutrition.comidasConsumidas}/{activePlan.objetivosDiarios.comidas} comidas consumidas · basado en {activePlan.nombre}
                </AppText>
              </View>
              <Ionicons name="arrow-forward" color="#C084FC" size={18} />
            </View>
          </Card>
        </Pressable>
      ) : null}

      <Pressable style={({ pressed }) => [styles.registerLauncher, pressed && styles.launcherPressed]} onPress={() => setFoodFormVisible(true)}>
        <View style={[styles.registerLauncherIcon, hasPendingFoodDraft && styles.registerLauncherIconPending]}><Ionicons name={hasPendingFoodDraft ? "sparkles" : "add"} size={20} color="#FFFFFF" /></View>
        <Animated.View style={[styles.registerLauncherCopy, hasPendingFoodDraft && { opacity: registerDraftMotion.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }), transform: [{ translateY: registerDraftMotion.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }, { scale: registerDraftMotion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) }] }]}>
          <AppText style={[styles.registerLauncherTitle, hasPendingFoodDraft && styles.registerLauncherTitlePending]}>{hasPendingFoodDraft ? "Tienes una comida por analizar" : "Registrar comida"}</AppText>
          <AppText style={styles.registerLauncherMeta}>{hasPendingFoodDraft ? "Toca para continuar el análisis" : "Analiza y guarda lo que comiste"}</AppText>
        </Animated.View>
        <Ionicons name="arrow-forward" size={18} color="#C084FC" />
      </Pressable>

      <Modal visible={foodFormVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setFoodFormVisible(false)}>
        <View style={styles.foodFormBackdrop}>
          <View style={styles.foodFormModal}>
            <View style={styles.foodFormHeader}><View><AppText style={styles.foodFormTitle}>Registrar comida</AppText><AppText style={styles.foodFormSubtitle}>Cuéntanos qué comiste hoy</AppText></View><Pressable style={styles.foodFormClose} onPress={() => setFoodFormVisible(false)}><Ionicons name="close" size={20} color={colors.ink} /></Pressable></View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.foodFormScroll} keyboardShouldPersistTaps="handled">
      <Card style={styles.form}>
        <AppText style={styles.formTitle}>¿Qué comiste?</AppText>
        {!activePlan ? <AppText style={styles.meta}>Elige un plan nutricional para comparar tus comidas con una meta diaria.</AppText> : null}
        <Input label="Comida" value={foodText} onChangeText={(value) => { setFoodText(value); setAnalysisError(""); }} placeholder="Ej. Avena con plátano y yogurt" />
        <Input label="Cantidad aproximada" value={foodQuantity} onChangeText={setFoodQuantity} placeholder="Ej. 1 taza, 1 plato, 200 g" />
        <View style={styles.photoDivider}>
          <View style={styles.photoDividerLine} />
          <AppText style={styles.photoDividerText}>o toma una foto de tu comida</AppText>
          <View style={styles.photoDividerLine} />
        </View>
        <View style={styles.photoRow}>
          <Pressable style={styles.photoButton} onPress={() => analyzeMealPhoto("camera")} disabled={analyzing}>
            <Ionicons name="camera-outline" color={colors.background} size={18} />
            <AppText style={styles.photoButtonText}>Tomar foto</AppText>
          </Pressable>
          <Pressable style={styles.photoButtonSecondary} onPress={() => analyzeMealPhoto("library")} disabled={analyzing}>
            <Ionicons name="image-outline" color={colors.ink} size={18} />
            <AppText style={styles.photoButtonSecondaryText}>Galería</AppText>
          </Pressable>
        </View>
        <View style={styles.categorySelector}>
          <AppText style={styles.categorySelectorLabel}>Tipo de comida</AppText>
          <View style={styles.categoryChips}>
            {mealCategoryOptions.map((category) => {
              const active = selectedFoodCategory === category;
              const tone = getMealTone(mealCategoryColorIds[category] ?? mealCategoryDefaults[category]);
              return (
                <Pressable
                  key={category}
                  style={[styles.categoryChip, { borderColor: tone.border, backgroundColor: active ? tone.wash : "rgba(255,255,255,0.055)" }]}
                  onPress={() => {
                    setSelectedFoodCategory(category);
                    setAnalysisError("");
                    setSaveValidationError("");
                  }}
                >
                  <View style={[styles.categoryChipDot, { backgroundColor: tone.main }]} />
                  <AppText style={[styles.categoryChipText, active && { color: tone.main }]}>{mealCategoryLabel[category]}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Button title="Analizar comida" loading={analyzing} onPress={analyzeMeal} />
        {analysisError ? <AppText style={styles.errorText}>{analysisError}</AppText> : null}
        {analysis ? (
          <View style={styles.analysisCard}>
            <View style={styles.analysisHero}>
              <View style={styles.analysisIcon}>
                <Ionicons name="sparkles-outline" color={colors.background} size={22} />
              </View>
              <View style={styles.analysisCopy}>
                <View style={styles.analysisStatusPill}>
                  <Ionicons name="checkmark-circle" color={colors.background} size={14} />
                  <AppText style={styles.analysisStatusText}>{analysis.reviewedByCompAI ? "Revisado por CompAI" : "Listo para guardar"}</AppText>
                </View>
                <AppText style={styles.analysisTitle}>{analysis.displayName || analysis.originalText || analysis.name}</AppText>
              </View>
              <View style={styles.analysisKcalBubble}>
                <AppText style={styles.analysisKcalValue}>{analysis.calories}</AppText>
                <AppText style={styles.analysisKcalLabel}>kcal</AppText>
              </View>
            </View>
            <View style={styles.analysisMacroGrid}>
              <View style={styles.analysisMacroChip}><AppText style={styles.analysisMacroValue}>{analysis.protein}g</AppText><AppText style={styles.analysisMacroLabel}>Proteínas</AppText></View>
              <View style={styles.analysisMacroChip}><AppText style={styles.analysisMacroValue}>{analysis.carbs}g</AppText><AppText style={styles.analysisMacroLabel}>Carbos</AppText></View>
              <View style={styles.analysisMacroChip}><AppText style={styles.analysisMacroValue}>{analysis.fat}g</AppText><AppText style={styles.analysisMacroLabel}>Grasas</AppText></View>
            </View>
            {analysis.notFoundFoods?.length ? (
              <View style={styles.compactWarning}>
                <Ionicons name="alert-circle-outline" color={colors.warning} size={17} />
                <AppText style={styles.compactWarningText}>No encontramos: {analysis.notFoundFoods.join(", ")}</AppText>
              </View>
            ) : null}
            <View style={styles.analysisNote}>
              <Ionicons name={analysis.reviewedByCompAI ? "sparkles" : "information-circle-outline"} color={colors.aqua} size={17} />
              <AppText style={styles.analysisNoteText}>{analysis.reviewExplanation ?? "Estimación aproximada. Puedes editarla antes de guardar."}</AppText>
            </View>
            <Input label="Nombre detectado" value={foodName} onChangeText={setFoodName} />
            <Input label="Kcal" value={calories} onChangeText={setCalories} keyboardType="numeric" />
            <View style={styles.macroInputs}>
              <View style={styles.macroField}>
                <Input label="Proteínas g" value={protein} onChangeText={setProtein} keyboardType="numeric" />
              </View>
              <View style={styles.macroField}>
                <Input label="Carbos g" value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
              </View>
              <View style={styles.macroField}>
                <Input label="Grasas g" value={fats} onChangeText={setFats} keyboardType="numeric" />
              </View>
            </View>
            <Button title="Guardar comida" loading={savingMeal} onPress={createMeal} />
            {saveValidationError ? <View style={styles.saveValidationAlert}><Ionicons name="alert-circle" color="#FB7185" size={17} /><AppText style={styles.saveValidationText}>{saveValidationError}</AppText></View> : null}
          </View>
        ) : null}
      </Card>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={analyzing} transparent animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
        <View style={styles.reviewBackdrop}>
          <View style={styles.reviewModal}>
            <View style={styles.reviewGlow} />
            <BotAvatar size={92} emotion={analysisStage === "compai" ? "expert" : "focus"} />
            <AppText style={styles.reviewEyebrow}>{analysisStage === "photo" ? "ANALIZANDO FOTO" : analysisStage === "compai" ? "PASO 2 DE 2" : "PASO 1 DE 2"}</AppText>
            <AppText style={styles.reviewTitle}>{analysisStage === "photo" ? "CompAI está viendo tu foto" : analysisStage === "compai" ? "CompAI está revisando" : "Analizando tu comida"}</AppText>
            <AppText style={styles.reviewText}>{analysisStage === "photo" ? "Identificando el plato y estimando calorías, proteínas, carbohidratos y grasas." : analysisStage === "compai" ? "Comprobando la porción, los ingredientes y la coherencia entre calorías y macronutrientes." : "Calculando una primera aproximación con la base de datos de alimentos."}</AppText>
            {analysisStage === "photo" ? null : (
            <View style={styles.reviewSteps}>
              <View style={[styles.reviewStep, analysisStage === "api" ? styles.reviewStepActive : styles.reviewStepComplete]}>{analysisStage === "api" ? <ActivityIndicator color="#E9D5FF" size="small" /> : <Ionicons name="checkmark" color={colors.background} size={13} />}<AppText style={styles.reviewStepText}>Revisión nutricional</AppText></View>
              <View style={styles.reviewStepLine} />
              <View style={[styles.reviewStep, analysisStage === "compai" && styles.reviewStepActive]}>{analysisStage === "compai" ? <ActivityIndicator color="#E9D5FF" size="small" /> : <AppText style={styles.reviewStepNumber}>2</AppText>}<AppText style={styles.reviewStepText}>Revisión CompAI</AppText></View>
            </View>
            )}
          </View>
        </View>
      </Modal>

      <Pressable style={({ pressed }) => [styles.mealsLauncher, pressed && styles.launcherPressed]} onPress={() => setMealsVisible(true)}>
        <View style={styles.mealsLauncherIcon}><Ionicons name="restaurant-outline" size={18} color="#D8B4FE" /></View>
        <View style={styles.registerLauncherCopy}><AppText style={styles.registerLauncherTitle}>Comidas de hoy</AppText><AppText style={styles.registerLauncherMeta}>{data.meals.length} registros guardados</AppText></View>
        <Ionicons name="arrow-forward" size={18} color="#C084FC" />
      </Pressable>

      <Modal visible={mealsVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setMealsVisible(false)}>
        <View style={styles.foodFormBackdrop}><View style={styles.foodFormModal}>
          <View style={styles.foodFormHeader}><View><AppText style={styles.foodFormTitle}>Comidas de hoy</AppText><AppText style={styles.foodFormSubtitle}>{data.meals.length} registros</AppText></View><Pressable style={styles.foodFormClose} onPress={() => setMealsVisible(false)}><Ionicons name="close" size={20} color={colors.ink} /></Pressable></View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.foodFormScroll}>
      {data.meals.length === 0 ? (
        <EmptyState
          icon="restaurant-outline"
          title="Sin comidas registradas"
          message="Tu registro nutricional empezará desde cero y se llenará con tus comidas."
        />
      ) : null}
      {data.meals.map((meal) => {
        const category = mealCategoryOverrides[meal.id] ?? null;
        const selectedToneId = category ? mealCategoryColorIds[category] ?? mealCategoryDefaults[category] : "slate";
        const tone = getMealTone(selectedToneId);
        return (
        <View
          key={meal.id}
          style={[styles.meal, { borderColor: tone.border, backgroundColor: tone.card }]}
        >
          <View style={[styles.mealWash, { backgroundColor: tone.wash }]} />
          <View style={[styles.mealAccent, { backgroundColor: tone.main }]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Elegir color de ${mealCategoryLabel[category]}`}
            hitSlop={8}
            style={[styles.mealPaletteButton, { borderColor: tone.border, backgroundColor: tone.wash }]}
            onPress={() => category ? setMealPaletteCategory(category) : setMealCategoryModalId(meal.id)}
          >
            <View style={[styles.mealPaletteDot, { backgroundColor: tone.main }]} />
            <Ionicons name="color-palette-outline" color={tone.main} size={14} />
          </Pressable>
          <View style={styles.mealTopRow}>
            <View style={[styles.foodIcon, { borderColor: tone.border, backgroundColor: tone.main }]}>
              <Ionicons name="restaurant-outline" color={colors.background} size={18} />
            </View>
            <View style={styles.mealMainCopy}>
              <View style={styles.mealNameLine}>
                <AppText style={styles.mealName} numberOfLines={2}>{meal.name}</AppText>
                <Pressable style={[styles.mealStatusPill, !category && styles.mealStatusPending]} onPress={() => setMealCategoryModalId(meal.id)}>
                  <AppText style={[styles.mealStatusText, !category && styles.mealStatusPendingText]}>
                    {category ? mealCategoryLabel[category] : "Elegir tipo"}
                  </AppText>
                </Pressable>
              </View>
              <View style={styles.mealTimePill}>
                <Ionicons name="time-outline" color={colors.muted} size={12} />
                <AppText style={styles.mealTime}>{formatDate(meal.loggedAt)}</AppText>
              </View>
            </View>
            <View style={styles.mealKcalBadge}>
              <AppText style={styles.mealKcalValue}>{meal.calories}</AppText>
              <AppText style={styles.mealKcalLabel}>kcal</AppText>
            </View>
            <Pressable
              style={styles.mealDeleteButton}
              onPress={(event) => {
                event.stopPropagation();
                deleteMeal(meal.id);
              }}
            >
              <Ionicons name="trash-outline" color={colors.danger} size={18} />
            </Pressable>
          </View>
          <View style={styles.mealMacroRow}>
            <View style={styles.mealMacroPill}>
              <Ionicons name="fitness-outline" color={tone.main} size={12} />
              <AppText style={[styles.mealMacroText, { color: tone.main }]}>P {meal.protein}g</AppText>
            </View>
            <View style={styles.mealMacroPill}>
              <Ionicons name="leaf-outline" color={tone.main} size={12} />
              <AppText style={[styles.mealMacroText, { color: tone.main }]}>C {meal.carbs}g</AppText>
            </View>
            <View style={styles.mealMacroPill}>
              <Ionicons name="water-outline" color={tone.main} size={12} />
              <AppText style={[styles.mealMacroText, { color: tone.main }]}>G {meal.fat}g</AppText>
            </View>
            {meal.source ? <View style={styles.mealSourcePill}><AppText style={styles.mealSourceText}>{meal.source}</AppText></View> : null}
          </View>
        </View>
        );
      })}
          </ScrollView>
        </View></View>
      </Modal>

      <Modal visible={!!mealCategoryModalId} transparent animationType="fade" onRequestClose={() => setMealCategoryModalId(null)}>
        <View style={styles.mealPaletteBackdrop}>
          <View style={styles.mealPaletteSheet}>
            <View style={styles.mealPaletteHeader}>
              <View>
                <AppText style={styles.detailEyebrow}>Tipo de comida</AppText>
                <AppText style={styles.mealPaletteTitle}>Elige una categoría</AppText>
              </View>
              <Pressable style={styles.detailClose} onPress={() => setMealCategoryModalId(null)}>
                <Ionicons name="close" color={colors.ink} size={20} />
              </Pressable>
            </View>
            <View style={styles.categoryModalGrid}>
              {mealCategoryOptions.map((category) => {
                const tone = getMealTone(mealCategoryColorIds[category] ?? mealCategoryDefaults[category]);
                return (
                  <Pressable
                    key={category}
                    style={[styles.categoryModalChoice, { borderColor: tone.border, backgroundColor: tone.card }]}
                    onPress={() => {
                      if (mealCategoryModalId) {
                        setMealCategoryOverrides((current) => ({ ...current, [mealCategoryModalId]: category }));
                      }
                      setMealCategoryModalId(null);
                    }}
                  >
                    <View style={[styles.categoryModalIcon, { backgroundColor: tone.main }]}>
                      <Ionicons name="restaurant-outline" color={colors.background} size={17} />
                    </View>
                    <AppText style={styles.categoryModalText}>{mealCategoryLabel[category]}</AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!mealPaletteCategory} transparent animationType="fade" onRequestClose={() => setMealPaletteCategory(null)}>
        <View style={styles.mealPaletteBackdrop}>
          <View style={styles.mealPaletteSheet}>
            <View style={styles.mealPaletteHeader}>
              <View>
                <AppText style={styles.detailEyebrow}>Color por horario</AppText>
                <AppText style={styles.mealPaletteTitle}>
                  {mealPaletteCategory ? mealCategoryLabel[mealPaletteCategory] : "Comida"}
                </AppText>
              </View>
              <Pressable style={styles.detailClose} onPress={() => setMealPaletteCategory(null)}>
                <Ionicons name="close" color={colors.ink} size={20} />
              </Pressable>
            </View>
            <View style={styles.mealPaletteGrid}>
              {mealPalette.map((tone) => {
                const selectedTone = mealPaletteCategory
                  ? (mealCategoryColorIds[mealPaletteCategory] ?? mealCategoryDefaults[mealPaletteCategory]) === tone.id
                  : false;
                return (
                  <Pressable
                    key={tone.id}
                    style={[styles.mealPaletteChoice, { borderColor: selectedTone ? colors.ink : tone.border, backgroundColor: tone.card }]}
                    onPress={() => {
                      if (mealPaletteCategory) {
                        setMealCategoryColorIds((current) => ({ ...current, [mealPaletteCategory]: tone.id }));
                      }
                      setMealPaletteCategory(null);
                    }}
                  >
                    <View style={[styles.mealPaletteChoiceDot, { backgroundColor: tone.main }]} />
                    <AppText style={styles.mealPaletteChoiceText}>{tone.label}</AppText>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.mealCustomColorBox}>
              <Input
                label="Color personalizado"
                value={customMealColor}
                onChangeText={setCustomMealColor}
                placeholder="#FF8A3D"
                autoCapitalize="characters"
              />
              <Pressable
                style={[
                  styles.mealCustomColorButton,
                  normalizeHexColor(customMealColor) ? { backgroundColor: normalizeHexColor(customMealColor) ?? colors.accent } : styles.mealCustomColorButtonDisabled
                ]}
                onPress={() => {
                  const hex = normalizeHexColor(customMealColor);
                  if (!hex || !mealPaletteCategory) return;
                  setMealCategoryColorIds((current) => ({ ...current, [mealPaletteCategory]: hex }));
                  setCustomMealColor("");
                  setMealPaletteCategory(null);
                }}
              >
                <Ionicons name="color-fill-outline" color={colors.background} size={17} />
                <AppText style={styles.mealCustomColorButtonText}>Usar color</AppText>
              </Pressable>
            </View>
            <AppText style={styles.meta}>
              Este color se aplicará a todas las comidas registradas en este horario.
            </AppText>
          </View>
        </View>
      </Modal>

      <Modal visible={plansPanelVisible} transparent animationType="slide" onRequestClose={() => setPlansPanelVisible(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleWrap}>
                <AppText style={styles.detailEyebrow}>Biblioteca nutricional</AppText>
                <AppText style={styles.sheetTitle}>Elige tu plan</AppText>
              </View>
              <Pressable style={styles.detailClose} onPress={() => setPlansPanelVisible(false)}>
                <Ionicons name="close" color={colors.ink} size={20} />
              </Pressable>
            </View>
            <View style={styles.educationNote}>
              <Ionicons name="sparkles-outline" color="#C084FC" size={18} />
              <AppText style={styles.educationText}>Explora el enfoque de cada plan y elige el que mejor encaje con tu objetivo diario.</AppText>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
              {guidelinePlans.map((plan) => {
                const active = selectedPlanId === plan.id;
                return (
                  <Card key={plan.id} style={[styles.planOptionCard, active && styles.planCardActive]} gradientColors={purpleMirrorGradient}>
                    <View style={styles.planOptionHead}>
                      <View style={[styles.planTag, active && styles.planTagActive]}>
                        <AppText style={[styles.planTagText, active && styles.planTagTextActive]}>{active ? "Plan elegido" : plan.etiqueta}</AppText>
                      </View>
                      <AppText style={styles.planDifficulty}>{plan.dificultad}</AppText>
                    </View>
                    <AppText style={styles.planName}>{plan.nombre}</AppText>
                    <AppText style={styles.planObjective}>{plan.objetivoRecomendado}</AppText>
                    <View style={styles.planFacts}>
                      <View style={styles.planFact}>
                        <AppText style={styles.factValue}>{plan.objetivosDiarios.calorias} kcal</AppText>
                        <AppText style={styles.factLabel}>objetivo diario</AppText>
                      </View>
                      <View style={styles.planFact}>
                        <AppText style={styles.factValue}>{plan.objetivosDiarios.comidas}</AppText>
                        <AppText style={styles.factLabel}>comidas</AppText>
                      </View>
                    </View>
                    <View style={styles.planActionsRow}>
                      <Pressable style={styles.secondaryPlanButton} onPress={() => setDetailPlan(plan)}>
                        <Ionicons name="reader-outline" color={colors.ink} size={16} />
                        <AppText style={styles.secondaryPlanButtonText}>Ver detalle</AppText>
                      </Pressable>
                      <Pressable style={[styles.primaryPlanButton, active && styles.primaryPlanButtonActive]} onPress={() => choosePlan(plan.id)}>
                        <Ionicons name={active ? "checkmark-circle" : "add-circle-outline"} color={colors.background} size={16} />
                        <AppText style={styles.primaryPlanButtonText}>Elegir</AppText>
                      </Pressable>
                    </View>
                  </Card>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={recommendedMenuVisible} transparent animationType="slide" onRequestClose={() => setRecommendedMenuVisible(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleWrap}>
                <AppText style={styles.detailEyebrow}>COMPAI · MENÚ PERSONALIZADO</AppText>
                <View style={styles.sheetTitleLine}>
                  {activePlan ? <EmojiText style={styles.sheetTitleEmoji}>{planEmoji(activePlan)}</EmojiText> : null}
                  <AppText style={styles.sheetTitle}>{activePlan ? activePlan.nombre : "Menú"}</AppText>
                </View>
              </View>
              <Pressable style={styles.detailClose} onPress={() => setRecommendedMenuVisible(false)}>
                <Ionicons name="close" color={colors.ink} size={20} />
              </Pressable>
            </View>
            <View style={styles.educationNote}>
              <View style={styles.menuCompAIAvatar}><BotAvatar size={48} emotion="surprise" /></View>
              <View style={styles.menuCompAICopy}><AppText style={styles.menuCompAILabel}>CREADO PARA TU PLAN</AppText><AppText style={styles.educationText}>CompAI ajusta cada comida al enfoque nutricional que elegiste. Puedes cambiar una sugerencia sin modificar las otras.</AppText></View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
              {mealCategoryOptions.map((category) => {
                const recommendation = aiMeals[category];
                const meal = recommendation?.meal;
                const loading = !!aiMealLoading[category];
                const error = aiMealErrors[category];
                const idea: RecommendedMealIdea | null = meal ? {
                  id: `compai-${category}-${meal.name}`,
                  mealId: category,
                  nombre: meal.name,
                  descripcion: meal.description,
                  caloriasAprox: meal.calories,
                  proteinasG: meal.protein,
                  carbohidratosG: meal.carbs,
                  grasasG: meal.fat,
                  foods: meal.foods
                } : null;
                return (
                <Card key={category} style={styles.suggestedMealCard} gradientColors={purpleMirrorGradient}>
                  <View style={styles.aiMealHeader}>
                    <View style={styles.aiMealIdentity}>
                      <View style={styles.dailyMealEmojiBox}>
                        <EmojiText style={styles.dailyMealEmoji}>{mealEmojiByName(category)}</EmojiText>
                      </View>
                      <View style={styles.aiMealCategoryWrap}>
                        <AppText style={styles.aiMealCategory}>{mealCategoryLabel[category]}</AppText>
                        <AppText style={styles.aiMealPlanName}>{activePlan?.nombre}</AppText>
                      </View>
                    </View>
                    {idea ? <View style={styles.aiReadyBadge}><View style={styles.aiReadyDot} /><AppText style={styles.aiReadyText}>LISTO</AppText></View> : null}
                  </View>
                  <View style={styles.aiMealBody}>
                    <AppText style={styles.aiMealTitle}>{loading ? "CompAI está preparando una opción..." : idea?.nombre ?? `Descubre una opción para tu ${category}`}</AppText>
                    {idea ? <AppText style={styles.aiMealDescription}>{idea.descripcion}</AppText> : <AppText style={styles.aiMealEmptyText}>Solicita una recomendación creada especialmente para las metas de tu plan.</AppText>}
                    {recommendation ? <View style={styles.aiReasonBox}><Ionicons name="sparkles" color="#C084FC" size={15} /><View style={styles.aiReasonCopy}><AppText style={styles.aiReasonLabel}>POR QUÉ ENCAJA CONTIGO</AppText><AppText style={styles.aiMealReason}>{recommendation.message}</AppText></View></View> : null}
                    {idea ? <View style={styles.aiMacroRow}>
                      <View style={styles.aiMacroItem}><AppText style={styles.aiMacroValue}>{idea.caloriasAprox}</AppText><AppText style={styles.aiMacroLabel}>kcal</AppText></View>
                      <View style={styles.aiMacroItem}><AppText style={styles.aiMacroValue}>{idea.proteinasG}g</AppText><AppText style={styles.aiMacroLabel}>proteína</AppText></View>
                      <View style={styles.aiMacroItem}><AppText style={styles.aiMacroValue}>{idea.carbohidratosG}g</AppText><AppText style={styles.aiMacroLabel}>carbos</AppText></View>
                      <View style={styles.aiMacroItem}><AppText style={styles.aiMacroValue}>{idea.grasasG}g</AppText><AppText style={styles.aiMacroLabel}>grasas</AppText></View>
                    </View> : null}
                    {idea ? <View><AppText style={styles.aiIngredientsLabel}>INGREDIENTES PRINCIPALES</AppText><View style={styles.suggestedFoodsRow}>
                      {idea.foods.map((food) => (
                        <View key={`${idea.id}-${food}`} style={styles.swapChip}><AppText style={styles.swapChipText}>{food}</AppText></View>
                      ))}
                    </View></View> : null}
                    {error ? <View style={styles.aiInlineError}><Ionicons name="alert-circle-outline" color="#FB7185" size={16} /><AppText style={styles.aiMenuErrorText}>{error}</AppText></View> : null}
                    <View style={styles.aiMealActions}>
                      <Pressable style={[styles.newSuggestionButton, loading && styles.aiGenerateDisabled]} onPress={() => generateAIMeal(category)} disabled={loading}>
                        <Ionicons name={loading ? "hourglass-outline" : "sparkles"} color="#E9D5FF" size={16} />
                        <AppText style={styles.newSuggestionButtonText}>{loading ? "Generando..." : idea ? "Otra recomendación" : "Generar recomendación"}</AppText>
                      </Pressable>
                      {idea ? <Pressable style={styles.useIdeaButton} onPress={() => useRecommendedIdea(idea)}>
                        <Ionicons name="add" color={colors.background} size={18} />
                        <AppText style={styles.useIdeaButtonText}>Registrar</AppText>
                      </Pressable> : null}
                    </View>
                  </View>
                </Card>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!detailPlan} transparent animationType="fade" onRequestClose={() => setDetailPlan(null)}>
        <View style={styles.detailBackdrop}>
          <Card style={styles.detailCard} gradientColors={purpleMirrorGradient}>
            <View style={styles.detailHeader}>
              <View style={styles.detailTitleWrap}>
                <AppText style={styles.detailEyebrow}>{detailPlan?.etiqueta}</AppText>
                <AppText style={styles.detailTitle}>{detailPlan?.nombre}</AppText>
              </View>
              <Pressable style={styles.detailClose} onPress={() => setDetailPlan(null)}>
                <Ionicons name="close" color={colors.ink} size={20} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
              <View style={styles.planExplanationHero}>
                <View style={styles.planExplanationIcon}><Ionicons name="compass-outline" color="#D8B4FE" size={22} /></View>
                <View style={styles.planExplanationCopy}>
                  <AppText style={styles.planExplanationLabel}>EN QUÉ CONSISTE</AppText>
                  <AppText style={styles.detailText}>{detailPlan?.descripcion}</AppText>
                </View>
              </View>
              <View style={styles.planExplanationBlock}>
                <Ionicons name="flag-outline" color="#C084FC" size={18} />
                <View style={styles.planExplanationCopy}>
                  <AppText style={styles.planExplanationTitle}>Para qué está pensado</AppText>
                  <AppText style={styles.detailText}>{detailPlan?.objetivoRecomendado}</AppText>
                </View>
              </View>
              <View style={styles.planExplanationBlock}>
                <Ionicons name="repeat-outline" color="#C084FC" size={18} />
                <View style={styles.planExplanationCopy}>
                  <AppText style={styles.planExplanationTitle}>Cómo se aplica</AppText>
                  <AppText style={styles.detailText}>{detailPlan?.recomendacionGeneral}</AppText>
                </View>
              </View>
              <View style={styles.detailMacroGrid}>
                <View style={styles.detailMacro}><AppText style={styles.detailMacroValue}>{detailPlan?.macros.proteinas}%</AppText><AppText style={styles.factLabel}>Proteínas</AppText></View>
                <View style={styles.detailMacro}><AppText style={styles.detailMacroValue}>{detailPlan?.macros.carbohidratos}%</AppText><AppText style={styles.factLabel}>Carbohidratos</AppText></View>
                <View style={styles.detailMacro}><AppText style={styles.detailMacroValue}>{detailPlan?.macros.grasas}%</AppText><AppText style={styles.factLabel}>Grasas</AppText></View>
              </View>
              <View style={styles.foodLists}>
                <View style={styles.foodList}>
                  <View style={styles.detailFoodTitle}><Ionicons name="checkmark-circle-outline" color={colors.success} size={17} /><AppText style={styles.foodListTitle}>Qué prioriza</AppText></View>
                  <AppText style={styles.text}>{detailPlan?.alimentosRecomendados.join(" · ")}</AppText>
                </View>
                <View style={styles.foodList}>
                  <View style={styles.detailFoodTitle}><Ionicons name="remove-circle-outline" color={colors.accent} size={17} /><AppText style={styles.foodListTitle}>Qué modera</AppText></View>
                  <AppText style={styles.text}>{detailPlan?.alimentosAModerar.join(" · ")}</AppText>
                </View>
              </View>
              <View style={styles.referenceBox}>
                <Ionicons name="library-outline" color={colors.aqua} size={18} />
                <View style={styles.referenceCopy}>
                  <AppText style={styles.integrationName}>{detailPlan?.fuente.nombre}</AppText>
                  <AppText style={styles.integrationText}>{detailPlan?.fuente.descripcion}</AppText>
                </View>
              </View>
            </ScrollView>
            {detailPlan ? (
              <Button style={styles.flatDetailButton} title={selectedPlanId === detailPlan.id ? "Plan elegido" : "Elegir este plan"} onPress={() => choosePlan(detailPlan.id)} />
            ) : null}
          </Card>
        </View>
      </Modal>

      <Modal visible={!!changePlanCandidate} transparent animationType="fade" onRequestClose={() => setChangePlanCandidate(null)}>
        <View style={styles.detailBackdrop}>
          <Card style={styles.changePlanCard} gradientColors={purpleMirrorGradient}>
            <View style={styles.detailHeader}>
              <View style={styles.detailTitleWrap}>
                <AppText style={styles.detailEyebrow}>Cambiar plan</AppText>
                <AppText style={styles.detailTitle}>¿Cambiar al nuevo plan?</AppText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar cambio de plan" style={styles.detailClose} onPress={() => setChangePlanCandidate(null)}>
                <Ionicons name="close" color={colors.ink} size={22} />
              </Pressable>
            </View>
            <AppText style={styles.detailText}>
              Tu meta de calorías y macronutrientes se actualizará inmediatamente. Las comidas que ya registraste hoy se conservarán y el avance se recalculará con el nuevo objetivo.
            </AppText>
            {changePlanCandidate ? <View style={styles.changePlanPreview}>
              <View><AppText style={styles.changePlanPreviewLabel}>NUEVO PLAN</AppText><AppText style={styles.changePlanPreviewName}>{changePlanCandidate.nombre}</AppText></View>
              <View style={styles.changePlanKcal}><AppText style={styles.changePlanKcalValue}>{changePlanCandidate.objetivosDiarios.calorias}</AppText><AppText style={styles.changePlanKcalLabel}>kcal diarias</AppText></View>
            </View> : null}
            <View style={styles.changePlanActions}>
              <Button style={styles.flatDetailButton} title="Cambiar plan ahora" onPress={changePlanToday} />
              <Button title="Cancelar" variant="ghost" onPress={() => setChangePlanCandidate(null)} />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenHeader: { flexDirection: "row", alignItems: "center", minHeight: 78, marginBottom: 7 },
  headerMascot: { width: 92, height: 78, alignItems: "center", justifyContent: "center" },
  headerGlow: { position: "absolute", width: 66, height: 66, borderRadius: 33, backgroundColor: "rgba(168,85,247,0.16)" },
  headerCopy: { flex: 1, minWidth: 0 },
  headerEyebrow: { flexDirection: "row", alignItems: "center", gap: 5 },
  headerEyebrowText: { color: "#C084FC", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  screenTitle: { color: colors.ink, fontSize: 25, lineHeight: 30, fontWeight: "900", marginTop: 2 },
  screenSubtitle: { color: colors.muted, fontSize: 10, marginTop: 1 },
  emojiText: {
    fontFamily: undefined
  },
  inlineTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap"
  },
  inlineEmoji: {
    fontSize: 17
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 7
  },
  goal: {
    marginBottom: 7,
    padding: 11,
    borderWidth: 1,
    borderColor: "rgba(192,132,252,0.48)",
    elevation: 0,
    shadowOpacity: 0
  },
  goalEmpty: {
    gap: 14,
    alignItems: "flex-start",
    marginBottom: 8
  },
  emptyGoalIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(33,230,193,0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  goalEmptyTitle: {
    color: colors.ink,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "900"
  },
  goalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6
  },
  goalCopy: {
    flex: 1,
    minWidth: 180
  },
  activeGoalHead: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap"
  },
  goalLabel: {
    color: "#FFFFFF",
    fontWeight: "800"
  },
  goalPlanName: {
    color: colors.cyan,
    marginTop: 6,
    fontWeight: "900",
    lineHeight: 20
  },
  goalValue: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 4
  },
  goalMuted: {
    color: "#E9D5FF",
    fontSize: 9
  },
  goalCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: "#C084FC",
    backgroundColor: "rgba(168,85,247,0.14)",
    alignItems: "center",
    justifyContent: "center"
  },
  goalPercent: {
    color: colors.ink,
    fontWeight: "900"
  },
  planStatusCard: {
    gap: 6,
    marginBottom: 7,
    padding: 11,
    borderWidth: 1,
    borderColor: "rgba(192,132,252,0.5)",
    elevation: 0,
    shadowOpacity: 0
  },
  planStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  planStatusCopy: {
    flex: 1,
    minWidth: 0
  },
  planStatusTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900"
  },
  planStatusMeta: {
    color: "#E9D5FF",
    fontSize: 8,
    lineHeight: 11,
    marginTop: 3
  },
  changePlanButton: {
    minHeight: 34,
    borderRadius: 11,
    backgroundColor: "#A855F7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 9
  },
  changePlanButtonText: {
    color: colors.background,
    fontWeight: "900"
  },
  planTagActiveSmall: {
    minHeight: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(216,180,254,0.45)",
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    paddingHorizontal: 9
  },
  planLibrary: {
    gap: 12,
    marginBottom: 10
  },
  planLibraryHead: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start"
  },
  libraryIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(33,230,193,0.14)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  planLibraryCopy: {
    flex: 1,
    minWidth: 0
  },
  educationNote: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(192,132,252,0.3)",
    backgroundColor: "rgba(168,85,247,0.09)",
    padding: 11,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start"
  },
  educationText: {
    flex: 1,
    color: colors.text,
    lineHeight: 18,
    fontSize: 12,
    fontWeight: "800"
  },
  menuCompAIAvatar: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "rgba(168,85,247,0.13)" },
  menuCompAICopy: { flex: 1, minWidth: 0 },
  menuCompAILabel: { color: "#C084FC", fontSize: 7, lineHeight: 10, fontWeight: "900", letterSpacing: 0.8, marginBottom: 2 },
  planMessage: {
    color: colors.success,
    fontWeight: "900",
    lineHeight: 20
  },
  nextPlanText: {
    color: colors.cyan,
    fontWeight: "900",
    lineHeight: 20
  },
  planCards: {
    gap: 12,
    paddingRight: 16,
    paddingBottom: 10
  },
  planCard: {
    width: 294,
    minHeight: 340,
    gap: 11,
    justifyContent: "space-between"
  },
  planCardActive: {
    borderColor: colors.aqua,
    backgroundColor: "rgba(33,230,193,0.1)"
  },
  planCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  planTag: {
    minHeight: 26,
    borderRadius: 13,
    backgroundColor: "rgba(124,58,237,0.28)",
    paddingHorizontal: 10,
    justifyContent: "center"
  },
  planTagActive: {
    backgroundColor: "#A855F7"
  },
  planTagText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "900"
  },
  planTagTextActive: {
    color: "#FFFFFF"
  },
  planDifficulty: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  planName: {
    color: colors.ink,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "900"
  },
  planDescription: {
    color: colors.text,
    lineHeight: 20
  },
  planFacts: {
    flexDirection: "row",
    gap: 8
  },
  planFact: {
    flex: 1,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    paddingHorizontal: 10
  },
  factValue: {
    color: colors.ink,
    fontWeight: "900"
  },
  factLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
    fontWeight: "800"
  },
  macroStrip: {
    flexDirection: "row",
    gap: 7,
    flexWrap: "wrap"
  },
  macroStripText: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: "900"
  },
  sourceText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16
  },
  planActions: {
    gap: 8
  },
  planActionsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  secondaryPlanButton: {
    minHeight: 42,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  secondaryPlanButtonText: {
    color: colors.ink,
    fontWeight: "900"
  },
  primaryPlanButton: {
    minHeight: 44,
    borderRadius: 15,
    backgroundColor: colors.cyan,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  primaryPlanButtonActive: {
    backgroundColor: colors.aqua
  },
  primaryPlanButtonText: {
    color: colors.background,
    fontWeight: "900"
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3,5,31,0.72)",
    justifyContent: "flex-end"
  },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "rgba(10,13,48,0.98)",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20
  },
  sheetHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignSelf: "center",
    marginBottom: 12
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12
  },
  sheetTitleWrap: {
    flex: 1,
    minWidth: 0
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 3
  },
  sheetTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 3
  },
  sheetTitleEmoji: {
    fontSize: 22
  },
  sheetScroll: {
    gap: 12,
    paddingTop: 12,
    paddingBottom: 22
  },
  planOptionCard: {
    gap: 10,
    elevation: 0,
    shadowOpacity: 0,
    borderColor: "rgba(192,132,252,0.3)"
  },
  planOptionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  planObjective: {
    color: colors.text,
    lineHeight: 19
  },
  integrationCard: {
    gap: 10,
    marginBottom: 12
  },
  recommendedMenuCard: {
    gap: 7,
    marginBottom: 7,
    padding: 11,
    borderWidth: 1,
    borderColor: "rgba(192,132,252,0.46)",
    elevation: 0,
    shadowOpacity: 0
  },
  recommendedMenuHead: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  },
  recommendedMenuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(192,132,252,0.34)",
    backgroundColor: "rgba(168,85,247,0.24)",
    alignItems: "center",
    justifyContent: "center"
  },
  recommendedMenuEmoji: {
    fontSize: 20
  },
  recommendedMenuCopy: {
    flex: 1,
    minWidth: 0
  },
  recommendedMenuTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900"
  },
  recommendedMenuMeta: {
    color: "#E9D5FF",
    fontSize: 8,
    lineHeight: 19,
    marginTop: 4
  },
  menuPreviewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  menuPreviewPill: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.07)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10
  },
  menuPreviewEmoji: {
    fontSize: 15
  },
  menuPreviewText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  recommendedMenuActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  menuToolsCard: {
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 12
  },
  refreshWideButton: {
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: "#A855F7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12
  },
  aiGenerateDisabled: { opacity: 0.55 },
  refreshWideButtonText: {
    color: colors.background,
    fontWeight: "900"
  },
  todayIdeasBox: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(192,132,252,0.24)",
    backgroundColor: "rgba(168,85,247,0.07)",
    padding: 12
  },
  suggestedMealCard: {
    gap: 0,
    padding: 0,
    borderColor: "rgba(192,132,252,0.3)",
    elevation: 0,
    shadowOpacity: 0
  },
  aiMenuLoadingCard: { minHeight: 90, borderRadius: 17, borderWidth: 1, borderColor: "rgba(192,132,252,0.25)", backgroundColor: "rgba(168,85,247,0.07)", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10 },
  aiMenuLoadingTitle: { color: colors.ink, fontSize: 12, fontWeight: "900" },
  aiMenuLoadingText: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 3, maxWidth: 235 },
  aiMenuErrorCard: { minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: "rgba(251,113,133,0.28)", backgroundColor: "rgba(251,113,133,0.07)", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10 },
  aiMenuErrorText: { flex: 1, color: "#FDA4AF", fontSize: 10, lineHeight: 14, fontWeight: "700" },
  aiMenuRetry: { color: "#C084FC", fontSize: 9, fontWeight: "900" },
  aiMealHeader: { minHeight: 62, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(192,132,252,0.16)", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  aiMealIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  aiMealCategoryWrap: { flex: 1, minWidth: 0 },
  aiMealCategory: { color: "#F3E8FF", fontSize: 14, fontWeight: "900" },
  aiMealPlanName: { color: colors.muted, fontSize: 9, lineHeight: 12, marginTop: 2 },
  aiReadyBadge: { borderRadius: 10, backgroundColor: "rgba(52,211,153,0.1)", borderWidth: 1, borderColor: "rgba(52,211,153,0.22)", paddingHorizontal: 7, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 },
  aiReadyDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.success },
  aiReadyText: { color: colors.success, fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  aiMealBody: { padding: 14, gap: 10 },
  aiMealTitle: { color: colors.ink, fontSize: 17, lineHeight: 21, fontWeight: "900" },
  aiMealDescription: { color: colors.text, fontSize: 12, lineHeight: 18 },
  aiMealEmptyText: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  aiReasonBox: { borderRadius: 14, borderWidth: 1, borderColor: "rgba(192,132,252,0.22)", backgroundColor: "rgba(168,85,247,0.08)", padding: 10, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  aiReasonCopy: { flex: 1, minWidth: 0 },
  aiReasonLabel: { color: "#C084FC", fontSize: 7, fontWeight: "900", letterSpacing: 0.7, marginBottom: 3 },
  aiMealReason: { color: "#DDD6FE", fontSize: 10, lineHeight: 15 },
  aiMacroRow: { flexDirection: "row", gap: 6 },
  aiMacroItem: { flex: 1, minWidth: 0, borderRadius: 12, borderWidth: 1, borderColor: "rgba(192,132,252,0.16)", backgroundColor: "rgba(255,255,255,0.035)", paddingVertical: 8, paddingHorizontal: 4, alignItems: "center" },
  aiMacroValue: { color: "#E9D5FF", fontSize: 12, fontWeight: "900" },
  aiMacroLabel: { color: colors.muted, fontSize: 7, marginTop: 2 },
  aiIngredientsLabel: { color: colors.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.7, marginBottom: 7 },
  aiInlineError: { borderRadius: 12, backgroundColor: "rgba(251,113,133,0.08)", borderWidth: 1, borderColor: "rgba(251,113,133,0.2)", padding: 9, flexDirection: "row", alignItems: "center", gap: 7 },
  aiMealActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 2 },
  newSuggestionButton: { flex: 1, minHeight: 40, borderRadius: 13, borderWidth: 1, borderColor: "rgba(192,132,252,0.4)", backgroundColor: "rgba(126,34,206,0.22)", paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  newSuggestionButtonText: { color: "#E9D5FF", fontSize: 9, fontWeight: "900" },
  suggestedFoodsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  useIdeaButton: {
    alignSelf: "stretch",
    minHeight: 40,
    borderRadius: 13,
    backgroundColor: "#A855F7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 13
  },
  useIdeaButtonText: {
    color: colors.background,
    fontWeight: "900"
  },
  dailyMealCard: {
    marginBottom: 10
  },
  dailyMealConsumed: {
    borderColor: "rgba(36,229,164,0.45)",
    backgroundColor: "rgba(36,229,164,0.12)"
  },
  dailyMealHead: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap"
  },
  dailyMealEmojiBox: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "rgba(255,184,77,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,184,77,0.22)",
    alignItems: "center",
    justifyContent: "center"
  },
  dailyMealEmoji: {
    fontSize: 20
  },
  dailyMealCopy: {
    flex: 1,
    minWidth: 170
  },
  dailyMealTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900"
  },
  consumeButton: {
    minWidth: 104,
    minHeight: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10
  },
  consumeButtonActive: {
    backgroundColor: colors.success,
    borderColor: colors.success
  },
  consumeButtonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  consumeButtonTextActive: {
    color: colors.background
  },
  integrationTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  integrationRow: {
    flexDirection: "row",
    gap: 9,
    alignItems: "flex-start"
  },
  integrationCopy: {
    flex: 1,
    minWidth: 0
  },
  integrationName: {
    color: colors.ink,
    fontWeight: "900"
  },
  integrationText: {
    color: colors.muted,
    lineHeight: 18,
    marginTop: 3,
    fontSize: 12
  },
  swapIdeasBox: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.28)",
    backgroundColor: "rgba(124,58,237,0.12)",
    padding: 12
  },
  swapChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  swapChip: {
    minHeight: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  swapChipText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  chipWithEmoji: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  chipEmoji: {
    fontSize: 13
  },
  meal: {
    marginBottom: 8,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 34,
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    borderColor: "rgba(251,191,119,0.38)",
    borderWidth: 1,
    backgroundColor: "rgba(251,191,119,0.13)"
  },
  mealPaletteButton: {
    position: "absolute",
    right: 8,
    top: 46,
    zIndex: 3,
    borderRadius: 14,
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    borderWidth: 1,
  },
  mealPaletteDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  mealPaletteBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3,5,31,0.9)",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 28
  },
  mealPaletteSheet: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(251,191,119,0.3)",
    backgroundColor: colors.surface,
    padding: 16,
    gap: 14
  },
  mealPaletteHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10
  },
  mealPaletteTitle: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
    marginTop: 3
  },
  mealPaletteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9
  },
  categoryModalGrid: {
    gap: 10
  },
  categoryModalChoice: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12
  },
  categoryModalIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center"
  },
  categoryModalText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  mealPaletteChoice: {
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
  mealPaletteChoiceDot: {
    width: 20,
    height: 20,
    borderRadius: 10
  },
  mealPaletteChoiceText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "900"
  },
  mealCustomColorBox: {
    gap: 10
  },
  mealCustomColorButton: {
    minHeight: 44,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12
  },
  mealCustomColorButtonDisabled: {
    backgroundColor: "rgba(148,163,184,0.22)"
  },
  mealCustomColorButtonText: {
    color: colors.background,
    fontWeight: "900"
  },
  mealWash: {
    position: "absolute",
    right: -34,
    top: -42,
    width: 108,
    height: 108,
    borderRadius: 54,
    opacity: 0.7,
    backgroundColor: "rgba(251,191,119,0.18)"
  },
  mealAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: colors.accent,
    opacity: 0.78
  },
  form: {
    gap: 12,
    marginBottom: 10,
    borderColor: "rgba(192,132,252,0.34)",
    backgroundColor: "rgba(168,85,247,0.035)",
    elevation: 0,
    shadowOpacity: 0
  },
  launcherPressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  registerLauncher: { minHeight: 54, marginBottom: 7, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: "rgba(192,132,252,0.34)", backgroundColor: "rgba(168,85,247,0.06)", flexDirection: "row", alignItems: "center", gap: 9 },
  registerLauncherIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#A855F7" },
  registerLauncherIconPending: { borderWidth: 1, borderColor: "rgba(233,213,255,0.72)", backgroundColor: "#9333EA" },
  registerLauncherCopy: { flex: 1 },
  registerLauncherTitle: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  registerLauncherTitlePending: { color: "#F3E8FF", textShadowColor: "rgba(192,132,252,0.9)", textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } },
  registerLauncherMeta: { color: "#E9D5FF", fontSize: 8, marginTop: 2 },
  mealsLauncher: { minHeight: 54, marginBottom: 8, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: "rgba(192,132,252,0.28)", backgroundColor: "rgba(168,85,247,0.04)", flexDirection: "row", alignItems: "center", gap: 9 },
  mealsLauncherIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(168,85,247,0.15)" },
  foodFormBackdrop: { flex: 1, justifyContent: "center", paddingHorizontal: 18, backgroundColor: "rgba(2,4,12,0.9)" },
  foodFormModal: { width: "100%", maxWidth: 430, maxHeight: "88%", alignSelf: "center", borderRadius: 22, borderWidth: 1, borderColor: "rgba(192,132,252,0.4)", backgroundColor: "#171329", padding: 14 },
  foodFormHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  foodFormTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  foodFormSubtitle: { color: colors.muted, fontSize: 9, marginTop: 2 },
  foodFormClose: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
  foodFormScroll: { paddingBottom: 4 },
  reviewBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 22, backgroundColor: "rgba(2,4,12,0.88)" },
  reviewModal: { width: "100%", maxWidth: 360, borderRadius: 26, borderWidth: 1, borderColor: "rgba(192,132,252,0.42)", backgroundColor: "#171329", paddingHorizontal: 22, paddingVertical: 24, alignItems: "center", overflow: "hidden", elevation: 0, shadowOpacity: 0 },
  reviewGlow: { position: "absolute", top: -60, width: 210, height: 150, borderRadius: 90, backgroundColor: "rgba(168,85,247,0.13)" },
  reviewEyebrow: { color: "#C084FC", fontSize: 8, fontWeight: "900", letterSpacing: 1.1, marginTop: 7 },
  reviewTitle: { color: colors.ink, fontSize: 19, lineHeight: 24, fontWeight: "900", textAlign: "center", marginTop: 5 },
  reviewText: { color: colors.text, fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 7, maxWidth: 290 },
  reviewSteps: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 18 },
  reviewStep: { minHeight: 34, borderRadius: 12, borderWidth: 1, borderColor: "rgba(192,132,252,0.2)", backgroundColor: "rgba(255,255,255,0.04)", paddingHorizontal: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  reviewStepActive: { borderColor: "rgba(192,132,252,0.55)", backgroundColor: "rgba(168,85,247,0.18)" },
  reviewStepComplete: { borderColor: "rgba(52,211,153,0.35)", backgroundColor: "rgba(52,211,153,0.13)" },
  reviewStepText: { color: "#E9D5FF", fontSize: 8, fontWeight: "900" },
  reviewStepNumber: { color: "#E9D5FF", fontSize: 10, fontWeight: "900" },
  reviewStepLine: { flex: 1, maxWidth: 28, height: 1, backgroundColor: "rgba(192,132,252,0.3)" },
  analysisCard: {
    gap: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(33,230,193,0.3)",
    backgroundColor: "rgba(33,230,193,0.08)",
    padding: 13
  },
  analysisHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    flexWrap: "wrap"
  },
  analysisIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.aqua,
    alignItems: "center",
    justifyContent: "center"
  },
  analysisCopy: {
    flex: 1,
    minWidth: 165
  },
  analysisStatusPill: {
    alignSelf: "flex-start",
    minHeight: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    marginBottom: 6
  },
  analysisStatusText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: "900"
  },
  analysisTitle: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900"
  },
  analysisKcalBubble: {
    minWidth: 76,
    minHeight: 64,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,184,77,0.36)",
    backgroundColor: "rgba(255,184,77,0.15)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  analysisKcalValue: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "900"
  },
  analysisKcalLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800"
  },
  analysisMacroGrid: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  analysisMacroChip: {
    flex: 1,
    minWidth: 88,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    paddingHorizontal: 11
  },
  analysisMacroValue: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  analysisMacroLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3
  },
  compactWarning: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,184,77,0.32)",
    backgroundColor: "rgba(255,184,77,0.1)",
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 10
  },
  compactWarningText: {
    flex: 1,
    color: colors.warning,
    lineHeight: 18,
    fontSize: 12,
    fontWeight: "800"
  },
  analysisNote: {
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 10
  },
  analysisNoteText: {
    flex: 1,
    color: colors.text,
    lineHeight: 18,
    fontSize: 12,
    fontWeight: "800"
  },
  saveValidationAlert: { borderRadius: 13, borderWidth: 1, borderColor: "rgba(251,113,133,0.34)", backgroundColor: "rgba(251,113,133,0.1)", padding: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  saveValidationText: { flex: 1, color: "#FDA4AF", fontSize: 11, lineHeight: 16, fontWeight: "800" },
  errorText: {
    color: colors.danger,
    lineHeight: 20,
    fontWeight: "800"
  },
  warningText: {
    color: colors.warning,
    lineHeight: 20,
    fontWeight: "800"
  },
  formTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900"
  },
  categorySelector: {
    gap: 8
  },
  categorySelectorLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  categoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  categoryChip: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10
  },
  categoryChipDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  categoryChipText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  photoDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 2
  },
  photoDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.14)"
  },
  photoDividerText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700"
  },
  photoRow: {
    flexDirection: "row",
    gap: 10
  },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: colors.accent
  },
  photoButtonText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: "900"
  },
  photoButtonSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.055)"
  },
  photoButtonSecondaryText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  macroInputs: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  macroField: {
    flex: 1,
    minWidth: 92
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  mealTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap"
  },
  foodIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(251,191,119,0.38)",
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1
  },
  mealMainCopy: {
    flex: 1,
    minWidth: 0
  },
  mealNameLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8
  },
  mealName: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "900",
    flex: 1,
    minWidth: 0
  },
  mealStatusPill: {
    minHeight: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.38)",
    backgroundColor: "rgba(52,211,153,0.13)",
    justifyContent: "center",
    paddingHorizontal: 8
  },
  mealStatusText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: "900"
  },
  mealStatusPending: {
    borderColor: "rgba(148,163,184,0.3)",
    backgroundColor: "rgba(148,163,184,0.12)"
  },
  mealStatusPendingText: {
    color: colors.muted
  },
  mealTimePill: {
    alignSelf: "flex-start",
    minHeight: 23,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    backgroundColor: "rgba(255,255,255,0.055)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    marginTop: 6
  },
  mealTime: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  mealKcalBadge: {
    minWidth: 58,
    minHeight: 42,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(251,191,119,0.34)",
    backgroundColor: "rgba(251,191,119,0.14)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7
  },
  mealKcalValue: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "900"
  },
  mealKcalLabel: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "800"
  },
  mealDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251,113,133,0.13)",
    borderWidth: 1,
    borderColor: "rgba(251,113,133,0.28)"
  },
  mealMacroRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 9,
    paddingLeft: 45
  },
  mealMacroPill: {
    minHeight: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(251,191,119,0.28)",
    backgroundColor: "rgba(251,191,119,0.13)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    justifyContent: "center",
    paddingHorizontal: 8
  },
  mealMacroText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "900"
  },
  mealSourcePill: {
    minHeight: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.28)",
    backgroundColor: "rgba(96,165,250,0.11)",
    justifyContent: "center",
    paddingHorizontal: 8
  },
  mealSourceText: {
    color: colors.info,
    fontSize: 11,
    fontWeight: "900"
  },
  title: {
    flex: 1,
    minWidth: 140,
    color: colors.ink,
    fontWeight: "800",
    fontSize: 16
  },
  text: {
    color: colors.text,
    marginTop: 7,
    lineHeight: 20
  },
  meta: {
    color: colors.muted,
    marginTop: 8,
    lineHeight: 19
  },
  kcal: {
    color: colors.accent,
    fontWeight: "900"
  },
  detailBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3,5,31,0.84)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16
  },
  detailCard: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "88%",
    gap: 12,
    elevation: 0,
    shadowOpacity: 0,
    borderColor: "rgba(192,132,252,0.34)"
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  detailTitleWrap: {
    flex: 1,
    minWidth: 0
  },
  detailEyebrow: {
    color: colors.aqua,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  detailTitle: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
    marginTop: 4
  },
  detailClose: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.22)",
    backgroundColor: "rgba(251,113,133,0.82)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 0,
    shadowOpacity: 0
  },
  detailScroll: {
    gap: 12,
    paddingBottom: 8
  },
  detailText: {
    color: colors.text,
    lineHeight: 21
  },
  planExplanationHero: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(192,132,252,0.34)",
    backgroundColor: "rgba(126,34,206,0.13)",
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    elevation: 0,
    shadowOpacity: 0
  },
  planExplanationIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(168,85,247,0.16)",
    alignItems: "center",
    justifyContent: "center"
  },
  planExplanationCopy: { flex: 1, minWidth: 0 },
  planExplanationLabel: { color: "#D8B4FE", fontSize: 9, fontWeight: "900", letterSpacing: 1, marginBottom: 4 },
  planExplanationTitle: { color: colors.ink, fontSize: 13, fontWeight: "900", marginBottom: 3 },
  planExplanationBlock: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(192,132,252,0.2)",
    backgroundColor: "rgba(255,255,255,0.035)",
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    elevation: 0,
    shadowOpacity: 0
  },
  detailMacroGrid: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  detailMacro: {
    flex: 1,
    minWidth: 92,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 12,
    elevation: 0,
    shadowOpacity: 0
  },
  detailMacroValue: {
    color: colors.cyan,
    fontSize: 18,
    fontWeight: "900"
  },
  mealReference: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 12
  },
  mealReferenceHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center"
  },
  mealReferenceTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  foodLists: {
    gap: 10
  },
  foodList: {
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(192,132,252,0.18)",
    padding: 12,
    elevation: 0,
    shadowOpacity: 0
  },
  detailFoodTitle: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 6 },
  foodListTitle: {
    color: colors.ink,
    fontWeight: "900",
    marginBottom: 5
  },
  referenceBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(33,230,193,0.28)",
    backgroundColor: "rgba(33,230,193,0.08)",
    padding: 12,
    flexDirection: "row",
    gap: 9,
    alignItems: "flex-start"
  },
  referenceCopy: {
    flex: 1,
    minWidth: 0
  },
  changePlanCard: {
    width: "100%",
    maxWidth: 420,
    gap: 13,
    elevation: 0,
    shadowOpacity: 0,
    borderColor: "rgba(192,132,252,0.34)"
  },
  changePlanPreview: { borderRadius: 16, borderWidth: 1, borderColor: "rgba(192,132,252,0.28)", backgroundColor: "rgba(168,85,247,0.09)", padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  changePlanPreviewLabel: { color: "#C084FC", fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  changePlanPreviewName: { color: colors.ink, fontSize: 14, lineHeight: 18, fontWeight: "900", marginTop: 3, maxWidth: 235 },
  changePlanKcal: { alignItems: "flex-end" },
  changePlanKcalValue: { color: "#E9D5FF", fontSize: 18, fontWeight: "900" },
  changePlanKcalLabel: { color: colors.muted, fontSize: 8, marginTop: 1 },
  changePlanActions: {
    gap: 10
  },
  flatDetailButton: { elevation: 0, shadowOpacity: 0 }
});
