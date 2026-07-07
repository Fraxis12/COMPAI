import { Platform } from "react-native";
import { LoginCredentials } from "../interfaces/auth.interface";
import { Curso, CursoCrear, Tarea, TareaCrear } from "../interfaces/academic.interface";
import { Comida, ComidaCrear, PlanNutricional } from "../interfaces/nutrition.interface";
import { Recordatorio, RecordatorioCrear } from "../interfaces/reminder.interface";
import { SensorData, SensorHistorialLecturaInput, SensorInsight, SensorInsightMetricInput, SensorSnapshot, SensorSnapshotMetric } from "../interfaces/sensor.interface";
import { Usuario } from "../interfaces/user.interface";
import { RutinaBienestar, RutinaBienestarCrear } from "../interfaces/wellness.interface";
import { DocumentoAcademico } from "../interfaces/documento-academico.interface";
import { AINutritionMealRecommendation, AINutritionMenu, AINutritionMenuMeal, AINutritionReview, CuratedNutritionPlan, FoodAnalysisResult, FoodLog, FoodPhotoAnalysisResult } from "../types/nutrition";

const envApiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL;

const DEFAULT_API_URL = Platform.select({
  android: "http://10.0.2.2:8000",
  default: "http://localhost:8000"
});

const API_BASE_URL = (envApiUrl || DEFAULT_API_URL || "http://localhost:8000").replace(/\/$/, "");
let authToken: string | null = null;

type ApiNutritionPlan = {
  id: string;
  name: string;
  description: string;
  recommendedGoal: string;
  caloriesTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  mealsPerDay: number;
  macroDistribution: { protein: number; carbs: number; fat: number };
  source: string;
  difficulty: "Facil" | "Intermedio";
  tag: string;
  generalRecommendation: string;
  meals: Array<{
    id: string;
    name: string;
    description: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  recommendedFoods: string[];
  foodsToModerate: string[];
};

type RequestOptions = RequestInit;

function extractServerMessage(text: string) {
  if (!text) return "";

  try {
    const parsed = JSON.parse(text) as { detail?: unknown; message?: unknown };
    if (typeof parsed.message === "string") {
      return parsed.message;
    }

    if (typeof parsed.detail === "string") {
      return parsed.detail;
    }

    if (Array.isArray(parsed.detail)) {
      return parsed.detail
        .map((item) => {
          if (typeof item?.msg === "string") {
            return item.msg;
          }
          if (typeof item?.message === "string") {
            return item.message;
          }
          return "Revisa los datos ingresados.";
        })
        .join(". ");
    }
  } catch {
    return text;
  }

  return "";
}

function cleanTechnicalMessage(message: string) {
  return message
    .replace(/^API\s+\d+\s+[^:]+:\s*/i, "")
    .replace(/^HTTP\s+\d+[:\s-]*/i, "")
    .replace(/_/g, " ")
    .trim();
}

function isTechnicalMessage(message: string) {
  const value = message.toLowerCase();
  return (
    !value ||
    value.includes("api ") ||
    value.includes("http") ||
    value.includes("failed to fetch") ||
    value.includes("network request failed") ||
    value.includes("load failed") ||
    value.includes("timeout") ||
    value.includes("traceback") ||
    value.includes("internal server error") ||
    value.includes("usda fooddata central respondió") ||
    value.includes("json parse") ||
    value.includes("field required") ||
    value.includes("value is not a valid") ||
    value.includes("string should") ||
    value.includes("input should")
  );
}

function friendlyMessageForStatus(status: number, path: string, serverMessage: string) {
  const cleanMessage = cleanTechnicalMessage(serverMessage);
  const authPath = path.startsWith("/auth/");

  if (path === "/auth/login" && status === 401) {
    return "Correo o contraseña incorrectos. Revisa tus datos e inténtalo otra vez.";
  }

  if (path === "/auth/register" && status === 400 && cleanMessage) {
    return cleanMessage;
  }

  if (path === "/auth/reset-password" && status === 400) {
    return "El código no es válido o ya venció. Solicita uno nuevo e inténtalo otra vez.";
  }

  if (status === 401) {
    return authPath
      ? "No pudimos validar tus datos. Revisa la información e inténtalo otra vez."
      : "Tu sesión venció. Vuelve a iniciar sesión para continuar.";
  }

  if (status === 403) {
    return "No tienes permiso para realizar esta acción.";
  }

  if (status === 404) {
    if (path.includes("/nutrition/analyze-food")) {
      return "No encontramos información suficiente para ese alimento. Puedes probar con una descripción más simple.";
    }
    return "No encontramos esa información. Actualiza la pantalla e inténtalo otra vez.";
  }

  if (status === 409) {
    return cleanMessage && !isTechnicalMessage(cleanMessage)
      ? cleanMessage
      : "Ya existe un registro similar. Revisa la información antes de continuar.";
  }

  if (status === 422) {
    return "Revisa los datos ingresados. Hay un campo incompleto o con formato incorrecto.";
  }

  if (status >= 500) {
    if (path.startsWith("/chat/") && cleanMessage && !isTechnicalMessage(cleanMessage)) {
      return cleanMessage;
    }
    if (path.includes("/nutrition/analyze-food")) {
      return "No pudimos consultar el servicio nutricional en este momento. Inténtalo nuevamente en unos segundos.";
    }
    return "Algo no salió bien en el servidor. Inténtalo nuevamente en unos segundos.";
  }

  if (cleanMessage && !isTechnicalMessage(cleanMessage)) {
    return cleanMessage;
  }

  return "No pudimos completar la acción. Inténtalo nuevamente.";
}

function friendlyNetworkMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message.toLowerCase().includes("aborted") || message.toLowerCase().includes("timeout")) {
    return "La conexión está tardando demasiado. Revisa tu internet e inténtalo otra vez.";
  }

  return "No pudimos conectar con el servidor. Revisa tu internet e inténtalo otra vez.";
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { headers, ...fetchOptions } = options;
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...headers
      }
    });
  } catch (error) {
    throw new Error(friendlyNetworkMessage(error));
  }

  if (!response.ok) {
    const text = await response.text();
    const serverMessage = extractServerMessage(text) || response.statusText;
    throw new Error(friendlyMessageForStatus(response.status, path, serverMessage));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function requestUpload<T>(path: string, formData: FormData): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      // Sin "Content-Type": fetch arma el boundary correcto de multipart/form-data solo.
      headers: {
        Accept: "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      },
      body: formData
    });
  } catch (error) {
    throw new Error(friendlyNetworkMessage(error));
  }

  if (!response.ok) {
    const text = await response.text();
    const serverMessage = extractServerMessage(text) || response.statusText;
    throw new Error(friendlyMessageForStatus(response.status, path, serverMessage));
  }

  return (await response.json()) as T;
}

