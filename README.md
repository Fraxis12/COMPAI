# CompAI

Asistente integral con app móvil, backend en la nube, panel de administración web y un equipo de sensores IoT físico. Ayuda a los usuarios a organizar su vida académica, nutrición/bienestar y monitorear su entorno en tiempo real — todo conversando con un asistente de IA.

## ¿Cómo funciona, en resumen?

1. Un equipo **ESP32** (`sensor/`) lee sensores de aire, movimiento y temperatura/humedad, y envía los datos por HTTPS al backend.
2. La **app móvil** (`frontend/`, Expo/React Native) es el punto de entrada del usuario: cuentas, académico, nutrición (texto y foto), rutinas de bienestar, sensores en vivo y chat con IA.
3. Al abrir la pantalla de Sensores, la app vincula dinámicamente el equipo físico a la cuenta activa — el mismo hardware puede ser usado por distintas personas sin reconfigurarlo.
4. El **backend** (`backend/`, FastAPI + PostgreSQL) centraliza toda la lógica: autenticación JWT, análisis nutricional con IA, ingesta de sensores, chat CompAI (Groq) y el panel de administración.
5. El **panel web** (`web/`) sirve la landing pública con descarga del APK y un dashboard de administración con métricas en vivo del backend.
6. Todo corre en **AWS** (`aws/`): ECS Fargate + RDS PostgreSQL + Secrets Manager + API Gateway (HTTPS) + Amplify Hosting.

## Estructura del monorepo

| Carpeta | Qué es | README |
| --- | --- | --- |
| [`backend/`](backend/) | API FastAPI + PostgreSQL: auth, académico, nutrición, sensores IoT, chat con IA, admin | [backend/README.md](backend/README.md) |
| [`frontend/`](frontend/) | App móvil Expo / React Native (Android/iOS) | [frontend/README.md](frontend/README.md) |
| [`sensor/`](sensor/) | Firmware del equipo IoT en ESP32 (PlatformIO) | [sensor/README.md](sensor/README.md) |
| [`web/`](web/) | Landing pública, descarga del APK y panel de administración | [web/README.md](web/README.md) |
| [`aws/`](aws/) | Infraestructura y despliegue en AWS | [aws/README.md](aws/README.md) |
| [`design-system/`](design-system/) | Guía visual del proyecto (colores, tipografía) | [design-system/compai/MASTER.md](design-system/compai/MASTER.md) |

La documentación detallada de cada parte también está indexada en [`docs/`](docs/).

## Funcionalidades principales

- **Autenticación**: registro/login con JWT, recuperación de contraseña por correo (AWS SES).
- **Académico**: cursos, tareas, recordatorios y documentos académicos por usuario.
- **Nutrición**: registro de comidas y análisis nutricional automático por **texto o foto** (IA + USDA FoodData Central).
- **Bienestar**: rutinas personalizadas por usuario.
- **Sensores IoT**: lecturas en vivo (calidad de aire, movimiento, temperatura/humedad) desde un equipo ESP32 físico, con **vinculación dinámica** dispositivo↔usuario (el equipo se reasigna automáticamente a quien abra la pantalla de Sensores).
- **CompAI (chat)**: asistente conversacional con IA (Groq) que responde con contexto real del usuario (tareas, comidas, etc.); las llaves de API nunca se exponen en el cliente.
- **Reportes**: los usuarios reportan incidencias desde la app; el administrador las gestiona (pendiente / en revisión / resuelto).
- **Panel de administración**: métricas generales, gráfico de registros de usuarios, estado en vivo de los dispositivos IoT vinculados y gestión de reportes.

## Inicio rápido (desarrollo local)

```bash
# Backend (Docker, todo incluido: PostgreSQL + API)
cd backend && docker-compose up --build
# API en http://localhost:8000 — docs en /docs

# App móvil
cd frontend && npm install && npx expo start
```

Para el firmware del sensor (PlatformIO/ESP32) y el despliegue en AWS, ver [`sensor/README.md`](sensor/README.md) y [`aws/README.md`](aws/README.md).

## Stack técnico

| Componente | Tecnologías |
| --- | --- |
| Backend | Python 3.12, FastAPI, PostgreSQL 16, SQLAlchemy 2, Alembic, Pydantic v2, JWT, Groq (LLM), USDA FoodData Central |
| App móvil | Expo SDK 54, React Native 0.81, TypeScript, React Navigation, expo-secure-store |
| Firmware IoT | ESP32 (PlatformIO/Arduino), Adafruit CCS811, MPU6050, DHT, ArduinoJson, WiFiManager |
| Web | HTML/CSS/JS estático (landing + panel de administración) |
| Infraestructura | AWS ECS Fargate, RDS PostgreSQL, Secrets Manager, API Gateway, Amplify Hosting, SES, ECR |

## Producción

CompAI corre en producción sobre AWS: backend en ECS Fargate detrás de un API Gateway (HTTPS) que hace de proxy sobre un Application Load Balancer, base de datos en RDS PostgreSQL en subred privada, secretos en Secrets Manager, y el panel web servido vía AWS Amplify Hosting (con S3 como respaldo). Ver [`aws/README.md`](aws/README.md) para el detalle completo de la arquitectura y los pasos de despliegue.
