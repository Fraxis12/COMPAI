# CompAI

Un asistente que junta en un solo lugar lo académico, la nutrición/bienestar y el monitoreo del ambiente de un estudiante, apoyado en un equipo IoT físico y en Inteligencia Artificial — no una maqueta, ya corre en producción sobre AWS.

## El problema

Los estudiantes suelen manejar su vida académica, su alimentación y su entorno físico con herramientas separadas (o de memoria/papel, cuando no tienen ninguna). Eso baja el rendimiento y hace que cosas como una mala calidad de aire o una temperatura incómoda afecten la concentración sin que nadie lo note, porque no hay forma de medirlas.

## La propuesta

Desde la app, el usuario organiza cursos y tareas, registra sus comidas por texto o con una simple foto (la IA hace el análisis nutricional), sigue rutinas de bienestar, ve en vivo las lecturas de un sensor ESP32 vinculado a su cuenta, y conversa con el asistente CompAI, que ya conoce su información. Un panel web aparte deja al administrador supervisar los dispositivos y los reportes de la app.

## Cómo funciona, en resumen

1. Un equipo **ESP32** (`sensor/`) lee sensores de aire, movimiento y temperatura/humedad, y manda los datos por HTTPS al backend.
2. La **app móvil** (`frontend/`, Expo/React Native) es el punto de entrada del usuario: cuentas, académico, nutrición, bienestar, sensores en vivo y chat con IA.
3. Al abrir la pantalla de Sensores, la app vincula el equipo físico a la cuenta activa — el mismo hardware sirve para distintas personas sin reconfigurarlo.
4. El **backend** (`backend/`, FastAPI + PostgreSQL) centraliza todo: autenticación, análisis nutricional con IA, ingesta de sensores, el chat CompAI (Groq) y el panel de administración.
5. El **panel web** (`web/`) sirve la landing con descarga del APK y un dashboard con métricas en vivo del backend.
6. Todo corre en **AWS** (`aws/`): ECS Fargate + RDS PostgreSQL + Secrets Manager + API Gateway (HTTPS) + Amplify Hosting.

## Estructura del monorepo

| Carpeta | Qué es | README |
| --- | --- | --- |
| [`backend/`](backend/) | API FastAPI + PostgreSQL: auth, académico, nutrición, sensores IoT, chat con IA, admin | [backend/README.md](backend/README.md) |
| [`frontend/`](frontend/) | App móvil Expo / React Native (Android) | [frontend/README.md](frontend/README.md) |
| [`sensor/`](sensor/) | Firmware del equipo IoT en ESP32 (PlatformIO) | [sensor/README.md](sensor/README.md) |
| [`web/`](web/) | Landing pública, descarga del APK y panel de administración | [web/README.md](web/README.md) |
| [`aws/`](aws/) | Infraestructura y despliegue en AWS | [aws/README.md](aws/README.md) |
| [`design-system/`](design-system/) | Guía visual del proyecto (colores, tipografía) | [design-system/compai/MASTER.md](design-system/compai/MASTER.md) |

La documentación de cada parte está indexada en [`docs/`](docs/). El [`informe.md`](informe.md) en la raíz cubre la propuesta completa del proyecto (problema, arquitectura, alcance, viabilidad e impacto).

## Funcionalidades principales

- **Autenticación**: registro/login con JWT, recuperación de contraseña por correo.
- **Académico**: cursos, tareas, recordatorios y documentos por usuario.
- **Nutrición**: registro de comidas con análisis nutricional automático por **texto o foto**.
- **Bienestar**: rutinas personalizadas por usuario.
- **Sensores IoT**: lecturas en vivo (aire, movimiento, temperatura/humedad) desde un ESP32, con **vinculación dinámica** al usuario que abra la pantalla de Sensores.
- **CompAI (chat)**: asistente con IA que responde con el contexto real del usuario.
- **Reportes**: los usuarios reportan incidencias; el administrador las gestiona.
- **Panel de administración**: métricas, gráfico de registros, estado en vivo de los dispositivos y gestión de reportes.

## Inicio rápido (desarrollo local)

```bash
# Backend (Docker, todo incluido: PostgreSQL + API)
cd backend && docker-compose up --build
# API en http://localhost:8000 — docs en /docs

# App móvil
cd frontend && npm install && npx expo start
```

Para el firmware del sensor y el despliegue en AWS, ver [`sensor/README.md`](sensor/README.md) y [`aws/README.md`](aws/README.md).

## Stack técnico

| Componente | Tecnologías |
| --- | --- |
| Backend | Python, FastAPI, PostgreSQL, SQLAlchemy 2, Alembic, Pydantic v2, JWT, Groq (LLM), USDA FoodData Central |
| App móvil | Expo, React Native, TypeScript, React Navigation, expo-secure-store |
| Firmware IoT | ESP32 (PlatformIO/Arduino), CCS811, MPU6050, DHT, ArduinoJson, WiFiManager |
| Web | HTML/CSS/JS estático (landing + panel de administración) |
| Infraestructura | AWS ECS Fargate, RDS, Secrets Manager, API Gateway, Amplify Hosting, SES, ECR |

## Producción

CompAI corre en AWS: backend en ECS Fargate detrás de un API Gateway (HTTPS) que hace de proxy sobre un Load Balancer, base de datos en RDS en subred privada, secretos en Secrets Manager, y el panel web servido vía Amplify Hosting (con S3 de respaldo). Ver [`aws/README.md`](aws/README.md) para el detalle completo.