function mapNutritionPlan(plan: ApiNutritionPlan): CuratedNutritionPlan {
  return {
    id: plan.id,
    nombre: plan.name,
    descripcion: plan.description,
    objetivoRecomendado: plan.recommendedGoal,
    caloriasAproximadas: `${plan.caloriesTarget} kcal`,
    objetivosDiarios: {
      calorias: plan.caloriesTarget,
      proteinasG: plan.proteinTarget,
      carbohidratosG: plan.carbsTarget,
      grasasG: plan.fatTarget,
      comidas: plan.mealsPerDay
    },
    comidasPorDia: plan.mealsPerDay,
    macros: {
      proteinas: plan.macroDistribution.protein,
      carbohidratos: plan.macroDistribution.carbs,
      grasas: plan.macroDistribution.fat
    },
    fuente: { nombre: plan.source, descripcion: plan.source },
    dificultad: plan.difficulty,
    etiqueta: plan.tag,
    recomendacionGeneral: plan.generalRecommendation,
    comidas: plan.meals.map((meal) => ({
      id: meal.id,
      nombre: meal.name,
      descripcion: meal.description,
      caloriasAprox: meal.calories,
      proteinasG: meal.protein,
      carbohidratosG: meal.carbs,
      grasasG: meal.fat
    })),
    alimentosRecomendados: plan.recommendedFoods,
    alimentosAModerar: plan.foodsToModerate
  };
}

