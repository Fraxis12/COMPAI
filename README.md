<p align="center">
  <img src="frontend/assets/assistant/assistant-avatar-mobile.png" width="120" alt="CompAI">
</p>

<p align="center">
  <img src="docs/color-bar.svg" width="100%" height="6" alt="">
</p>

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

## Arquitectura

![Arquitectura de solución del software — CompAI](docs/architecture-diagram.png)

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

CompAI corre en AWS: backend en ECS Fargate detrás de un API Gateway (HTTPS) que hace de proxy sobre un Load Balancer, base de datos en RDS en subred privada, secretos en Secrets Manager, y el panel web servido vía Amplify Hosting (con S3 de respaldo).

## Cómo desplegarlo en AWS

1. **Crear el repositorio de imágenes y subir el backend:**
   ```bash
   aws ecr create-repository --repository-name compai-api
   aws ecr get-login-password --region AWS_REGION | docker login --username AWS --password-stdin AWS_ACCOUNT_ID.dkr.ecr.AWS_REGION.amazonaws.com
   docker build -t compai-api ./backend
   docker tag compai-api:latest AWS_ACCOUNT_ID.dkr.ecr.AWS_REGION.amazonaws.com/compai-api:latest
   docker push AWS_ACCOUNT_ID.dkr.ecr.AWS_REGION.amazonaws.com/compai-api:latest
   ```
2. **Preparar los secretos** en Secrets Manager (`DATABASE_URL`, `SECRET_KEY`, `GROQ_API_KEY`, `USDA_API_KEY`, `IOT_API_KEYS`, credenciales de SES, `ADMIN_PASSWORD_HASH`).
3. **Levantar la base de datos** en RDS PostgreSQL, en subred privada, con el security group aceptando conexiones solo desde ECS.
4. **Registrar la definición de tarea** (`aws/ecs-task-definition.production.json`) y crear el servicio en **ECS Fargate** detrás de un **Application Load Balancer** (health check en `/health`).
5. **Exponer el backend por HTTPS**: si tienes dominio propio y CloudFront/Route 53 disponibles, úsalos con ACM. Si la cuenta de AWS es nueva y esos servicios están bloqueados (pasa con cuentas recién creadas), usa **API Gateway** (HTTP API, integración `HTTP_PROXY` hacia el ALB) como alternativa gratuita — es lo que usamos en este proyecto.
6. **Publicar el panel web** con **AWS Amplify Hosting** (o S3 como sitio estático de respaldo), apuntando `API_BASE_URL` en `web/config.js` a la URL HTTPS del paso anterior.
7. **Generar el APK/AAB** de la app móvil con EAS, apuntando `EXPO_PUBLIC_API_BASE_URL` (en `frontend/eas.json`) a esa misma URL:
   ```bash
   cd frontend
   npx eas-cli build --platform android --profile preview   # APK de pruebas
   npx eas-cli build --platform android --profile production # AAB para Google Play
   ```
8. **Verificar**: `/health` responde `status: ok`, login/registro/recuperación funcionan, dos cuentas no comparten datos entre sí, el chat responde sin exponer llaves en el APK, y los sensores publican con `X-API-Key` mientras la app consulta con JWT.

Ver [`aws/README.md`](aws/README.md) para el detalle completo (incluye qué valores reemplazar y la generación de secretos).
