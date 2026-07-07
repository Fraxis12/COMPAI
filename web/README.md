# Web pública y administración

- `/`: landing pública y descarga del APK.
- Cinco clics rápidos sobre el logo: abre `/admin-login/`.
- `/admin-login/`: autenticación real contra `POST /admin/login`.
- `/admin/`: dashboard protegido mediante token administrativo guardado en `sessionStorage`.

Antes de publicar:

1. Cambia `API_BASE_URL` en `config.js` por el dominio HTTPS real del backend.
2. Copia el APK generado a `downloads/compai.apk`.
3. Configura `ADMIN_EMAIL` y `ADMIN_PASSWORD_HASH` en AWS Secrets Manager.
4. Genera el hash con `cd backend && python scripts/generate_admin_hash.py`.
5. Añade el dominio web a `ALLOWED_ORIGINS` del backend.

La ocultación de la ruta no sustituye la autenticación. El backend limita intentos y exige un JWT administrativo separado.