export const appApi = {
  baseUrl: API_BASE_URL,

  setAuthToken(token: string | null) {
    authToken = token;
  },

  async login(credentials: LoginCredentials) {
    return request<{ user: Usuario; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        correo: credentials.correo.trim().toLowerCase(),
        password: credentials.password
      })
    });
  },

  async register(nombre: string, correo: string, password: string) {
    const cleanName = nombre.trim();
    const cleanEmail = correo.trim().toLowerCase();

    if (!cleanName) {
      throw new Error("Escribe tu nombre para crear la cuenta.");
    }

    if (!cleanEmail) {
      throw new Error("Escribe tu correo para crear la cuenta.");
    }

    if (password.length < 8) {
      throw new Error("La contraseña debe tener al menos 8 caracteres.");
    }

    return request<{ user: Usuario; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        nombre: cleanName,
        correo: cleanEmail,
        password
      })
    });
  },

  updateProfile(datos: { nombre?: string; correo?: string; preferencias?: Usuario["preferencias"] }) {
    return request<Usuario>("/auth/me", {
      method: "PUT",
      body: JSON.stringify(datos)
    });
  },

  chat(messages: Array<{ role: "user" | "assistant"; content: string }>) {
    return request<{ message: string }>("/chat/completions", {
      method: "POST",
      body: JSON.stringify({ messages })
    });
  },

  getAINutritionMeal(plan: CuratedNutritionPlan, category: AINutritionMenuMeal["category"], preference = "", previousSuggestion = "") {
    return request<AINutritionMealRecommendation>("/chat/nutrition-meal", {
      method: "POST",
      body: JSON.stringify({
        plan_name: plan.nombre,
        plan_description: plan.descripcion,
        plan_goal: plan.objetivoRecomendado,
        plan_guidance: plan.recomendacionGeneral,
        macro_distribution: `${plan.macros.proteinas}% proteínas, ${plan.macros.carbohidratos}% carbohidratos y ${plan.macros.grasas}% grasas`,
        daily_calories: plan.objetivosDiarios.calorias,
        protein_target: plan.objetivosDiarios.proteinasG,
        carbs_target: plan.objetivosDiarios.carbohidratosG,
        fat_target: plan.objetivosDiarios.grasasG,
        recommended_foods: plan.alimentosRecomendados,
        foods_to_moderate: plan.alimentosAModerar,
        preference: preference.trim(),
        category,
        previous_suggestion: previousSuggestion
      })
    });
  },

  getAINutritionMenu(plan: CuratedNutritionPlan, preference = "") {
    return request<AINutritionMenu>("/chat/nutrition-menu", {
      method: "POST",
      body: JSON.stringify({
        plan_name: plan.nombre,
        plan_description: plan.descripcion,
        plan_goal: plan.objetivoRecomendado,
        plan_guidance: plan.recomendacionGeneral,
        macro_distribution: `${plan.macros.proteinas}% proteínas, ${plan.macros.carbohidratos}% carbohidratos y ${plan.macros.grasas}% grasas`,
        daily_calories: plan.objetivosDiarios.calorias,
        protein_target: plan.objetivosDiarios.proteinasG,
        carbs_target: plan.objetivosDiarios.carbohidratosG,
        fat_target: plan.objetivosDiarios.grasasG,
        recommended_foods: plan.alimentosRecomendados,
        foods_to_moderate: plan.alimentosAModerar,
        preference: preference.trim()
      })
    });
  },

  async forgotPassword(correo: string) {
    const cleanEmail = correo.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error("Escribe tu correo para enviarte el código.");
    }

    return request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ correo: cleanEmail })
    });
  },

  async resetPassword(correo: string, codigo: string, nuevaPassword: string) {
    const cleanEmail = correo.trim().toLowerCase();
    const cleanCode = codigo.trim();

    if (!cleanEmail) {
      throw new Error("Escribe el correo de tu cuenta.");
    }

    if (!cleanCode) {
      throw new Error("Escribe el código que recibiste.");
    }

    if (nuevaPassword.length < 8) {
      throw new Error("La nueva contraseña debe tener al menos 8 caracteres.");
    }

    return request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        correo: cleanEmail,
        codigo: cleanCode,
        nueva_password: nuevaPassword
      })
    });
  },

  async getDashboard(usuarioId?: number) {
    const [courses, tasks, reminders, meals, routines, sensors, plans] = await Promise.all([
      this.getCourses(),
      this.getTasks(usuarioId),
      this.getReminders(usuarioId),
      this.getMeals(usuarioId),
      this.getRoutines(usuarioId),
      this.getSensors(),
      this.getPlans(usuarioId)
    ]);

    return { courses, tasks, reminders, meals, routines, sensors, plans };
  },

  async getAcademic(usuarioId?: number) {
    const [courses, tasks] = await Promise.all([
      this.getCourses(),
      this.getTasks(usuarioId)
    ]);

    return { courses, tasks };
  },

  async getNutrition(usuarioId?: number) {
    const [plans, meals] = await Promise.all([this.getPlans(usuarioId), this.getMeals(usuarioId)]);

    return { plans, meals };
  },

  async analyzeFood(text: string, quantity?: string) {
    return request<FoodAnalysisResult>("/nutrition/analyze-food", {
      method: "POST",
      body: JSON.stringify({ text: text.trim(), quantity: quantity?.trim() || null, locale: "es-PE" })
    });
  },

  async analyzeFoodPhoto(foto: { uri: string; name: string; mimeType: string }) {
    const formData = new FormData();
    formData.append("foto", { uri: foto.uri, name: foto.name, type: foto.mimeType } as unknown as Blob);
    const result = await requestUpload<FoodPhotoAnalysisResult>("/nutrition/analyze-food-photo", formData);
    return {
      name: result.name,
      originalText: result.name,
      translatedText: result.name,
      displayName: result.displayName,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      source: result.source,
      confidence: result.confidence,
      isApproximate: result.isApproximate,
      message: result.message
    } satisfies FoodAnalysisResult;
  },

  async reviewNutrition(text: string, quantity: string | undefined, base: FoodAnalysisResult) {
    return request<AINutritionReview>("/chat/review-nutrition", {
      method: "POST",
      body: JSON.stringify({
        food_text: text.trim(),
        quantity: quantity?.trim() || "",
        detected_name: base.displayName || base.originalText || base.name,
        calories: base.calories,
        protein: base.protein,
        carbs: base.carbs,
        fat: base.fat
      })
    });
  },

  async createFoodLog(datos: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    source?: string | null;
  }) {
    return request<FoodLog>("/nutrition/food-logs", {
      method: "POST",
      body: JSON.stringify(datos)
    });
  },

  getFoodLogsToday() {
    return request<FoodLog[]>("/nutrition/food-logs/today");
  },

  async getNutritionPlans() {
    const plans = await request<ApiNutritionPlan[]>("/nutrition/plans");
    return plans.map(mapNutritionPlan);
  },

  async selectNutritionPlan(planId: string, mode: "today" | "tomorrow" = "today") {
    const response = await request<{ activePlan: ApiNutritionPlan | null; nextPlan: ApiNutritionPlan | null; message?: string | null }>("/nutrition/plans/select", {
      method: "POST",
      body: JSON.stringify({ planId, mode })
    });
    return {
      activePlan: response.activePlan ? mapNutritionPlan(response.activePlan) : null,
      nextPlan: response.nextPlan ? mapNutritionPlan(response.nextPlan) : null,
      message: response.message ?? null
    };
  },

  async getActiveNutritionPlan() {
    const response = await request<{ activePlan: ApiNutritionPlan | null; nextPlan: ApiNutritionPlan | null; message?: string | null }>("/nutrition/active-plan");
    return {
      activePlan: response.activePlan ? mapNutritionPlan(response.activePlan) : null,
      nextPlan: response.nextPlan ? mapNutritionPlan(response.nextPlan) : null,
      message: response.message ?? null
    };
  },

  async getWellness(usuarioId?: number) {
    const [routines, reminders] = await Promise.all([
      this.getRoutines(usuarioId),
      this.getReminders(usuarioId)
    ]);

    return { routines, reminders };
  },

  getCourses() {
    return request<Curso[]>("/cursos/");
  },

  createCourse(datos: CursoCrear) {
    return request<Curso>("/cursos/", {
      method: "POST",
      body: JSON.stringify(datos)
    });
  },

  deleteCourse(id: number) {
    return request<void>(`/cursos/${id}`, { method: "DELETE" });
  },

  getTasks(usuarioId?: number) {
    const path = usuarioId ? `/tareas/por-usuario/${usuarioId}` : "/tareas/";
    return request<Tarea[]>(path);
  },

  createTask(datos: TareaCrear) {
    return request<Tarea>("/tareas/", {
      method: "POST",
      body: JSON.stringify(datos)
    });
  },

  getPlans(usuarioId?: number) {
    const path = usuarioId ? `/planes-nutricionales/por-usuario/${usuarioId}` : "/planes-nutricionales/";
    return request<PlanNutricional[]>(path);
  },

  createPlan(datos: {
    tipo_dieta: string;
    objetivos?: string | null;
    descripcion?: string | null;
    usuario_id: number;
  }) {
    return request<PlanNutricional>("/planes-nutricionales/", {
      method: "POST",
      body: JSON.stringify(datos)
    });
  },

  getMeals(usuarioId?: number) {
    const path = usuarioId ? `/comidas/por-usuario/${usuarioId}` : "/comidas/";
    return request<Comida[]>(path);
  },

  createMeal(datos: ComidaCrear) {
    return request<Comida>("/comidas/", {
      method: "POST",
      body: JSON.stringify(datos)
    });
  },

  getRoutines(usuarioId?: number) {
    const path = usuarioId ? `/rutinas-bienestar/por-usuario/${usuarioId}` : "/rutinas-bienestar/";
    return request<RutinaBienestar[]>(path);
  },

  createRoutine(datos: RutinaBienestarCrear) {
    return request<RutinaBienestar>("/rutinas-bienestar/", {
      method: "POST",
      body: JSON.stringify(datos)
    });
  },

  getReminders(usuarioId?: number) {
    const query = usuarioId ? `?usuario_id=${usuarioId}` : "";
    return request<Recordatorio[]>(`/recordatorios/${query}`);
  },

  createReminder(datos: RecordatorioCrear) {
    return request<Recordatorio>("/recordatorios/", {
      method: "POST",
      body: JSON.stringify(datos)
    });
  },

  getSensors() {
    return request<SensorData[]>("/sensores/");
  },

  async getSensorsForUser(usuarioId?: number) {
    const sensors = await this.getSensors();
    return usuarioId ? sensors.filter((sensor) => sensor.usuario_id === usuarioId) : sensors;
  },

  getSensorSnapshots() {
    return request<SensorSnapshot[]>("/sensor-snapshots/");
  },

  saveSensorSnapshot(lecturas: SensorSnapshotMetric[]) {
    return request<SensorSnapshot>("/sensor-snapshots/", { method: "POST", body: JSON.stringify({ lecturas }) });
  },

  deleteSensorSnapshot(id: number) {
    return request<void>(`/sensor-snapshots/${id}`, { method: "DELETE" });
  },

  vincularDispositivo(apiKey: string) {
    return request<{ vinculado: boolean; dispositivo: string }>("/sensores/vincular", {
      method: "POST",
      body: JSON.stringify({ api_key: apiKey })
    });
  },

  getSensorInsight(metricas: SensorInsightMetricInput[], historial: SensorHistorialLecturaInput[] = []) {
    return request<SensorInsight>("/chat/sensor-insight", {
      method: "POST",
      body: JSON.stringify({ metricas, historial })
    });
  },

  reiniciarMovimiento() {
    return request<Usuario>("/sensores/reiniciar-movimiento", { method: "POST" });
  },

  subirDocumentoAcademico(archivo: { uri: string; name: string; mimeType: string }) {
    const formData = new FormData();
    formData.append("archivo", { uri: archivo.uri, name: archivo.name, type: archivo.mimeType } as unknown as Blob);
    return requestUpload<DocumentoAcademico>("/documentos-academicos/", formData);
  },

  getDocumentosAcademicos() {
    return request<DocumentoAcademico[]>("/documentos-academicos/");
  },

  explicarTarea(tareaId: number) {
    return request<{ explicacion: string }>("/chat/explicar-tarea", {
      method: "POST",
      body: JSON.stringify({ tarea_id: tareaId })
    });
  },

  updateTask(id: number, datos: Partial<Tarea>) {
    return request<Tarea>(`/tareas/${id}`, {
      method: "PUT",
      body: JSON.stringify(datos)
    });
  },

  deleteTask(id: number) {
    return request<void>(`/tareas/${id}`, { method: "DELETE" });
  },

  deleteMeal(id: number) {
    return request<void>(`/comidas/${id}`, { method: "DELETE" });
  },

  deletePlan(id: number) {
    return request<void>(`/planes-nutricionales/${id}`, { method: "DELETE" });
  },

  deleteRoutine(id: number) {
    return request<void>(`/rutinas-bienestar/${id}`, { method: "DELETE" });
  },

  deleteReminder(id: number) {
    return request<void>(`/recordatorios/${id}`, { method: "DELETE" });
  }
};
