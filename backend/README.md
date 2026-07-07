# CompAI — Backend API

Backend en **Python + FastAPI + PostgreSQL** para CompAI, un asistente integral con funcionalidades académicas, de nutrición/bienestar, sensores IoT en vivo, chat con IA y un panel de administración. Desplegado en producción sobre **AWS** (ECS Fargate + RDS + API Gateway).

## 🧱 Stack

- **Python 3.12** + **FastAPI** (Swagger/OpenAPI integrado)
- **PostgreSQL 16** como base de datos (SQLite disponible para desarrollo local rápido)
- **SQLAlchemy 2** como ORM + **Alembic** para migraciones
- **Pydantic v2** para validación de datos
- **JWT** (OAuth2 password flow) para autenticación de usuarios y de administrador
- **Groq** (LLM) para el asistente conversacional CompAI
- **USDA FoodData Central** para búsqueda nutricional
- **Uvicorn** como servidor ASGI

## 📦 Estructura del proyecto

```
backend/
├── app/
│   ├── core/              # Configuración, seguridad (JWT/hash) y BD (config.py, database.py, security.py)
│   ├── models/            # Modelos SQLAlchemy (una clase por archivo)
│   ├── schemas/           # Schemas Pydantic (validación in/out)
│   ├── services/          # Lógica de negocio (auth, nutrición, sensores, chat, reportes, etc.)
│   ├── routes/            # Endpoints HTTP agrupados por dominio
│   ├── main.py            # App FastAPI (punto de entrada)
│   └── seed.py            # Datos de ejemplo
├── alembic/               # Migraciones de base de datos
├── scripts/               # Utilidades (p. ej. generate_admin_hash.py)
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## 🚀 Cómo ejecutar en desarrollo

### Opción A — Docker (recomendado, todo incluido)

```bash
docker-compose up --build
```

Levanta PostgreSQL y la API en `http://localhost:8000`.

### Opción B — Local con SQLite (rápido)

```bash
cp .env.example .env   # usar sqlite:///./asistente_dev.db
uvicorn app.main:app --reload
```

### Opción C — Local con PostgreSQL

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # editar DATABASE_URL
alembic upgrade head
uvicorn app.main:app --reload
```

## 📚 Documentación de la API

- **Swagger UI**: `/docs`
- **ReDoc**: `/redoc`
- **OpenAPI JSON**: `/openapi.json`
- **Health check**: `/health`

## 🗂️ Módulos principales

| Módulo | Prefijo | Descripción |
| --- | --- | --- |
| **Autenticación** | `/auth` | Registro, login (JWT), recuperación de contraseña por correo (SES) |
| **Usuarios** | `/usuarios` | Perfil y gestión de cuenta |
| **Académico** | `/cursos`, `/tareas`, `/recordatorios` | CRUD de cursos, tareas, recordatorios; consultas por usuario/curso/fecha |
| **Documentos académicos** | `/documentos` | Subida y consulta de archivos académicos por usuario/curso |
| **Nutrición** | `/planes-nutricionales`, `/comidas` | Planes, registro de comidas y **análisis nutricional por texto o foto** (IA + USDA) |
| **Bienestar** | `/rutinas-bienestar` | Rutinas personalizadas por usuario |
| **Sensores IoT** | `/sensores` | Ingesta de lecturas del hardware (`X-API-Key`) y **vinculación dinámica dispositivo↔usuario** |
| **Chat CompAI** | `/chat` | Conversación con el asistente de IA (Groq), con contexto del usuario |
| **Reportes** | `/reportes` | Los usuarios reportan incidencias; el admin las gestiona |
| **Administración** | `/admin` | Login admin, dashboard con métricas, gestión de dispositivos y reportes |

## 🔐 Autenticación

- **Usuarios**: JWT emitido en `POST /auth/login`, enviado como `Authorization: Bearer <token>` en cada request protegido.
- **Administrador**: login separado en `POST /admin/login` contra credenciales guardadas en AWS Secrets Manager (`ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH`, hash pbkdf2 generado con `scripts/generate_admin_hash.py`), devuelve un JWT propio validado por `get_current_admin`.
- **Dispositivos IoT**: autenticación por API Key fija (`X-API-Key`, configurada en `IOT_API_KEYS`), no por usuario — ver sección de sensores.

## 📡 Sensores IoT y vinculación dinámica

El hardware físico no está atado a una cuenta de forma permanente:

1. El equipo ESP32 envía lecturas a `POST /sensores/datos` autenticado con su API Key fija.
2. Cada vez que un usuario abre la pantalla de Sensores en la app, la app llama a `POST /sensores/vincular` con esa misma API Key — el backend reasigna `DispositivoVinculo.usuario_id` al usuario activo (el último que reclama el dispositivo, gana).
3. El dashboard de administrador considera un dispositivo **"en línea"** si tiene una lectura en los últimos 5 minutos (`DISPOSITIVO_EN_LINEA_MINUTOS`), comparando por `usuario_id` vinculado (no por un `dispositivo_id` de hardware, que es solo una etiqueta genérica de tipo de equipo).

Ver también `sensor/README.md` para el firmware.

## 🧠 CompAI (chat con IA)

`POST /chat` envía el mensaje del usuario junto con contexto relevante de su cuenta (tareas, comidas, etc.) a un modelo de Groq, devolviendo una respuesta conversacional. Las llaves de API nunca se embeben en el cliente — todo pasa por el backend.

## 🖥️ Panel de administración

El dashboard (`GET /admin/dashboard`) expone:

- Métricas generales (usuarios, cursos, tareas, comidas, lecturas de sensores).
- Registros de nuevos usuarios de los últimos 14 días (para el gráfico de crecimiento).
- Lista de dispositivos IoT vinculados, su usuario actual y si están en línea.
- Alertas (p. ej. dispositivos vinculados sin lecturas recientes).

`GET/PATCH /admin/reportes` permite listar y cambiar el estado (`pendiente` / `en_revision` / `resuelto`) de los reportes enviados por usuarios desde la app.

## ✅ Validación y relaciones

- **Validación**: cada endpoint valida con Pydantic v2.
- **Foreign keys**: `ondelete=CASCADE` — borrar un usuario elimina en cascada sus tareas, recordatorios, comidas, planes, rutinas, documentos y vínculos de dispositivo.
- **Verificación de existencia**: los servicios verifican relaciones (`usuario_id`, `curso_id`, etc.) antes de crear/actualizar, devolviendo 404 si no existen.

## ☁️ Despliegue

Desplegado en AWS (ECS Fargate + RDS + Secrets Manager + API Gateway como proxy HTTPS gratuito delante del ALB). Ver `aws/README.md` para el detalle completo de infraestructura y pasos de despliegue.

## 🔧 Notas de diseño

- **Separación de capas**: `routes` → `services` → `models`.
- **Schemas vs Modelos**: Pydantic para entrada/salida, SQLAlchemy para persistencia.
- **CORS**: `ALLOWED_ORIGINS` debe incluir cada dominio HTTPS desde el que se sirva el panel web (Amplify, S3, etc.) para evitar bloqueos de "mixed content"/CORS en el navegador.
