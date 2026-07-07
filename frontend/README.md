# CompAI — App móvil (Expo / React Native)

App móvil del asistente integral CompAI: cuentas de usuario, académico (cursos, tareas, documentos), nutrición (texto y foto), sensores IoT en vivo, rutinas de bienestar y CompAI (asistente con IA).

## Stack

- **Expo SDK 54** + **React Native 0.81** + **TypeScript**
- **React Navigation** (bottom tabs + native stack)
- Context API propio (`AuthContext`) para sesión/JWT
- `expo-secure-store` para guardar el token de forma segura
- `expo-notifications`, `expo-image-picker`, `expo-document-picker`, `@react-native-community/datetimepicker`

## Estructura

```
frontend/
├── App.tsx                  # Entry point
├── src/
│   ├── screens/              # Una pantalla por feature (Sensores, Nutrición, Academia, Chat, etc.)
│   ├── components/            # Componentes reutilizables (Button, Card, BotAvatar, etc.)
│   ├── context/                # AuthContext (sesión, token, usuario activo)
│   ├── navigation/            # AppNavigator (tabs + stacks)
│   ├── services/                # api.ts (cliente HTTP), notifications.ts
│   ├── theme/                    # Colores y estilos compartidos
│   └── types/                     # Tipos TypeScript por dominio
├── app.json                  # Config de Expo (plugins, permisos, icono)
├── eas.json                  # Perfiles de build (development/preview/production) + variables de entorno
└── assets/                    # Imágenes, fuentes, animaciones del bot
```

## Variables de entorno

Configuradas en `.env` (desarrollo local) y en `eas.json` (builds reales):

| Variable | Uso |
| --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | URL del backend (local o el desplegado en AWS) |
| `EXPO_PUBLIC_SENSOR_API_KEY` | API Key del hardware IoT — necesaria para que la app vincule el equipo a la cuenta activa al abrir la pantalla de Sensores |

**Importante:** si esta variable falta en un build de EAS, la vinculación automática del dispositivo IoT no funciona (bug ya corregido — ver `eas.json`).

## Cómo correr en desarrollo

```bash
npm install
npx expo start
```

Escanea el QR con **Expo Go** (Android/iOS), o presiona `a` para abrir en un emulador Android.

## Generar un build real (APK)

```bash
npx eas-cli build --platform android --profile preview
```

Requiere estar logueado en una cuenta de Expo (`npx eas-cli login`) y tener el proyecto inicializado (`npx eas-cli init`, ya hecho en este repo — ver `extra.eas.projectId` en `app.json`).

Si la cola gratuita de EAS está congestionada, también se puede compilar 100% local (sin depender de la nube) instalando el Android SDK de línea de comandos y corriendo:

```bash
npx eas-cli build --platform android --profile preview --local
```

## Notas de diseño

- El backend real (desplegado en AWS) corre sobre HTTP plano detrás de un API Gateway con HTTPS — no depende de dominio propio.
- `expo-build-properties` está configurado con `usesCleartextTraffic: true` porque parte del stack todavía usa endpoints HTTP directos.
- La vinculación del hardware IoT a una cuenta es dinámica: cada vez que un usuario abre la pantalla de Sensores, el equipo físico conectado se reasigna automáticamente a esa cuenta (ver `backend/README.md`).
