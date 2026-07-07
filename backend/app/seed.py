"""
Seeder: pobla la base de datos con datos de ejemplo.
Se ejecuta automáticamente al arrancar la app si la BD está vacía,
y también puede ejecutarse manualmente con `python -m app.seed`.
"""
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine, Base
from app.core.config import settings
from app.core.security import hash_password
from app.models import (
    Usuario, Curso, Tarea, EstadoTarea, PrioridadTarea,
    Recordatorio, TipoRecordatorio, PlanNutricional,
    Comida, RutinaBienestar, SensorData, TipoSensor, SensorSnapshot,
)

logger = logging.getLogger(__name__)


def base_vacia(db: Session) -> bool:
    """Devuelve True si la tabla de usuarios está vacía."""
    return db.query(Usuario).count() == 0


def sembrar_datos(db: Session) -> None:
    """Inserta un conjunto mínimo y coherente de datos de ejemplo."""
    logger.info("📦 Sembrando datos de ejemplo...")
    ahora = datetime.now(timezone.utc)

    # === Usuarios ===
    ana = Usuario(
        nombre="Ana Pérez",
        correo="ana@ejemplo.com",
        password_hash=hash_password("demo12345"),
        preferencias={"tema": "oscuro", "idioma": "es", "notificaciones": True},
    )
    luis = Usuario(
        nombre="Luis Gómez",
        correo="luis@ejemplo.com",
        password_hash=hash_password("demo12345"),
        preferencias={"tema": "claro", "idioma": "es", "notificaciones": False},
    )
    db.add_all([ana, luis])
    db.flush()

    # === Cursos ===
    matematicas = Curso(nombre="Matemáticas Avanzadas",
                       descripcion="Cálculo, álgebra lineal y estadística.")
    programacion = Curso(nombre="Programación Web",
                         descripcion="HTML, CSS, JS y frameworks modernos.")
    historia = Curso(nombre="Historia Universal",
                     descripcion="Eventos clave de la historia mundial.")
    db.add_all([matematicas, programacion, historia])
    db.flush()

    # === Tareas ===
    tareas = [
        Tarea(usuario_id=ana.id, curso_id=matematicas.id,
              titulo="Ejercicios capítulo 3",
              descripcion="Resolver problemas del 1 al 20.",
              fecha_limite=ahora + timedelta(days=3),
              estado=EstadoTarea.pendiente, prioridad=PrioridadTarea.alta),
        Tarea(usuario_id=ana.id, curso_id=programacion.id,
              titulo="Proyecto final React",
              descripcion="Crear una SPA con autenticación.",
              fecha_limite=ahora + timedelta(days=14),
              estado=EstadoTarea.pendiente, prioridad=PrioridadTarea.alta),
        Tarea(usuario_id=luis.id, curso_id=historia.id,
              titulo="Ensayo sobre la Revolución Industrial",
              descripcion="Mínimo 1500 palabras.",
              fecha_limite=ahora + timedelta(days=7),
              estado=EstadoTarea.pendiente, prioridad=PrioridadTarea.media),
        Tarea(usuario_id=luis.id,
              titulo="Comprar libros para el semestre",
              fecha_limite=ahora + timedelta(days=1),
              estado=EstadoTarea.completada, prioridad=PrioridadTarea.baja),
    ]
    db.add_all(tareas)

    # === Recordatorios ===
    recordatorios = [
        Recordatorio(usuario_id=ana.id, tipo=TipoRecordatorio.estudio,
                     titulo="Repasar matemáticas",
                     fecha_hora=ahora + timedelta(hours=5)),
        Recordatorio(usuario_id=ana.id, tipo=TipoRecordatorio.bienestar,
                     titulo="Sesión de meditación",
                     fecha_hora=ahora + timedelta(days=1, hours=8)),
        Recordatorio(usuario_id=luis.id, tipo=TipoRecordatorio.bienestar,
                     titulo="Salir a correr",
                     fecha_hora=ahora + timedelta(hours=18)),
    ]
    db.add_all(recordatorios)

    # === Planes Nutricionales ===
    planes = [
        PlanNutricional(usuario_id=ana.id, tipo_dieta="mediterránea",
                        objetivos="Mantener peso y mejorar energía",
                        descripcion="Énfasis en frutas, verduras, pescado y aceite de oliva."),
        PlanNutricional(usuario_id=luis.id, tipo_dieta="alta en proteínas",
                        objetivos="Ganar masa muscular",
                        descripcion="2200 kcal diarias con 150g de proteína."),
    ]
    db.add_all(planes)

    # === Comidas ===
    comidas = [
        Comida(usuario_id=ana.id, nombre="Ensalada mediterránea",
               calorias=420, proteinas=15, carbohidratos=30, grasas=25,
               fecha=ahora - timedelta(hours=4)),
        Comida(usuario_id=ana.id, nombre="Yogur con frutas",
               calorias=180, proteinas=8, carbohidratos=25, grasas=5,
               fecha=ahora - timedelta(hours=10)),
        Comida(usuario_id=luis.id, nombre="Pollo a la plancha con arroz",
               calorias=650, proteinas=45, carbohidratos=70, grasas=15,
               fecha=ahora - timedelta(hours=3)),
    ]
    db.add_all(comidas)

    # === Rutinas de Bienestar ===
    rutinas = [
        RutinaBienestar(usuario_id=ana.id, actividad="Yoga matutino",
                        duracion_minutos=30, fecha=ahora - timedelta(hours=12)),
        RutinaBienestar(usuario_id=luis.id, actividad="Entrenamiento de fuerza",
                        duracion_minutos=60, fecha=ahora - timedelta(days=1)),
        RutinaBienestar(usuario_id=luis.id, actividad="Correr 5km",
                        duracion_minutos=35, fecha=ahora - timedelta(days=2)),
    ]
    db.add_all(rutinas)

    # === Sensores IoT (equipo real: MPU6050 + CCS811 + DHT11) ===
    sensores = [
        SensorData(usuario_id=ana.id, dispositivo_id="esp32_sensores",
                   tipo_sensor=TipoSensor.MOVIMIENTO, valor=0.084,
                   unidad="m", metadatos={"velocidad_m_s": 0.021}),
        SensorData(usuario_id=ana.id, dispositivo_id="esp32_sensores",
                   tipo_sensor=TipoSensor.CALIDAD_AIRE, valor=480,
                   unidad="ppm", metadatos={"tvoc_ppb": 12}),
        SensorData(usuario_id=ana.id, dispositivo_id="esp32_sensores",
                   tipo_sensor=TipoSensor.AMBIENTE, valor=24.3,
                   unidad="°C", metadatos={"humedad_pct": 55.2}),
    ]
    db.add_all(sensores)

    db.commit()
    logger.info("✅ Datos de ejemplo cargados.")


