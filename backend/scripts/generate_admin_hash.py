from getpass import getpass

from app.core.security import hash_password


if __name__ == "__main__":
    password = getpass("Nueva contraseña administrativa: ")
    confirmation = getpass("Repite la contraseña: ")
    if len(password) < 12:
        raise SystemExit("Usa al menos 12 caracteres.")
    if password != confirmation:
        raise SystemExit("Las contraseñas no coinciden.")
    print(hash_password(password))
