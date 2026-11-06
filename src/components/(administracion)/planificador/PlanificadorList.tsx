'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plus, Search, Calendar as CalendarIcon,
  SearchX, LayoutGrid, ArrowLeft, Building2, ChevronDown, ChevronRight, ChevronLeft, Users, Filter, ClipboardList, Music, BarChart, BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { Planificador, Perfil } from '@/components/(administracion)/planificador/lib/zod';
import { useGestorPlanificador } from '@/components/(administracion)/planificador/lib/hooks';
import PlanificadorItem from './PlanificadorItem';
import NuevoPlanificador from './modals/NuevoPlanificador';
import GestorEquipos from './modals/GestorEquipos';
import RegistroSustituciones from './modals/RegistroSustituciones';
import RegistroAlabanzas from './modals/RegistroAlabanzas';
import CalendarioModulo from '@/components/(administracion)/common/CalendarioModulo';
import { smoothScrollToElement } from '@/lib/scroll-utils';

type DeptoEquipo = {
  id: string;
  nombre: string;
  miembros: string[];
  parent_id?: string | null;
};

interface Props {
  initialData: {
    planificadores: Planificador[];
    usuarios: Perfil[];
    perfil: Perfil;
    departamentosEquipo?: DeptoEquipo[];
    isJefe?: boolean;
    tiposServicio?: string[];
  };
  tipoVista: 'mis_actividades' | 'mi_equipo' | 'todas';
  modulo: 'alabanza' | 'danza' | 'danza-damas' | 'danza-caballeros' | 'multimedia' | 'todas' | 'reunion' | string;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const TIPOS_SERVICIO = [
  { value: '', label: 'Todos los servicios' },
  { value: 'servicio', label: 'Servicio' },
  { value: 'ensayo', label: 'Ensayo' },
  { value: 'servicio_especial', label: 'Servicio Especial' },
];

const getEstadoCalculado = (fechaISO: string | null | undefined) => {
  if (!fechaISO) return 'Sin fecha';

  const ahora = new Date();
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

  const fecha = new Date(fechaISO);
  const fechaSoloDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

  if (fechaSoloDia.getTime() === hoy.getTime()) return 'Para hoy';
  if (fechaSoloDia.getTime() < hoy.getTime()) return 'Terminados';
  return 'Próximos';
};

export default function PlanificadorList({ initialData, tipoVista, modulo }: Props) {
  const { data } = useGestorPlanificador(tipoVista, modulo, initialData);

  const planificadores = (data?.planificadores || []) as Planificador[];
  const usuarios = (data?.usuarios || []) as Perfil[];
  const perfil = (data?.perfil || initialData.perfil) as Perfil;
  const departamentosEquipo = (data?.departamentosEquipo || initialData.departamentosEquipo || []) as DeptoEquipo[];
  const isJefe = data?.isJefe ?? initialData.isJefe ?? false;

  // --- ESTADOS ---
  const [busqueda, setBusqueda] = useState('');

  // Estado para el filtro de Tipo de Servicio
  const [filtroTipo, setFiltroTipo] = useState('');

  const [filtroEstado, setFiltroEstado] = useState<string>(() => {
    const p = initialData.planificadores || [];
    if (p.some(p => getEstadoCalculado(p.due_date) === 'Para hoy')) return 'Para hoy';
    if (p.some(p => getEstadoCalculado(p.due_date) === 'Próximos')) return 'Próximos';
    if (p.some(p => getEstadoCalculado(p.due_date) === 'Terminados')) return 'Terminados';
    return '';
  });

  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [filtroVista, setFiltroVista] = useState<'TODAS' | 'MÍAS'>('TODAS');
  const [paginaTabla, setPaginaTabla] = useState(1);
  const [filtroDepto, setFiltroDepto] = useState<string>('todos');
  const [isDeptoMenuOpen, setIsDeptoMenuOpen] = useState(false);
  const ITEMS_POR_PAGINA = 5;
  const tablaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPaginaTabla(1);
  }, [mesSeleccionado, anioSeleccionado, diaSeleccionado, filtroEstado, filtroTipo, busqueda]);

  const formatFechaTabla = (isoStr: string | null | undefined) => {
    if (!isoStr) return 'Sin fecha';
    const d = new Date(isoStr);
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const diaSemana = dias[d.getDay()];
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = String(d.getFullYear()).slice(-2);
    
    let hora = '';
    if (isoStr.includes('T')) {
      const hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      hora = `, ${String(h12).padStart(2, '0')}:${minutes} ${ampm}`;
    }
    return `${diaSemana} ${dia}/${mes}/${anio}${hora}`;
  };

  const getCategoriaBadge = (status: string | null | undefined, modulo: string | null | undefined) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'servicio' || s === 'culto') {
      return {
        label: 'Servicio',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
      };
    }
    if (s === 'servicio_especial' || s === 'especial') {
      return {
        label: 'Servicio Especial',
        className: 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
      };
    }
    if (s === 'ensayo') {
      return {
        label: 'Ensayo',
        className: 'bg-purple-50 text-purple-700 border border-purple-300 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30'
      };
    }
    if (s === 'reunion') {
      return {
        label: 'Reunión',
        className: 'bg-sky-50 text-sky-700 border border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30'
      };
    }
    return {
      label: s ? s.toUpperCase() : (modulo ? modulo.toUpperCase() : 'Actividad'),
      className: 'bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
    };
  };

  const formatFullDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const opciones: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    return dateObj.toLocaleDateString('es-ES', opciones);
  };

  const esGlobal = modulo === 'todas';
  const userRole = (perfil?.rol || '').toLowerCase().trim();
  const canViewAll = (userRole === 'admin' || userRole === 'super') && modulo === 'todas';

  const planificadoresBase = useMemo(() => {
    if (!canViewAll || filtroVista === 'TODAS') return planificadores;
    return planificadores.filter(p =>
      p.integrantes?.some(i => i.usuario_id === perfil.id) ||
      p.created_by === perfil.id ||
      (p as any).assigned_to === perfil.id
    );
  }, [planificadores, canViewAll, filtroVista, perfil.id]);

  // Si ya no hay próximos en el mes seleccionado, mostrar los terminados automáticamente
  const prevMesAnioRef = useRef(`${mesSeleccionado}-${anioSeleccionado}`);
  useEffect(() => {
    const enMes = planificadoresBase.filter(p => {
      if (!p.due_date) return false;
      const d = new Date(p.due_date);
      return d.getMonth() === mesSeleccionado && d.getFullYear() === anioSeleccionado;
    });

    const hasHoy = enMes.some(p => getEstadoCalculado(p.due_date) === 'Para hoy');
    const hasProximos = enMes.some(p => getEstadoCalculado(p.due_date) === 'Próximos');
    const hasTerminados = enMes.some(p => getEstadoCalculado(p.due_date) === 'Terminados');

    const currentKey = `${mesSeleccionado}-${anioSeleccionado}`;
    const monthChanged = prevMesAnioRef.current !== currentKey;
    prevMesAnioRef.current = currentKey;

    if (monthChanged) {
      if (hasProximos) {
        setFiltroEstado('Próximos');
      } else if (hasHoy) {
        setFiltroEstado('Para hoy');
      } else if (hasTerminados) {
        setFiltroEstado('Terminados');
      } else {
        setFiltroEstado('');
      }
    } else {
      if (filtroEstado === 'Próximos' && !hasProximos && hasTerminados) {
        setFiltroEstado('Terminados');
      }
    }
  }, [mesSeleccionado, anioSeleccionado, planificadoresBase, filtroEstado]);

  const eventosPorFecha = useMemo(() => {
    const map = new Map<string, number>();
    planificadoresBase.forEach((p) => {
      if (!p.due_date) return;
      const d = new Date(p.due_date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      map.set(dateStr, (map.get(dateStr) || 0) + 1);
    });
    return map;
  }, [planificadoresBase]);

  const calendarStats = useMemo(() => {
    let servicios = 0;
    let reuniones = 0;
    planificadoresBase.forEach(p => {
      if (!p.due_date) return;
      const d = new Date(p.due_date);
      if (d.getMonth() === mesSeleccionado && d.getFullYear() === anioSeleccionado) {
        const s = (p.status || "").toLowerCase();
        if (['servicio', 'culto', 'ensayo', 'servicio_especial', 'especial'].includes(s)) {
          servicios++;
        } else {
          reuniones++;
        }
      }
    });
    return { servicios, reuniones };
  }, [planificadoresBase, mesSeleccionado, anioSeleccionado]);

  useEffect(() => {
    if (diaSeleccionado) {
      const deptosConActividades: Record<string, boolean> = { 'directas': true };
      departamentosEquipo.forEach(d => {
        deptosConActividades[d.id] = true;
      });
      setExpandedDeptos(prev => ({ ...prev, ...deptosConActividades }));
    }
  }, [diaSeleccionado, departamentosEquipo]);

  const searchParams = useSearchParams();
  const actividadIdParam = searchParams.get('actividadId');

  useEffect(() => {
    if (!actividadIdParam || !planificadores || planificadores.length === 0) return;

    const target = planificadores.find(p => p.id === actividadIdParam);
    if (target) {
      if (target.due_date) {
        const d = new Date(target.due_date);
        setMesSeleccionado(d.getMonth());
        setAnioSeleccionado(d.getFullYear());
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setDiaSeleccionado(`${y}-${m}-${day}`);
        const estado = getEstadoCalculado(target.due_date);
        setFiltroEstado(estado);
      }
      setFiltroTipo('');
      setBusqueda('');
      setExpandedId(actividadIdParam);

      const targetDepto = departamentosEquipo.find(d =>
        d.miembros.includes(target.created_by || '') || (target as any).departamento_id === d.id
      );
      if (targetDepto) {
        setExpandedDeptos(prev => ({ ...prev, [targetDepto.id]: true }));
      }

      setTimeout(() => {
        const el = document.getElementById(`actividad-${actividadIdParam}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);
    }
  }, [actividadIdParam, planificadores, departamentosEquipo]);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGestorEquiposOpen, setIsGestorEquiposOpen] = useState(false);
  const [isRegistroOpen, setIsRegistroOpen] = useState(false); // <--- Historial
  const [isAlabanzasOpen, setIsAlabanzasOpen] = useState(false); // <--- Alabanzas

  const [expandedDeptos, setExpandedDeptos] = useState<Record<string, boolean>>({ 'directas': true });
  const toggleDepto = (id: string) => setExpandedDeptos(prev => ({ ...prev, [id]: !prev[id] }));

  // --- USUARIOS FILTRADOS PARA ASIGNACIÓN ---
  const usuariosParaAsignar = useMemo(() => {
    let result = usuarios;

    // Filtro estricto por género para Módulos de Danza
    if (modulo === 'danza-damas') {
      result = result.filter(u => typeof u.genero === 'string' && u.genero.trim().toLowerCase() === 'femenino');
    } else if (modulo === 'danza-caballeros') {
      result = result.filter(u => typeof u.genero === 'string' && u.genero.trim().toLowerCase() === 'masculino');
    }

    // Si el usuario es Jefe y ya se calcularon sus departamentos
    // EXCEPCIÓN: Los SUPER y ADMIN en vistas globales o reuniones deben poder ver a todos
    const esAdminAutorizado = ['SUPER', 'ADMIN'].includes(perfil.rol?.toUpperCase() || '');
    const esContextoGlobal = modulo === 'todas' || modulo === 'reunion';

    if (isJefe && departamentosEquipo.length > 0 && !(esAdminAutorizado && esContextoGlobal)) {
      const idsEquipo = new Set([perfil.id, ...departamentosEquipo.flatMap(d => d.miembros)]);
      result = result.filter(u => idsEquipo.has(u.id));
    }

    return result;
  }, [usuarios, departamentosEquipo, isJefe, perfil.id, modulo]);

  // --- ASIGNACIÓN DE ACTIVIDADES A DEPARTAMENTOS Y MAPEO ---
  const { planToDeptoMap, topLevelDeptosList } = useMemo(() => {
    const mapa = new Map<string, { id: string; nombre: string }>();

    const deptosConExtendidos = departamentosEquipo.map(depto => {
      const miembrosSet = new Set<string>();
      const agregarFamilia = (idActual: string) => {
        const d = departamentosEquipo.find(x => x.id === idActual);
        if (d) {
          d.miembros.forEach(m => miembrosSet.add(m));
          const hijos = departamentosEquipo.filter(x => x.parent_id === idActual);
          hijos.forEach(hijo => agregarFamilia(hijo.id));
        }
      };
      agregarFamilia(depto.id);
      return {
        ...depto,
        miembrosExtendidos: Array.from(miembrosSet)
      };
    });

    const topLevelDeptos = deptosConExtendidos.filter(d => 
      !d.parent_id || !departamentosEquipo.some(x => x.id === d.parent_id)
    );

    planificadores.forEach(p => {
      const integrantesIds = p.integrantes?.map(i => i.usuario_id) || [];
      const encargado = p.integrantes?.find(i => i.es_encargado);

      const coberturaDeptos = topLevelDeptos.map(depto => {
        const matchCount = integrantesIds.filter(id => depto.miembrosExtendidos.includes(id)).length;
        const tieneEncargado = encargado ? depto.miembrosExtendidos.includes(encargado.usuario_id) : false;

        return {
          deptoId: depto.id,
          deptoNombre: depto.nombre,
          matchCount,
          tieneEncargado
        };
      }).filter(d => d.matchCount > 0);

      if (coberturaDeptos.length === 0) {
        // Fallback por modulo
        const mod = (p.modulo || '').toLowerCase();
        let fallbackDepto = null;
        if (mod === 'reunion') {
          fallbackDepto = topLevelDeptos.find(d => d.nombre.toUpperCase().includes('MINISTERIAL'));
        } else if (['alabanza', 'danza', 'danza-damas', 'danza-caballeros'].includes(mod)) {
          fallbackDepto = topLevelDeptos.find(d => d.nombre.toUpperCase().includes('EXPRESI'));
        } else if (['multimedia', 'comunicacion'].includes(mod)) {
          fallbackDepto = topLevelDeptos.find(d => d.nombre.toUpperCase().includes('COMUNICACI'));
        }
        if (fallbackDepto) {
          mapa.set(p.id, { id: fallbackDepto.id, nombre: fallbackDepto.nombre });
          return;
        }

        mapa.set(p.id, { id: 'directas', nombre: 'Grupales / Externas' });
        return;
      }

      coberturaDeptos.sort((a, b) => {
        if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
        if (b.tieneEncargado !== a.tieneEncargado) return b.tieneEncargado ? 1 : -1;
        return 0;
      });

      const best = coberturaDeptos[0];
      mapa.set(p.id, { id: best.deptoId, nombre: best.deptoNombre });
    });

    return { planToDeptoMap: mapa, topLevelDeptosList: topLevelDeptos };
  }, [planificadores, departamentosEquipo]);

  // Conteo dinámico por departamento para el mes y día seleccionados
  const conteoDeptos = useMemo(() => {
    const counts: Record<string, number> = { todos: 0, directas: 0 };
    planificadoresBase.forEach(p => {
      if (!p.due_date) return;
      const fecha = new Date(p.due_date);
      if (fecha.getMonth() !== mesSeleccionado || fecha.getFullYear() !== anioSeleccionado) return;
      if (diaSeleccionado) {
        const y = fecha.getFullYear();
        const m = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        if (`${y}-${m}-${day}` !== diaSeleccionado) return;
      }
      counts.todos = (counts.todos || 0) + 1;
      const info = planToDeptoMap.get(p.id);
      const dId = info?.id || 'directas';
      counts[dId] = (counts[dId] || 0) + 1;
    });
    return counts;
  }, [planificadoresBase, planToDeptoMap, mesSeleccionado, anioSeleccionado, diaSeleccionado]);

  // Solo dependencias principales con actividad creada (> 0)
  const dependenciasConActividad = useMemo(() => {
    const list: { id: string; nombre: string; count: number }[] = [];
    topLevelDeptosList.forEach(depto => {
      const c = conteoDeptos[depto.id] || 0;
      if (c > 0) {
        list.push({ id: depto.id, nombre: depto.nombre, count: c });
      }
    });

    const directasCount = conteoDeptos['directas'] || 0;
    if (directasCount > 0) {
      list.push({ id: 'directas', nombre: 'Grupales / Externas', count: directasCount });
    }

    return list;
  }, [topLevelDeptosList, conteoDeptos]);

  // Solo si el usuario había filtrado por una dependencia que ya no existe, reseteamos a 'todos'
  useEffect(() => {
    if (esGlobal && filtroDepto !== 'todos') {
      const existe = dependenciasConActividad.some(d => d.id === filtroDepto);
      if (!existe) {
        setFiltroDepto('todos');
      }
    }
  }, [dependenciasConActividad, esGlobal, filtroDepto]);

  // Resetear página al cambiar filtros
  useEffect(() => {
    setPaginaTabla(1);
  }, [diaSeleccionado, filtroDepto, mesSeleccionado, anioSeleccionado, busqueda, filtroTipo, filtroVista]);

  // --- LÓGICA DE FILTRADO BASE ---
  const planificadoresFiltradosRaw = useMemo(() => {
    return planificadoresBase.filter((plan: Planificador) => {
      if (!plan.due_date) return false;

      const fecha = new Date(plan.due_date);
      const coincideMesAnio = fecha.getMonth() === mesSeleccionado && fecha.getFullYear() === anioSeleccionado;
      if (!coincideMesAnio) return false;

      // Filtro exacto por día seleccionado si existe
      if (diaSeleccionado) {
        const y = fecha.getFullYear();
        const m = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        const actDateStr = `${y}-${m}-${day}`;
        if (actDateStr !== diaSeleccionado) return false;
      }

      // Filtro por dependencia / ministerio en vista global
      if (esGlobal && filtroDepto !== 'todos') {
        const deptoInfo = planToDeptoMap.get(plan.id);
        const deptoId = deptoInfo?.id || 'directas';
        if (deptoId !== filtroDepto) return false;
      }

      const termino = busqueda.toLowerCase();
      const coincideTexto = plan.title.toLowerCase().includes(termino) ||
        plan.integrantes.some(int => int.perfil?.nombre.toLowerCase().includes(termino));

      // Filtro 1: Estado automático (Hoy/Próximo/Terminado)
      // Si hay un día seleccionado en el calendario, se ignora el filtro de estado para mostrar todas las actividades de esa fecha concreta.
      const estadoActual = getEstadoCalculado(plan.due_date);
      const coincideEstado = Boolean(diaSeleccionado) || filtroEstado === '' || estadoActual === filtroEstado;

      // --- Filtro 2: Tipo de Servicio ---
      const actual = (plan.status || "").toLowerCase().trim();
      const buscado = (filtroTipo || "").toLowerCase().trim();

      let coincideTipo = true;
      if (buscado !== "") {
        if (buscado === "servicio") {
          coincideTipo = actual === "servicio" || actual === "culto";
        } else if (buscado === "servicio_especial") {
          coincideTipo = actual === "servicio_especial" || actual === "especial";
        } else if (buscado === "ensayo") {
          coincideTipo = actual === "ensayo";
        } else {
          coincideTipo = actual === buscado;
        }
      }

      return coincideTexto && coincideEstado && coincideTipo;
    });
  }, [planificadoresBase, busqueda, mesSeleccionado, anioSeleccionado, diaSeleccionado, filtroDepto, filtroEstado, filtroTipo, planToDeptoMap, esGlobal]);

  const planificadoresGrupales = useMemo(() => {
    return planificadoresFiltradosRaw.filter(plan => {
      if (!plan.integrantes || plan.integrantes.length === 0) return false;
      return true;
    });
  }, [planificadoresFiltradosRaw]);


  const getNombreFecha = (isoFormatted: string) => {
    if (isoFormatted === 'sin-fecha') return 'Sin fecha programada';
    // isoFormatted viene como YYYY-MM-DD local
    const [year, month, day] = isoFormatted.split('-').map(Number);
    const fechaObj = new Date(year, month - 1, day);
    const opciones: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    return fechaObj.toLocaleDateString('es-ES', opciones);
  };

  const aniosDisponibles = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i);

  const renderListaPlanificadores = (listaAProcesar: Planificador[]) => {
    let listaFinal = listaAProcesar;

    if (expandedId) {
      const planActivo = planificadores.find(p => p.id === expandedId);
      if (planActivo) {
        if (planActivo.group_id) {
          listaFinal = planificadores.filter(p => p.group_id === planActivo.group_id);
        } else {
          listaFinal = [planActivo];
        }
      }
    }

    const map: Record<string, Planificador[]> = {};
    listaFinal.forEach((plan) => {
      let fechaKey = 'sin-fecha';

      if (plan.due_date) {
        // En lugar de hacer split('T'), usamos el objeto Date para obtener el año/mes/día LOCAL
        const d = new Date(plan.due_date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        fechaKey = `${y}-${m}-${day}`;
      }

      if (!map[fechaKey]) map[fechaKey] = [];
      map[fechaKey].push(plan);
    });

    const isProximos = filtroEstado === 'Próximos';

    const grupos = Object.entries(map).sort((a, b) => {
      return isProximos ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0]);
    });

    if (grupos.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 bg-[#faf8f4] dark:bg-neutral-900/30 rounded-2xl border border-dashed border-[#d5cec2] dark:border-[#3e3630]">
          <SearchX size={36} className="text-[#d5cec2] mb-3" />
          <h3 className="text-sm font-bold text-[#9c8e7c]">No hay actividades en esta sección</h3>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {grupos.map(([fecha, planificadoresGrupo]) => {
          // Agrupar actividades que comparten el mismo group_id
          const itemsUnicos: { principal: Planificador; hermanos: Planificador[] }[] = [];
          const gruposMap = new Map<string, Planificador[]>();

          const ordenados = [...planificadoresGrupo].sort((a, b) => {
            const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
            const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
            return isProximos ? dateA - dateB : dateB - dateA;
          });

          ordenados.forEach((plan) => {
            if (plan.group_id) {
              if (!gruposMap.has(plan.group_id)) {
                gruposMap.set(plan.group_id, []);
              }
              gruposMap.get(plan.group_id)!.push(plan);
            }
          });

          const procesadosGrupos = new Set<string>();

          ordenados.forEach((plan) => {
            if (plan.group_id) {
              if (!procesadosGrupos.has(plan.group_id)) {
                procesadosGrupos.add(plan.group_id);
                // Buscar todos los hermanos del grupo en la lista completa y ordenarlos cronológicamente
                const todosDelGrupo = planificadores
                  .filter(p => p.group_id === plan.group_id)
                  .sort((a, b) => {
                    const timeA = a.due_date ? new Date(a.due_date).getTime() : 0;
                    const timeB = b.due_date ? new Date(b.due_date).getTime() : 0;
                    if (timeA !== timeB) return timeA - timeB;
                    const cA = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
                    const cB = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
                    return cA - cB;
                  });

                itemsUnicos.push({
                  principal: todosDelGrupo[0] || plan,
                  hermanos: todosDelGrupo.length > 0 ? todosDelGrupo : [plan]
                });
              }
            } else {
              itemsUnicos.push({
                principal: plan,
                hermanos: [plan]
              });
            }
          });

          return (
            <div key={fecha} className="space-y-3 animate-in fade-in">
              <h3 className="flex items-center gap-2 text-[11px] font-black text-[#9c8e7c] dark:text-[#847563] uppercase tracking-[0.2em] ml-2">
                <CalendarIcon size={14} className="text-[#d6a738]" />
                {getNombreFecha(fecha)}
                <span className="ml-auto bg-[#faf8f4] dark:bg-neutral-800 text-[#4a3f36] dark:text-[#b9ae9f] px-2 py-0.5 rounded-lg text-[10px] font-bold">
                  {itemsUnicos.length}
                </span>
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {itemsUnicos.map(({ principal, hermanos }) => {
                  const estaExpandido = hermanos.some(h => h.id === expandedId);
                  return (
                    <PlanificadorItem
                      key={principal.id}
                      planificador={principal}
                      serviciosGrupo={hermanos}
                      usuarios={usuarios}
                      usuarioActualId={perfil.id}
                      isExpanded={estaExpandido}
                      onToggle={() => setExpandedId(estaExpandido ? null : principal.id)}
                      isJefe={isJefe}
                      modulo={modulo}
                      tipoVista={tipoVista}
                      departamentosEquipo={departamentosEquipo}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const isVistaDepartamentos = (tipoVista === 'mi_equipo' || tipoVista === 'todas') && departamentosEquipo.length > 0;

  // --- ASIGNACIÓN ÚNICA DE ACTIVIDADES A DEPARTAMENTOS ---
  // Algoritmo para encontrar el departamento más adecuado (Lowest Common Ancestor aproximado)
  const { mapActividadesPorDepto, actosDirectosFallback } = useMemo(() => {
    const mapa: Record<string, Planificador[]> = {};
    const directos: Planificador[] = [];

    // 1. Precomputar los "miembrosExtendidos" de cada departamento (incluyendo todos sus sub-departamentos)
    const deptosConExtendidos = departamentosEquipo.map(depto => {
      const miembrosSet = new Set<string>();

      const agregarFamilia = (idActual: string) => {
        const d = departamentosEquipo.find(x => x.id === idActual);
        if (d) {
          d.miembros.forEach(m => miembrosSet.add(m));
          const hijos = departamentosEquipo.filter(x => x.parent_id === idActual);
          hijos.forEach(hijo => agregarFamilia(hijo.id));
        }
      };

      agregarFamilia(depto.id);

      return {
        ...depto,
        miembrosExtendidos: Array.from(miembrosSet)
      };
    });

    // Filtramos SOLO las dependencias padre (aquellas que no tienen padre, o su padre no está en la lista visible)
    const topLevelDeptos = deptosConExtendidos.filter(d => 
      !d.parent_id || !departamentosEquipo.some(x => x.id === d.parent_id)
    );

    // 2. Asignar cada actividad a un ÚNICO departamento padre
    planificadoresGrupales.forEach(p => {
      const integrantesIds = p.integrantes.map(i => i.usuario_id);
      const encargado = p.integrantes.find(i => i.es_encargado);

      // Calcular la cobertura solo contra los departamentos padre
      const coberturaDeptos = topLevelDeptos.map(depto => {
        // ¿Cuántos miembros de la actividad pertenecen a este departamento o a sus hijos?
        const matchCount = integrantesIds.filter(id => depto.miembrosExtendidos.includes(id)).length;
        // ¿El líder pertenece explícitamente a este departamento extendido?
        const tieneEncargado = encargado ? depto.miembrosExtendidos.includes(encargado.usuario_id) : false;

        return {
          deptoId: depto.id,
          matchCount,
          totalExtendidos: depto.miembrosExtendidos.length,
          tieneEncargado
        };
      }).filter(d => d.matchCount > 0);

      if (coberturaDeptos.length === 0) {
        directos.push(p);
        return;
      }

      // Ordenar para encontrar el "mejor" departamento padre:
      coberturaDeptos.sort((a, b) => {
        // 1. El que agrupe a MÁS miembros de la actividad
        if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;

        // 2. Desempate: El que tenga al Encargado (Líder)
        if (b.tieneEncargado !== a.tieneEncargado) return b.tieneEncargado ? 1 : -1;

        return 0;
      });

      const bestDeptoId = coberturaDeptos[0].deptoId;
      if (!mapa[bestDeptoId]) mapa[bestDeptoId] = [];
      mapa[bestDeptoId].push(p);
    });

    return { mapActividadesPorDepto: mapa, actosDirectosFallback: directos };
  }, [planificadoresGrupales, departamentosEquipo]);

  // Las actividades que no cayeron en ningún departamento específico van a Grupales/Externas
  const actosDirectos = actosDirectosFallback;

  return (
    <div className="space-y-4 sm:space-y-6 font-sans max-w-[1750px] w-full mx-auto px-0.5 sm:px-3 lg:px-4">

      {!expandedId ? (
        <div className="flex flex-col gap-4 sm:gap-6 bg-white dark:bg-neutral-900 p-2.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#d5cec2] dark:border-[#3e3630] shadow-sm animate-in fade-in duration-300">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-base font-black text-[#4a3f36] dark:text-[#f4ebc3] flex items-center gap-2">
                <LayoutGrid className="text-[#d6a738]" size={20} />
                Planificador de Servicios
              </h1>
              <p className="text-sm text-[#847563] dark:text-[#b9ae9f] font-medium">
                Gestión de asignaciones, grupos y comisiones
              </p>
            </div>

            {(isJefe && (modulo !== 'reunion' || ['admin', 'super'].includes(perfil.rol?.toLowerCase() || ''))) && (() => {
              const showHistorial = true;
              const showBanco = !(modulo === 'reunion' || (tipoVista === 'todas' && modulo === 'todas'));
              const showEstadisticas = modulo === 'alabanza' && (isJefe || ['super', 'admin', 'lider'].includes(perfil?.rol?.toLowerCase() || ''));
              const showDones = ['alabanza', 'danza', 'danza-damas', 'danza-caballeros', 'multimedia', 'reunion'].includes(modulo) && (isJefe || ['super', 'admin', 'lider'].includes(perfil?.rol?.toLowerCase() || ''));
              const showEquipos = true;

              const numIcons = [showHistorial, showBanco, showEstadisticas, showDones, showEquipos].filter(Boolean).length;
              const isWrappedLayout = numIcons >= 5;

              return (
                <div className={cn("flex sm:flex-row gap-3 w-full md:w-auto", isWrappedLayout ? "flex-col items-stretch sm:items-center" : "flex-row items-center justify-between")}>
                  <div className={cn("flex items-center gap-2 shrink-0", isWrappedLayout ? "justify-center sm:justify-start w-full sm:w-auto overflow-x-auto scrollbar-hide pb-1 sm:pb-0" : "")}>
                    {/* BOTÓN HISTORIAL DE SUSTITUCIONES */}
                    {showHistorial && (
                      <button
                        onClick={() => setIsRegistroOpen(true)}
                        className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 p-3 rounded-2xl transition-colors border border-amber-100 dark:border-amber-800 shrink-0"
                        title="Registro de Sustituciones"
                      >
                        <ClipboardList size={20} />
                      </button>
                    )}

                    {/* BOTÓN BANCO ALABANZAS */}
                    {showBanco && (
                      <button
                        onClick={() => setIsAlabanzasOpen(true)}
                        className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 p-3 rounded-2xl transition-colors border border-purple-100 dark:border-purple-800 shrink-0"
                        title="Banco de Alabanzas"
                      >
                        <Music size={20} />
                      </button>
                    )}

                    {/* BOTÓN ESTADÍSTICAS ALABANZAS */}
                    {showEstadisticas && (
                      <Link
                        href="/kore/reportes/alabanzas?from=planificador"
                        className="bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40 p-3 rounded-2xl transition-colors border border-sky-100 dark:border-sky-800 shrink-0"
                        title="Estadísticas de Alabanzas"
                      >
                        <BarChart size={20} />
                      </Link>
                    )}

                    {/* BOTÓN REPORTE DE DONES */}
                    {showDones && (
                      <Link
                        href={`/kore/planificador/${modulo}/dones`}
                        className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 p-3 rounded-2xl transition-colors border border-rose-100 dark:border-rose-800 shrink-0"
                        title="Reporte de Dones"
                      >
                        <BookOpen size={20} />
                      </Link>
                    )}

                    {/* BOTÓN GESTOR DE EQUIPOS */}
                    {showEquipos && (
                      <button
                        onClick={() => setIsGestorEquiposOpen(true)}
                        className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 p-3 rounded-2xl transition-colors border border-indigo-100 dark:border-indigo-800 shrink-0"
                        title="Gestionar Plantillas de Equipo"
                      >
                        <Users size={20} />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setIsModalOpen(true)}
                    className={cn(
                      "bg-[#d6a738] hover:bg-[#c08e2a] text-white py-3 rounded-2xl font-bold shadow-lg shadow-[#d6a738]/20 dark:shadow-none transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 text-[13px] sm:text-sm whitespace-nowrap shrink-0",
                      isWrappedLayout ? "w-full sm:w-auto px-4 sm:px-6" : "flex-1 md:flex-none px-4 sm:px-6"
                    )}
                  >
                    <Plus size={18} className={cn("shrink-0", isWrappedLayout ? "" : "hidden sm:block")} /> Nueva Actividad
                  </button>
                </div>
              );
            })()}
          </div>

          <div className="flex flex-col xl:flex-row gap-4 items-center">

            <div className="flex flex-wrap gap-2 justify-center xl:justify-start w-full xl:w-auto">
              {['Para hoy', 'Próximos', 'Terminados'].map((estado) => {

                const planificadoresEnMes = planificadores.filter(plan => {
                  if (!plan.due_date) return false;
                  const fecha = new Date(plan.due_date);
                  return fecha.getMonth() === mesSeleccionado && fecha.getFullYear() === anioSeleccionado;
                });

                // Contar actividades considerando grupos (un grupo cuenta como 1 sola actividad)
                const itemsEnEstado = planificadoresEnMes.filter(p => getEstadoCalculado(p.due_date) === estado);
                const gruposContados = new Set<string>();
                let count = 0;
                itemsEnEstado.forEach(p => {
                  if (p.group_id) {
                    if (!gruposContados.has(p.group_id)) {
                      gruposContados.add(p.group_id);
                      count++;
                    }
                  } else {
                    count++;
                  }
                });

                const isActive = filtroEstado === estado;

                let activeStyle = '';
                if (estado === 'Para hoy') activeStyle = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
                else if (estado === 'Próximos') activeStyle = 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
                else activeStyle = 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';

                return (
                  <button
                    key={estado}
                    onClick={() => {
                      if (diaSeleccionado) setDiaSeleccionado(null);
                      setFiltroEstado(prev => prev === estado ? '' : estado);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap border flex items-center gap-1.5 
                      ${isActive
                        ? `${activeStyle} shadow-sm ring-1 ring-inset`
                        : 'bg-white dark:bg-neutral-900 border-[#d5cec2] dark:border-[#3e3630] text-[#847563] hover:border-[#d6a738]/50 dark:text-[#b9ae9f]'
                      }`}
                  >
                    <span>{estado.toUpperCase()}</span>
                    <span className={`px-1 py-0.5 rounded text-[9px] text-center min-w-4 
                        ${isActive ? 'bg-white/50 text-current' : 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto flex-1">
              <div className="relative group flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9c8e7c] group-focus-within:text-[#d6a738] transition-colors" />
                <input
                  type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#faf8f4] dark:bg-neutral-800 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#d6a738]/20 transition-all text-[#4a3f36] dark:text-[#f4ebc3] placeholder:text-[#9c8e7c]"
                />
              </div>

              {/* --- NUEVO SELECTOR DE TIPO DE SERVICIO --- */}
              <div className="relative min-w-35">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9c8e7c] pointer-events-none">
                  <Filter size={14} />
                </div>
                <select
                  value={filtroTipo}
                  onChange={e => setFiltroTipo(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-[#faf8f4] dark:bg-neutral-800 rounded-2xl text-sm font-bold text-[#4a3f36] dark:text-[#f4ebc3] outline-none cursor-pointer border-r-8 border-r-transparent focus:ring-2 focus:ring-[#d6a738]/20 appearance-none"
                >
                  {(() => {
                    const base = [...TIPOS_SERVICIO];
                    if (data?.tiposServicio) {
                      data.tiposServicio.forEach((ts: string) => {
                        if (ts.toLowerCase() !== 'borrador' && !base.find(b => b.value.toLowerCase() === ts.toLowerCase())) {
                          const label = ts.charAt(0).toUpperCase() + ts.slice(1).toLowerCase();
                          base.push({ value: ts.toLowerCase(), label });
                        }
                      });
                    }
                    return base.map(t => <option key={t.value} value={t.value}>{t.label}</option>);
                  })()}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#9c8e7c]">
                  <ChevronDown size={14} />
                </div>
              </div>

              
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-end animate-in fade-in slide-in-from-right-4 duration-300">
          <button
            onClick={() => setExpandedId(null)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-neutral-900 border border-[#d5cec2] dark:border-[#3e3630] text-[#847563] dark:text-[#b9ae9f] hover:text-[#d6a738] dark:hover:text-[#d6a738] rounded-2xl font-bold text-sm shadow-sm transition-all"
          >
            <ArrowLeft size={18} /> Volver a la lista
          </button>
        </div>
      )}

      <div className="pb-20">
        {expandedId ? (
          renderListaPlanificadores(planificadoresGrupales)
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-stretch w-full">
            {/* Columna Izquierda: Calendario Integrado */}
            <div className="w-full lg:w-[47%] xl:w-[46%] shrink-0 flex flex-col">
              <CalendarioModulo
                mes={mesSeleccionado}
                anio={anioSeleccionado}
                onMesChange={(m, a) => {
                  setMesSeleccionado(m);
                  setAnioSeleccionado(a);
                  setDiaSeleccionado(null);
                }}
                diaSeleccionado={diaSeleccionado}
                onDiaSelect={(d) => {
                  setDiaSeleccionado(d);
                  if (d && typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setTimeout(() => {
                      smoothScrollToElement(tablaRef.current, 85, 450);
                    }, 50);
                  }
                }}
                eventosPorFecha={eventosPorFecha}
                canViewAll={canViewAll}
                filtroVista={filtroVista}
                onFiltroVistaChange={(v) => setFiltroVista(v)}
                stats={calendarStats}
              />
            </div>

            {/* Columna Derecha: Lista de Actividades estilo Tabla (5 en 5) */}
            <div
              ref={tablaRef}
              className="w-full lg:w-[53%] xl:w-[54%] flex-1 min-w-0 flex flex-col justify-between bg-white dark:bg-[#12141a]/95 backdrop-blur-md border border-[#d5cec2] dark:border-border/40 rounded-2xl p-2 sm:p-5 shadow-sm dark:shadow-xl min-h-[540px] overflow-hidden scroll-mt-20"
            >
              {/* Cabecera de la tabla */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-2 border-b border-[#d5cec2]/60 dark:border-border/30 shrink-0">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <CalendarIcon size={16} className="text-sky-400 shrink-0" />
                    <h3 className="text-xs sm:text-sm font-bold text-[#4a3f36] dark:text-foreground truncate">
                      {diaSeleccionado
                        ? `Actividades del ${formatFullDate(diaSeleccionado)}`
                        : `Todas las actividades de ${MESES[mesSeleccionado]} ${anioSeleccionado}`}
                    </h3>
                  </div>

                  {diaSeleccionado && (
                    <button
                      type="button"
                      onClick={() => setDiaSeleccionado(null)}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer shadow-sm shrink-0"
                      title="Volver a ver todas las actividades del mes"
                    >
                      Ver todo el mes
                    </button>
                  )}
                </div>

                {/* Selector Popover de Dependencia para la Vista Global del Admin */}
                {esGlobal && dependenciasConActividad.length > 0 && (
                  <div className="w-full sm:w-64 relative">
                    <button
                      type="button"
                      onClick={() => setIsDeptoMenuOpen(!isDeptoMenuOpen)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-1.5 bg-[#faf8f4] hover:bg-[#f5f0e6] dark:bg-neutral-800/90 dark:hover:bg-neutral-700/90 border border-[#d5cec2] dark:border-border/60 text-[#4a3f36] dark:text-neutral-200 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <Building2 size={13} className="text-amber-400 shrink-0" />
                        <span className="truncate">
                          {filtroDepto === 'todos'
                            ? 'Todas las dependencias'
                            : dependenciasConActividad.find(d => d.id === filtroDepto)?.nombre || 'Dependencia'}
                        </span>
                      </div>
                      <ChevronDown size={13} className={`text-muted-foreground shrink-0 transition-transform duration-200 ${isDeptoMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDeptoMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsDeptoMenuOpen(false)}
                        />
                        <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 z-50 w-full sm:w-64 max-w-[calc(100vw-32px)] bg-white dark:bg-neutral-900 border border-[#d5cec2] dark:border-border/80 rounded-xl shadow-2xl p-1.5 space-y-1 backdrop-blur-md">
                          <div className="px-2 py-1 text-[10px] font-bold text-[#847563] dark:text-neutral-400 uppercase tracking-wider border-b border-[#d5cec2]/60 dark:border-border/40 mb-1">
                            Filtrar por dependencia
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setFiltroDepto('todos');
                              setIsDeptoMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                              filtroDepto === 'todos'
                                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold'
                                : 'text-[#4a3f36] dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                          >
                            <span className="truncate">Todas las dependencias</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/5 text-[#847563] dark:bg-neutral-800 dark:text-neutral-400 font-mono">
                              {conteoDeptos['todos'] || 0}
                            </span>
                          </button>

                          {dependenciasConActividad.map(depto => (
                            <button
                              key={depto.id}
                              type="button"
                              onClick={() => {
                                setFiltroDepto(depto.id);
                                setIsDeptoMenuOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                                filtroDepto === depto.id
                                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold'
                                  : 'text-[#4a3f36] dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5'
                              }`}
                            >
                              <span className="truncate">{depto.nombre}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/5 text-[#847563] dark:bg-neutral-800 dark:text-neutral-400 font-mono">
                                {depto.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Contenido Tabla distribuido */}
              {planificadoresGrupales.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-3 my-auto">
                  <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-muted/40 flex items-center justify-center text-[#847563] dark:text-muted-foreground">
                    <SearchX size={24} />
                  </div>
                  <h4 className="font-bold text-[#4a3f36] dark:text-foreground text-sm">No se encontraron actividades</h4>
                  <p className="text-xs text-[#847563] dark:text-muted-foreground max-w-xs">
                    {diaSeleccionado
                      ? "No hay actividades programadas para este día."
                      : "No hay actividades en esta sección para los filtros seleccionados."}
                  </p>
                  {diaSeleccionado && (
                    <button
                      type="button"
                      onClick={() => setDiaSeleccionado(null)}
                      className="px-4 py-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold hover:bg-amber-500/25 transition-colors cursor-pointer"
                    >
                      Ver todo el mes
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 overflow-x-auto overflow-y-hidden my-1 w-full max-w-full">
                  <table className="min-w-[580px] w-full text-left text-xs flex-1 flex flex-col">
                    <thead>
                      <tr className="flex items-center border-b border-[#d5cec2]/60 dark:border-border/30 text-[#847563] dark:text-muted-foreground font-bold tracking-wider uppercase text-[10px] pb-2 px-2.5 shrink-0">
                        <th className="w-28 sm:w-32 shrink-0 text-left">Categoría</th>
                        <th className="flex-1 min-w-0 pr-4 pl-1 sm:pl-2">Descripción</th>
                        <th className="w-36 sm:w-44 shrink-0 text-left">F. Actividad</th>
                      </tr>
                    </thead>
                    <tbody className="flex-1 flex flex-col justify-between divide-y divide-[#d5cec2]/40 dark:divide-border/20">
                      {(() => {
                        const itemsPagina = planificadoresGrupales.slice(
                          (paginaTabla - 1) * ITEMS_POR_PAGINA,
                          paginaTabla * ITEMS_POR_PAGINA
                        );
                        const slots = Array.from({ length: ITEMS_POR_PAGINA }, (_, i) => itemsPagina[i] || null);

                        return slots.map((plan, index) => {
                          if (plan) {
                            const badge = getCategoriaBadge(plan.status, plan.modulo);
                            const numIntegrantes = plan.integrantes?.length || 0;
                            const creadorNombre = plan.creator?.nombre;

                            return (
                              <tr
                                key={plan.id}
                                onClick={() => setExpandedId(plan.id)}
                                title="Clic para ver detalles de la actividad"
                                className="flex-1 flex items-center px-2.5 py-2 sm:py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/5 active:scale-[0.995] transition-all cursor-pointer group min-h-[56px]"
                              >
                                <td className="w-28 sm:w-32 shrink-0 whitespace-nowrap text-left flex items-center justify-start">
                                  <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[10px] font-bold text-center ${badge.className}`}>
                                    {badge.label}
                                  </span>
                                </td>
                                <td className="flex-1 min-w-0 pr-4 pl-1 sm:pl-2">
                                  <div className="font-bold text-[#4a3f36] dark:text-foreground text-xs sm:text-[13px] group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                                    {plan.title}
                                  </div>
                                  <div className="text-[11px] text-[#847563] dark:text-muted-foreground line-clamp-1 mt-0.5">
                                    {creadorNombre ? `Por: ${creadorNombre}` : ''}
                                    {numIntegrantes > 0 ? ` • ${numIntegrantes} integrante(s)` : ''}
                                  </div>
                                </td>
                                <td className="w-36 sm:w-44 shrink-0 whitespace-nowrap text-[#847563] dark:text-muted-foreground text-left text-[11px] font-medium">
                                  {formatFechaTabla(plan.due_date)}
                                </td>
                              </tr>
                            );
                          }

                          // Fila vacía / placeholder para mantener fija la cuadrícula de 5 filas sin estirar
                          return (
                            <tr
                              key={`placeholder-${index}`}
                              className="flex-1 flex items-center px-2.5 py-2 sm:py-2.5 opacity-0 pointer-events-none min-h-[56px]"
                              aria-hidden="true"
                            >
                              <td className="w-28 sm:w-32 shrink-0 text-left">&nbsp;</td>
                              <td className="flex-1 min-w-0 pr-4 pl-1 sm:pl-2">&nbsp;</td>
                              <td className="w-36 sm:w-44 shrink-0 text-left">&nbsp;</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Paginador inferior (5 en 5) */}
              {planificadoresGrupales.length > 0 && (() => {
                const totalItems = planificadoresGrupales.length;
                const totalPaginas = Math.max(1, Math.ceil(totalItems / ITEMS_POR_PAGINA));
                const inicio = (paginaTabla - 1) * ITEMS_POR_PAGINA + 1;
                const fin = Math.min(paginaTabla * ITEMS_POR_PAGINA, totalItems);

                return (
                  <div className="flex items-center justify-between pt-3 mt-auto border-t border-[#d5cec2]/60 dark:border-border/30 text-xs text-[#847563] dark:text-muted-foreground font-medium shrink-0">
                    <div>
                      {inicio}-{fin} de {totalItems}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={paginaTabla <= 1}
                        onClick={() => setPaginaTabla((p) => Math.max(1, p - 1))}
                        className="p-1 rounded-md hover:bg-black/5 hover:text-[#4a3f36] dark:hover:bg-white/10 dark:hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="font-mono text-[#4a3f36] dark:text-foreground font-bold text-xs">
                        {paginaTabla} / {totalPaginas}
                      </span>
                      <button
                        type="button"
                        disabled={paginaTabla >= totalPaginas}
                        onClick={() => setPaginaTabla((p) => Math.min(totalPaginas, p + 1))}
                        className="p-1 rounded-md hover:bg-black/5 hover:text-[#4a3f36] dark:hover:bg-white/10 dark:hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <NuevoPlanificador
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          usuarios={usuariosParaAsignar}
          usuarioActualId={perfil.id}
          isJefe={isJefe}
          modulo={modulo}
          tipoVista={tipoVista}
          departamentosEquipo={departamentosEquipo}
          tiposServicio={data?.tiposServicio || []}
        />
      )}

      {/* MODAL DE GESTIÓN (CRUD de equipos) */}
      <GestorEquipos
        isOpen={isGestorEquiposOpen}
        onClose={() => setIsGestorEquiposOpen(false)}
        usuarios={usuariosParaAsignar}
      />

      {/* MODAL HISTORIAL DE SUSTITUCIONES */}
      <RegistroSustituciones
        isOpen={isRegistroOpen}
        onClose={() => setIsRegistroOpen(false)}
      />

      {/* MODAL BANCO ALABANZAS */}
      <RegistroAlabanzas
        isOpen={isAlabanzasOpen}
        onClose={() => setIsAlabanzasOpen(false)}
      />
    </div>
  );
}