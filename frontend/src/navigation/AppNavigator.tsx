import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "../theme/colors";
import { useAuth } from "../hooks/useAuth";
import { AcademicScreen } from "../screens/AcademicScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { NutritionScreen } from "../screens/NutritionScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { SensorsScreen } from "../screens/SensorsScreen";
import { WellnessScreen } from "../screens/WellnessScreen";
import { fontFamily } from "../theme/fonts";
import { AppTabParamList, AuthStackParamList } from "./types";
import { Screen } from "../components/Screen";
import { LoadingState } from "../components/LoadingState";
import { AppText } from "../components/AppText";
import { EyeCareOverlay } from "../components/EyeCareOverlay";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Stack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 10);

  return (
    <>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#C084FC",
        tabBarInactiveTintColor: "#817B9E",
        tabBarStyle: {
          position: "absolute",
          left: 9,
          right: 9,
          bottom: safeBottom,
          height: 66,
          borderTopWidth: 1,
          borderColor: "rgba(148,163,184,0.13)",
          backgroundColor: "transparent",
          borderRadius: 21,
          paddingTop: 6,
          paddingBottom: 6,
          overflow: "hidden",
          shadowColor: "#020617",
          shadowOpacity: 0.42,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 7 },
          elevation: 18
        },
        tabBarBackground: () => <View style={styles.tabBackground}><View style={styles.topHighlight} /></View>,
        tabBarLabelStyle: {
          fontFamily: fontFamily.extrabold,
          fontSize: 8,
          letterSpacing: 0.15,
          marginTop: 1
        },
        tabBarLabel: ({ children }) => <AppText style={styles.tabLabel}>{children}</AppText>,
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<keyof AppTabParamList, keyof typeof Ionicons.glyphMap> = {
            Inicio: "home-outline",
            Academia: "school-outline",
            Nutricion: "restaurant-outline",
            Bienestar: "fitness-outline",
            Sensores: "pulse-outline",
            Perfil: "person-circle-outline"
          };
          return (
            <View style={styles.tabIcon}>
              {focused && <View style={styles.iconGlow} />}
              <Ionicons name={icons[route.name]} color={color} size={focused ? 25 : 22} />
            </View>
          );
        }
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Academia" component={AcademicScreen} />
      <Tab.Screen name="Nutricion" component={NutritionScreen} options={{ title: "Nutrición" }} />
      <Tab.Screen name="Bienestar" component={WellnessScreen} />
      <Tab.Screen name="Sensores" component={SensorsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
    <EyeCareOverlay />
    </>
  );
}

const styles = StyleSheet.create({
  tabBackground: { flex: 1, borderRadius: 21, overflow: "hidden", backgroundColor: "rgba(10,14,29,0.97)" },
  topHighlight: { position: "absolute", top: 0, left: 24, right: 24, height: 1, backgroundColor: "rgba(226,232,240,0.1)" },
  tabIcon: { width: 37, height: 31, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  iconGlow: { position: "absolute", width: 33, height: 33, borderRadius: 17, backgroundColor: "rgba(168,85,247,0.16)", shadowColor: "#C084FC", shadowOpacity: 0.75, shadowRadius: 9, elevation: 4 },
  tabLabel: { color: "#817B9E", fontSize: 8, lineHeight: 10, fontWeight: "800", marginTop: 1 }
});

export function AppNavigator() {
  const { bootstrapping, isAuthenticated } = useAuth();
  if (bootstrapping) return <Screen><LoadingState /></Screen>;
  return isAuthenticated ? <MainTabs /> : <AuthStack />;
}