def sembrar_sensores_si_faltan(db: Session) -> None:
    """Agrega lecturas demo a bases locales creadas antes de incluir sensores."""
    if db.query(SensorData).count() > 0:
        return

    usuario = db.query(Usuario).order_by(Usuario.id.asc()).first()
    if not usuario:
        return

    db.add_all([
        SensorData(usuario_id=usuario.id, dispositivo_id="esp32_sensores",
                   tipo_sensor=TipoSensor.MOVIMIENTO, valor=0.084,
                   unidad="m", metadatos={"velocidad_m_s": 0.021}),
        SensorData(usuario_id=usuario.id, dispositivo_id="esp32_sensores",
                   tipo_sensor=TipoSensor.CALIDAD_AIRE, valor=480,
                   unidad="ppm", metadatos={"tvoc_ppb": 12}),
        SensorData(usuario_id=usuario.id, dispositivo_id="esp32_sensores",
                   tipo_sensor=TipoSensor.AMBIENTE, valor=24.3,
                   unidad="°C", metadatos={"humedad_pct": 55.2}),
    ])
    db.commit()
    logger.info("✅ Lecturas demo de sensores cargadas.")


def asegurar_columna_password() -> None:
    """Agrega password_hash en bases existentes creadas antes de auth real."""
    inspector = inspect(engine)
    if "usuarios" not in inspector.get_table_names():
        return

    columnas = {columna["name"] for columna in inspector.get_columns("usuarios")}
    if "password_hash" in columnas:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE usuarios ADD COLUMN password_hash VARCHAR(255)"))
    logger.info("✅ Columna password_hash agregada a usuarios.")


def asegurar_columnas_dashboard_admin() -> None:
    """Agrega ultimo_acceso/activo en bases existentes creadas antes del dashboard admin."""
    inspector = inspect(engine)
    if "usuarios" not in inspector.get_table_names():
        return

    columnas = {columna["name"] for columna in inspector.get_columns("usuarios")}
    with engine.begin() as conn:
        if "ultimo_acceso" not in columnas:
            conn.execute(text("ALTER TABLE usuarios ADD COLUMN ultimo_acceso TIMESTAMP"))
            logger.info("✅ Columna ultimo_acceso agregada a usuarios.")
        if "activo" not in columnas:
            conn.execute(text("ALTER TABLE usuarios ADD COLUMN activo BOOLEAN NOT NULL DEFAULT 1"))
            logger.info("✅ Columna activo agregada a usuarios.")


