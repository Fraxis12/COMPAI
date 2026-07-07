import { createContext, ReactNode, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { AuthSession, LoginCredentials } from "../interfaces/auth.interface";
import { appApi } from "../services/api";
import { Usuario, UserPreferences } from "../interfaces/user.interface";

const SESSION_KEY = "compa.auth.session";

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  loading: boolean;
  bootstrapping: boolean;
  error: string | null;
  clearError: () => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (nombre: string, correo: string, password: string) => Promise<void>;
  updateProfile: (datos: { nombre?: string; preferencias?: UserPreferences }) => Promise<void>;
  setSessionUser: (user: Usuario) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(SESSION_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored) as AuthSession;
        appApi.setAuthToken(parsed.token);
        setSession(parsed);
      })
      .finally(() => setBootstrapping(false));
  }, []);

  const persistSession = async (nextSession: AuthSession) => {
    appApi.setAuthToken(nextSession.token);
    setSession(nextSession);
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(nextSession));
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      loading,
      bootstrapping,
      error,
      clearError() {
        setError(null);
      },
      async login(credentials) {
        setLoading(true);
        setError(null);
        try {
          await persistSession(await appApi.login(credentials));
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
          throw err;
        } finally {
          setLoading(false);
        }
      },
      async register(nombre, correo, password) {
        setLoading(true);
        setError(null);
        try {
          await persistSession(await appApi.register(nombre, correo, password));
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
          throw err;
        } finally {
          setLoading(false);
        }
      },
      async updateProfile(datos) {
        if (!session) return;
        setLoading(true);
        setError(null);
        try {
          const user = await appApi.updateProfile(datos);
          await persistSession({ ...session, user });
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo actualizar el perfil.");
          throw err;
        } finally {
          setLoading(false);
        }
      },
      async setSessionUser(user) {
        if (!session) return;
        await persistSession({ ...session, user });
      },
      logout() {
        appApi.setAuthToken(null);
        setSession(null);
        SecureStore.deleteItemAsync(SESSION_KEY);
        setError(null);
      }
    }),
    [bootstrapping, error, loading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
