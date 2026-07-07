"""
Proveedor local/offline de traducción con Argos Translate.
"""
from app.core.config import settings


class TranslationServiceError(Exception):
    """Error controlado para mostrar mensajes amigables al usuario."""


class ArgosTranslateProvider:
    name = "Argos Translate"

    def _get_translation(self):
        try:
            from argostranslate import translate
        except ImportError as exc:
            raise TranslationServiceError(
                "Falta instalar Argos Translate en el backend."
            ) from exc

        installed_languages = translate.get_installed_languages()
        spanish = next((language for language in installed_languages if language.code == "es"), None)
        english = next((language for language in installed_languages if language.code == "en"), None)

        if not spanish or not english:
            raise TranslationServiceError(
                "Falta instalar el modelo de traducción español-inglés de Argos Translate."
            )

        translation = spanish.get_translation(english)
        if not translation:
            raise TranslationServiceError(
                "Falta instalar el modelo de traducción español-inglés de Argos Translate."
            )
        return translation

    def translate_to_english(self, text: str, locale: str = "es-PE") -> str:
        translated = self._get_translation().translate(text).strip()
        if not translated:
            raise TranslationServiceError("No pudimos traducir la comida. Intenta escribirla de otra forma.")
        return translated


def get_translation_service() -> ArgosTranslateProvider:
    provider = settings.TRANSLATION_PROVIDER.strip().upper()
    if provider != "ARGOS_TRANSLATE":
        raise TranslationServiceError("Servicio de traducción no configurado.")
    return ArgosTranslateProvider()
