# CompAI

Asistente integral con app móvil, backend en la nube, panel de administración web y un equipo de sensores IoT físico. Ayuda a los usuarios a organizar su vida académica, nutrición/bienestar y monitorear su entorno en tiempo real — todo conversando con un asistente de IA.

## ¿Qué incluye este monorepo?

| Carpeta | Qué es |
| --- | --- |
| [`backend/`](backend/) | API en FastAPI + PostgreSQL (auth, académico, nutrición, sensores IoT, chat con IA, panel de admin) |
| [`frontend/`](frontend/) | App móvil en Expo / React Native (Android/iOS) |
| [`sensor/`](sensor/) | Firmware del equipo IoT en ESP32 (calidad de aire, movimiento, temperatura/humedad) |
| [`web/`](web/) | Landing pública, descarga del APK y panel de administración |
| [`aws/`](aws/) | Infraestructura y despliegue en AWS (ECS Fargate, RDS, Secrets Manager, API Gateway) |
| [`design-system/`](design-system/) | Guía visual del proyecto (colores, tipografía) |

## Documentación

La documentación detallada de cada parte vive en [`docs/`](docs/), que indexa el README específico de cada carpeta (backend, app móvil, firmware, web, AWS y diseño).

## Inicio rápido (desarrollo local)

```bash
# Backend
cd backend && docker-compose up --build

# App móvil
cd frontend && npm install && npx expo start
```

Para el firmware del sensor y el despliegue en AWS, ver sus respectivos READMEs en [`docs/`](docs/).

## Producción

CompAI corre en producción sobre AWS: backend en ECS Fargate detrás de un API Gateway (HTTPS), base de datos en RDS PostgreSQL, y el panel web servido vía AWS Amplify Hosting. Ver [`aws/README.md`](aws/README.md) para el detalle completo de la infraestructura.
