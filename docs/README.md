# Documentación de CompAI

Índice de la documentación técnica del proyecto. Cada parte del sistema tiene su propio README con detalle específico:

| Parte | Documento | Contenido |
| --- | --- | --- |
| 🔧 Backend (API) | [`backend/README.md`](../backend/README.md) | Stack FastAPI/PostgreSQL, módulos (auth, académico, nutrición, sensores IoT, chat CompAI, admin), cómo correr en local, autenticación y despliegue |
| 📱 App móvil | [`frontend/README.md`](../frontend/README.md) | Stack Expo/React Native, estructura de carpetas, variables de entorno, cómo correr en desarrollo y generar builds (APK/AAB) |
| 📡 Firmware IoT | [`sensor/README.md`](../sensor/README.md) | Hardware y librerías (ESP32, CCS811, MPU6050, DHT), configuración de WiFi, envío de datos y vinculación dinámica a usuarios |
| 🌐 Web (landing + admin) | [`web/README.md`](../web/README.md) | Landing pública, descarga del APK, acceso oculto al panel de administración |
| ☁️ Infraestructura AWS | [`aws/README.md`](../aws/README.md) | Arquitectura de despliegue (ECS Fargate, RDS, Secrets Manager, API Gateway), variables a reemplazar y pasos de publicación |
| 🎨 Sistema de diseño | [`design-system/compai/MASTER.md`](../design-system/compai/MASTER.md) | Paleta de colores, tipografía (Baloo 2 / Comic Neue) y lineamientos visuales |

## Cómo está organizado el proyecto

```
COMPAIA/
├── backend/         # API FastAPI (Python)
├── frontend/         # App móvil (Expo / React Native)
├── sensor/            # Firmware del equipo IoT (ESP32 / PlatformIO)
├── web/                # Landing pública + panel de administración
├── aws/                 # Infraestructura y despliegue en AWS
├── design-system/        # Guía visual del proyecto
└── docs/                   # Este índice de documentación
```

## Flujo de datos, en resumen

1. El equipo **ESP32** (`sensor/`) lee sensores y envía datos al **backend** vía HTTPS (API Gateway → ALB → ECS Fargate).
2. La **app móvil** (`frontend/`) consume la misma API para todo: auth, académico, nutrición, sensores y chat con IA.
3. Cuando un usuario abre la pantalla de Sensores en la app, el dispositivo físico se vincula dinámicamente a esa cuenta.
4. El **panel web** (`web/`) sirve la landing pública (descarga del APK) y un dashboard de administración con métricas en vivo del backend.
5. Todo corre sobre **AWS** (`aws/`): RDS PostgreSQL, Secrets Manager, ECS Fargate, API Gateway y Amplify Hosting / S3 para el sitio web.
