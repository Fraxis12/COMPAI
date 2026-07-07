import asyncio
import time
from collections import defaultdict, deque

from fastapi.responses import JSONResponse


class SensitiveRouteRateLimitMiddleware:
    """Límite básico por IP; AWS WAF debe ser la primera capa en producción."""

    def __init__(self, app):
        self.app = app
        self._requests: dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        path = scope.get("path", "")
        if path.startswith("/chat/"):
            limit, window = 30, 60
        elif path in {"/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password", "/admin/login"}:
            limit, window = 10, 60
        else:
            await self.app(scope, receive, send)
            return

        headers = {key.decode("latin1").lower(): value.decode("latin1") for key, value in scope.get("headers", [])}
        forwarded = headers.get("x-forwarded-for", "")
        client = scope.get("client")
        client_ip = forwarded.split(",", 1)[0].strip() or (client[0] if client else "unknown")
        key = f"{client_ip}:{path}"
        now = time.monotonic()
        async with self._lock:
            bucket = self._requests[key]
            while bucket and bucket[0] <= now - window:
                bucket.popleft()
            if len(bucket) >= limit:
                response = JSONResponse(status_code=429, content={"detail": "Demasiadas solicitudes. Inténtalo en un momento."})
                await response(scope, receive, send)
                return
            bucket.append(now)
        await self.app(scope, receive, send)
