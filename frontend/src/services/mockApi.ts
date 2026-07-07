import { MOCK_DELAY_MS } from "../utils/constants";
import { wait } from "../utils/helpers";
import { mockCourses, mockTasks } from "../data/mockAcademic";
import { mockMeals, mockNutritionPlans } from "../data/mockNutrition";
import { mockReminders } from "../data/mockReminders";
import { mockRoutines } from "../data/mockWellness";
import { mockSensorReadings } from "../data/mockSensors";
import { mockUsers } from "../data/mockUsers";
import { LoginCredentials } from "../interfaces/auth.interface";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const mockApi = {
  async login(credentials: LoginCredentials) {
    await wait(MOCK_DELAY_MS);
    const user = mockUsers.find((item) => item.correo === credentials.correo) ?? mockUsers[0];
    return { user: clone(user), token: "mock-session-token" };
  },
  async register(nombre: string, correo: string) {
    await wait(MOCK_DELAY_MS);
    return {
      user: clone({ ...mockUsers[0], id: 2, nombre, correo, creado_en: new Date().toISOString() }),
      token: "mock-session-token"
    };
  },
  async getDashboard() {
    await wait(MOCK_DELAY_MS);
    return clone({
      courses: mockCourses,
      tasks: mockTasks,
      reminders: mockReminders,
      meals: mockMeals,
      routines: mockRoutines,
      sensors: mockSensorReadings,
      plans: mockNutritionPlans
    });
  },
  async getAcademic() {
    await wait(MOCK_DELAY_MS);
    return clone({ courses: mockCourses, tasks: mockTasks });
  },
  async getNutrition() {
    await wait(MOCK_DELAY_MS);
    return clone({ plans: mockNutritionPlans, meals: mockMeals });
  },
  async getWellness() {
    await wait(MOCK_DELAY_MS);
    return clone({ routines: mockRoutines, reminders: mockReminders });
  },
  async getSensors() {
    await wait(MOCK_DELAY_MS);
    return clone(mockSensorReadings);
  }
};

// TODO: Reemplazar este servicio por clientes HTTP reales cuando se conecte el backend.