def limpiar_datos_sensores_obsoletos() -> None:
    """
    Elimina lecturas/snapshots de sensores sembrados con el mock antiguo
    (wearable de frecuencia cardiaca, oxigenacion, peso, PIR, ultrasonico),
    que ya no corresponden al equipo real (MPU6050 + CCS811 + DHT11).
    """
    inspector = inspect(engine)
    tipos_validos = [tipo.value for tipo in TipoSensor]

    if "sensores_datos" in inspector.get_table_names():
        placeholders = ", ".join(f":t{i}" for i in range(len(tipos_validos)))
        params = {f"t{i}": valor for i, valor in enumerate(tipos_validos)}
        with engine.begin() as conn:
            eliminadas = conn.execute(
                text(f"DELETE FROM sensores_datos WHERE tipo_sensor NOT IN ({placeholders})"),
                params,
            ).rowcount
        if eliminadas:
            logger.info(f"🧹 Eliminadas {eliminadas} lecturas de sensores con tipos obsoletos.")

    if "sensor_snapshots" in inspector.get_table_names():
        # Solo borra snapshots realmente obsoletos (tipos viejos o mas de 3
        # metricas, formato del mock anterior). Los snapshots validos actuales
        # NO se tocan, para no perder el historial guardado por el usuario en
        # cada reinicio del backend.
        eliminados = 0
        with Session(engine) as session:
            for snapshot in session.query(SensorSnapshot).all():
                lecturas = snapshot.lecturas or []
                valido = 1 <= len(lecturas) <= 3 and all(
                    isinstance(item, dict) and item.get("tipo_sensor") in tipos_validos
                    for item in lecturas
                )
                if not valido:
                    session.delete(snapshot)
                    eliminados += 1
            if eliminados:
                session.commit()
        if eliminados:
            logger.info(f"🧹 Eliminados {eliminados} snapshots de sensores con formato obsoleto.")


def asegurar_columna_usuario_curso() -> None:
    """Agrega usuario_id a cursos y asigna cursos antiguos al primer usuario."""
    inspector = inspect(engine)
    if "cursos" not in inspector.get_table_names():
        return

    columnas = {columna["name"] for columna in inspector.get_columns("cursos")}
    if "usuario_id" not in columnas:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE cursos ADD COLUMN usuario_id INTEGER"))
        logger.info("✅ Columna usuario_id agregada a cursos.")

    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE cursos
            SET usuario_id = (SELECT id FROM usuarios ORDER BY id ASC LIMIT 1)
            WHERE usuario_id IS NULL
        """))


def asegurar_columna_documento_curso() -> None:
    """Agrega documento_id a cursos existentes (creados antes de subir documentos)."""
    inspector = inspect(engine)
    if "cursos" not in inspector.get_table_names():
        return

    columnas = {columna["name"] for columna in inspector.get_columns("cursos")}
    if "documento_id" not in columnas:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE cursos ADD COLUMN documento_id INTEGER"))
        logger.info("✅ Columna documento_id agregada a cursos.")


def eliminar_tabla_canvas_obsoleta() -> None:
    """Quita la tabla de la integracion Canvas, reemplazada por subida de documentos."""
    inspector = inspect(engine)
    if "canvas_integrations" in inspector.get_table_names():
        with engine.begin() as conn:
            conn.execute(text("DROP TABLE canvas_integrations"))
        logger.info("🧹 Tabla canvas_integrations eliminada (integración retirada).")


def asegurar_columnas_productividad_tareas() -> None:
    """Agrega campos para Pomodoro y progreso diario en tareas existentes."""
    inspector = inspect(engine)
    if "tareas" not in inspector.get_table_names():
        return

    columnas = {columna["name"] for columna in inspector.get_columns("tareas")}
    with engine.begin() as conn:
      if "estimacion_minutos" not in columnas:
          conn.execute(text("ALTER TABLE tareas ADD COLUMN estimacion_minutos INTEGER DEFAULT 25"))
          logger.info("✅ Columna estimacion_minutos agregada a tareas.")
      if "completada_en" not in columnas:
          conn.execute(text("ALTER TABLE tareas ADD COLUMN completada_en TIMESTAMP"))
          logger.info("✅ Columna completada_en agregada a tareas.")


def asegurar_passwords_demo(db: Session) -> None:
    """Permite que cuentas semilla antiguas sigan entrando con una contraseña real."""
    actualizados = 0
    for usuario in db.query(Usuario).filter(Usuario.password_hash.is_(None)).all():
        usuario.password_hash = hash_password("demo12345")
        actualizados += 1

    if actualizados:
        db.commit()
        logger.info("✅ Passwords iniciales agregados a usuarios existentes.")


def inicializar_bd() -> None:
    """Crea tablas y siembra datos si la BD está vacía."""
    Base.metadata.create_all(bind=engine)
    asegurar_columna_password()
    asegurar_columnas_dashboard_admin()
    limpiar_datos_sensores_obsoletos()
    asegurar_columna_usuario_curso()
    asegurar_columna_documento_curso()
    eliminar_tabla_canvas_obsoleta()
    asegurar_columnas_productividad_tareas()
    db = SessionLocal()
    try:
        if base_vacia(db) and settings.SEED_DEMO_DATA:
            sembrar_datos(db)
        elif base_vacia(db):
            logger.info("ℹ️  Base vacía; datos demo desactivados.")
        else:
            logger.info("ℹ️  La base de datos ya contiene datos, no se sembrará de nuevo.")
            asegurar_passwords_demo(db)
            sembrar_sensores_si_faltan(db)
    finally:
        db.close()


if __name__ == "__main__":
    inicializar_bd()
