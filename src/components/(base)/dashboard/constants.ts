// Tipos de roles disponibles en el sistema (en minúscula, tal como se guardan en Supabase)
export type Rol = 'user' | 'super' | 'admin' | 'rrhh';

// Tipo de un módulo del sistema
export interface Modulo {
  id: string;
  titulo: string;
  descripcion: string;
  ruta: string;
  iconKey: string; // Key de lordicon CDN
  color?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
  categoria: 'Planificación' | 'Administración' | 'Recursos Humanos';
  subgrupo: 'Organización Ministerial' | 'Planificación de Servicio' | 'Formación Espiritual';
  // Si está vacío, lo pueden ver todos los roles. Si es 'TODOS', también.
  rolesPermitidos: Rol[] | 'TODOS';
  // Si es true, solo los usuarios con estado de jefe pueden verlo.
  soloJefe?: boolean;
}

// Fuente de verdad de todos los módulos del sistema NAGÁN
export const TODOS_LOS_MODULOS: Modulo[] = [
  {
    id: 'PLANIFICADOR',
    titulo: 'Planificador de Actividades',
    descripcion: 'Gestión de actividades, grupos y asignaciones.',
    ruta: '/kore/planificador',
    iconKey: 'tqldjjaa',
    categoria: 'Planificación',
    subgrupo: 'Planificación de Servicio',
    rolesPermitidos: 'TODOS',
    soloJefe: true,
  },
  {
    id: 'ALABANZA',
    titulo: 'Departamento de Alabanza',
    descripcion: 'Gestión de actividades del departamento de alabanza.',
    ruta: '/kore/planificador/alabanza',
    iconKey: 'jlhrsjqp',
    categoria: 'Planificación',
    subgrupo: 'Planificación de Servicio',
    rolesPermitidos: 'TODOS',
  },
  {
    id: 'REUNION',
    titulo: 'Reuniones y Eventos',
    descripcion: 'Gestión general de reuniones ministeriales.',
    ruta: '/kore/planificador/reunion',
    iconKey: 'vqkaxtlm',
    categoria: 'Planificación',
    subgrupo: 'Planificación de Servicio',
    rolesPermitidos: 'TODOS',
  },
  {
    id: 'DANZA_DAMAS',
    titulo: 'Departamento de Danza (Damas)',
    descripcion: 'Gestión de actividades del departamento de danza para damas.',
    ruta: '/kore/planificador/danza-damas',
    iconKey: 'qlarekde',
    categoria: 'Planificación',
    subgrupo: 'Planificación de Servicio',
    rolesPermitidos: 'TODOS',
  },
  {
    id: 'DANZA_CABALLEROS',
    titulo: 'Departamento de Danza (Caballeros)',
    descripcion: 'Gestión de actividades del departamento de danza para caballeros.',
    ruta: '/kore/planificador/danza-caballeros',
    iconKey: 'ekcozipi',
    categoria: 'Planificación',
    subgrupo: 'Planificación de Servicio',
    rolesPermitidos: 'TODOS',
  },
  {
    id: 'MULTIMEDIA',
    titulo: 'Departamento de Multimedia',
    descripcion: 'Gestión de actividades del departamento de multimedia.',
    ruta: '/kore/planificador/multimedia',
    iconKey: 'rhrmfnhf',
    categoria: 'Planificación',
    subgrupo: 'Planificación de Servicio',
    rolesPermitidos: 'TODOS',
  },
  {
    id: 'ORGANIZACION',
    titulo: 'Organización',
    descripcion: 'Estructura organizacional, departamentos y puestos.',
    ruta: '/kore/admin',
    iconKey: 'giblkgwf',
    categoria: 'Administración',
    subgrupo: 'Organización Ministerial',
    rolesPermitidos: ['admin', 'super'],
  },
  {
    id: 'ACTIVIDADES_GLOBALES',
    titulo: 'Actividades Globales',
    descripcion: 'Vista general de todas las actividades de todos los departamentos.',
    ruta: '/kore/planificador/admin',
    iconKey: 'dkvquwgz',
    categoria: 'Administración',
    subgrupo: 'Organización Ministerial',
    rolesPermitidos: ['admin', 'super', 'rrhh'],
  },
  {
    id: 'ESCUELAS',
    titulo: 'Escuelas de Aprendizaje Espiritual',
    descripcion: 'Gestión de actividades del ministerio de danza.',
    ruta: '/kore/escuela',
    iconKey: 'nhkwajfc',
    categoria: 'Planificación',
    subgrupo: 'Formación Espiritual',
    rolesPermitidos: 'TODOS',
  },
  {
    id: 'REPORTES',
    titulo: 'Reportes',
    descripcion: 'Centro de reportes y programas ministeriales.',
    ruta: '/kore/reportes',
    iconKey: 'tobsqthh',
    categoria: 'Administración',
    subgrupo: 'Organización Ministerial',
    rolesPermitidos: ['admin', 'super'],
  },
];
