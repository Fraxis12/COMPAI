import { Usuario } from "./user.interface";

export interface LoginCredentials {
  correo: string;
  password: string;
}

export interface AuthSession {
  user: Usuario;
  token: string;
}
