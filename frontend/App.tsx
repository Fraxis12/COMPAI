import "react-native-gesture-handler";
import { LogBox } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import {
  JosefinSans_300Light,
  JosefinSans_400Regular,
  JosefinSans_500Medium,
  JosefinSans_600SemiBold
} from "@expo-google-fonts/josefin-sans";
import { AuthProvider } from "./src/context/AuthContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { colors } from "./src/theme/colors";
import { initializeNotifications } from "./src/services/notifications";
import { useEffect } from "react";
import { EyeCareOverlay } from "./src/components/EyeCareOverlay";

// Aviso esperado de Expo Go (SDK 53+): las notificaciones push remotas no
// estan disponibles ahi, pero las locales (recordatorios) si funcionan bien.
// Se oculta solo este mensaje puntual, sin afectar otros errores reales.
LogBox.ignoreLogs(["expo-notifications: Android Push notifications"]);

export default function App() {
  const [fontsLoaded] = useFonts({
    JosefinSans_300Light,
    JosefinSans_400Regular,
    JosefinSans_500Medium,
    JosefinSans_600SemiBold
  });

  useEffect(() => {
    initializeNotifications().catch(() => undefined);
  }, []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor={colors.background} />
          <AppNavigator />
          <EyeCareOverlay />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
