# Despliegue de CompAI en AWS

## Arquitectura recomendada

- ECR: imagen Docker del backend.
- ECS Fargate: API FastAPI privada detrás de un ALB.
- Application Load Balancer: HTTPS público y health check en `/health`.
- RDS PostgreSQL: base de datos en subred privada, sin acceso público.
- Secrets Manager: credenciales y llaves.
- SES: correo de recuperación de contraseña.
- CloudWatch Logs y AWS WAF: observabilidad y límites externos.
- Route 53 + ACM: `api.tudominio.com` con certificado TLS.

La app React Native no se aloja en ECS: se compila con EAS y se distribuye como APK de pruebas o AAB en Google Play.

## Valores que debes reemplazar

En `ecs-task-definition.json`: `AWS_ACCOUNT_ID`, `AWS_REGION` y `tudominio.com`.
En `frontend/eas.json`: `https://api.tudominio.com`.

La clave de Groq que se compartió durante el desarrollo debe revocarse y reemplazarse antes del primer despliegue.

## Preparar secretos

Genera el JWT sin reutilizar contraseñas:

```bash
openssl rand -hex 64
```

Crea en Secrets Manager un secreto JSON llamado `compai/production` con:

```json
{
  "DATABASE_URL": "postgresql://USUARIO:CLAVE@HOST_RDS:5432/compai",
  "SECRET_KEY": "SECRETO_GENERADO",
  "GROQ_API_KEY": "NUEVA_CLAVE",
  "USDA_API_KEY": "CLAVE_USDA",
  "IOT_API_KEYS": "CLAVE_DISPOSITIVO:ID_USUARIO",
  "SMTP_USERNAME": "USUARIO_SES",
  "SMTP_PASSWORD": "CLAVE_SES"
  ,"ADMIN_PASSWORD_HASH": "HASH_GENERADO"
}
```

## Construir y publicar backend

```bash
aws ecr create-repository --repository-name compai-api
aws ecr get-login-password --region AWS_REGION | docker login --username AWS --password-stdin AWS_ACCOUNT_ID.dkr.ecr.AWS_REGION.amazonaws.com
docker build -t compai-api ./backend
docker tag compai-api:latest AWS_ACCOUNT_ID.dkr.ecr.AWS_REGION.amazonaws.com/compai-api:latest
docker push AWS_ACCOUNT_ID.dkr.ecr.AWS_REGION.amazonaws.com/compai-api:latest
```

Registra la definición de tarea después de reemplazar sus marcadores y crea un servicio ECS conectado al ALB. El security group de RDS debe aceptar PostgreSQL únicamente desde el security group de ECS.

## Generar Android

```bash
cd frontend
npx eas-cli login
npx eas-cli init
npx eas-cli build --platform android --profile preview
```

El perfil `preview` genera APK instalable. Para Google Play:

```bash
npx eas-cli build --platform android --profile production
```

El perfil `production` genera AAB.

## Verificación previa

1. `https://api.tudominio.com/health` responde `status: ok`.
2. Registro, login y recuperación de contraseña funcionan con SES.
3. Dos cuentas distintas no pueden leer datos entre sí.
4. CompAI responde y las llaves no aparecen en el APK.
5. Sensores envían con `X-API-Key`; la app móvil consulta con JWT.
