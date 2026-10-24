// Gestión de usuarios de digitalfix-ms-user (/api/user). Mismos campos que
// UserResponseDto / UserRequestDto del backend.

export interface UsuarioSistema {
    id: number;
    // OID de Entra ID; null mientras el usuario pre-asignado no inicia sesión por primera vez.
    userEntraId: string | null;
    email: string;
    nombre: string;
    apellido: string;
    telefono: string | null;
    area: string | null;
    idArea: number | null;
    idEmpresa: number;
    idRol: number;
    estado: string;
    nombreEmpresa: string;
    nombreRol: string;
    codigoRol: string;
    fechaCreacion: string;
    fechaActualizacion: string | null;
}

// Sin userEntraId: el usuario queda pre-asignado por correo y ms-user le vincula
// su cuenta de Entra ID en el primer login, conservando el rol asignado aquí.
export interface UsuarioPeticion {
    email: string;
    nombre: string;
    apellido: string;
    // +56XXXXXXXXX (lo normaliza TelefonoDirective).
    telefono: string | null;
    idArea: number | null;
    idEmpresa: number | null;
    idRol: number | null;
}

export interface AreaSistema {
    id: number;
    nombre: string;
}

export interface RolSistema {
    id: number;
    codigo: string;
    nombre: string;
    descripcion: string | null;
}

export interface EmpresaSistema {
    id: number;
    razonSocial: string;
    rut: string;
    tipoEmpresa: string | null;
}
