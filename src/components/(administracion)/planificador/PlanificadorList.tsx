'use client';

import { useState, useMemo } from 'react';
import {
  Plus, Search, Calendar as CalendarIcon,
  SearchX, LayoutGrid, ArrowLeft, Building2, ChevronDown, ChevronRight, Users, Filter, ClipboardList, Music, BarChart
} from 'lucide-react';
import Link from 'next/link';
import { Planificador, Perfil } from './lib/zod';
import { useGestorPlanificador } from './lib/hooks';
import PlanificadorItem from './PlanificadorItem';
import NuevoPlanificador from './modals/NuevoPlanificador';
import GestorEquipos from './modals/GestorEquipos';
import RegistroSustituciones from './modals/RegistroSustituciones'; // <--- Historial
import RegistroAlabanzas from './modals/RegistroAlabanzas'; // <--- Alabanzas

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
    // EXCEPCIÓN: Los SUPER, ADMIN y RRHH en vistas globales o reuniones deben poder ver a todos
    const esAdminAutorizado = ['SUPER', 'ADMIN', 'RRHH'].includes(perfil.rol?.toUpperCase() || '');
    const esContextoGlobal = modulo === 'todas' || modulo === 'reunion';

    if (isJefe && departamentosEquipo.length > 0 && !(esAdminAutorizado && esContextoGlobal)) {
      const idsEquipo = new Set([perfil.id, ...departamentosEquipo.flatMap(d => d.miembros)]);
      result = result.filter(u => idsEquipo.has(u.id));
    }

    return result;
  }, [usuarios, departamentosEquipo, isJefe, perfil.id, modulo]);

  // --- LÓGICA DE FILTRADO BASE ---
  const planificadoresFiltradosRaw = useMemo(() => {
    return planificadores.filter((plan: Planificador) => {
      if (!plan.due_date) return false;

      const fecha = new Date(plan.due_date);
      const coincideFecha = fecha.getMonth() === mesSeleccionado && fecha.getFullYear() === anioSeleccionado;

      const termino = busqueda.toLowerCase();
      const coincideTexto = plan.title.toLowerCase().includes(termino) ||
        plan.integrantes.some(int => int.perfil?.nombre.toLowerCase().includes(termino));

      // Filtro 1: Estado automático (Hoy/Próximo/Terminado)
      const estadoActual = getEstadoCalculado(plan.due_date);
      const coincideEstado = filtroEstado === '' || estadoActual === filtroEstado;

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
          // Fallback para cualquier otro valor
          coincideTipo = actual === buscado;
        }
      }

      return coincideFecha && coincideTexto && coincideEstado && coincideTipo;
    });
  }, [planificadores, busqueda, mesSeleccionado, anioSeleccionado, filtroEstado, filtroTipo]);

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
      if (planActivo) listaFinal = [planActivo];
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
        {grupos.map(([fecha, planificadoresGrupo]) => (
          <div key={fecha} className="space-y-3 animate-in fade-in">
            <h3 className="flex items-center gap-2 text-[11px] font-black text-[#9c8e7c] dark:text-[#847563] uppercase tracking-[0.2em] ml-2">
              <CalendarIcon size={14} className="text-[#d6a738]" />
              {getNombreFecha(fecha)}
              <span className="ml-auto bg-[#faf8f4] dark:bg-neutral-800 text-[#4a3f36] dark:text-[#b9ae9f] px-2 py-0.5 rounded-lg text-[10px] font-bold">
                {planificadoresGrupo.length}
              </span>
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {planificadoresGrupo
                .sort((a, b) => {
                  const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
                  const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
                  return isProximos ? dateA - dateB : dateB - dateA;
                })
                .map((plan) => (
                <PlanificadorItem
                  key={plan.id}
                  planificador={plan}
                  usuarios={usuarios}
                  usuarioActualId={perfil.id}
                  isExpanded={expandedId === plan.id}
                  onToggle={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
                  isJefe={isJefe}
                  modulo={modulo}
                  tipoVista={tipoVista}
                  departamentosEquipo={departamentosEquipo}
                />
              ))}
            </div>
          </div>
        ))}
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

    // 2. Asignar cada actividad a un ÚNICO departamento
    planificadoresGrupales.forEach(p => {
      const integrantesIds = p.integrantes.map(i => i.usuario_id);
      const encargado = p.integrantes.find(i => i.es_encargado);

      // Calcular la cobertura
      const coberturaDeptos = deptosConExtendidos.map(depto => {
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

      // Ordenar para encontrar el "mejor" departamento:
      coberturaDeptos.sort((a, b) => {
        // 1. El que agrupe a MÁS miembros de la actividad (Ej. Padre agrupa a todos, hijo solo a algunos)
        if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount; 
        
        // 2. Desempate: El que tenga al Encargado (Líder)
        if (b.tieneEncargado !== a.tieneEncargado) return b.tieneEncargado ? 1 : -1;
        
        // 3. Desempate: Si agrupan a la misma cantidad de miembros (ej. todos son coristas),
        // preferimos el MÁS ESPECÍFICO (es decir, el departamento más pequeño / sub-departamento).
        return a.totalExtendidos - b.totalExtendidos; 
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
    <div className="space-y-6 font-sans max-w-7xl mx-auto">

      {!expandedId ? (
        <div className="flex flex-col gap-6 bg-white dark:bg-neutral-900 px-4 py-6 rounded-3xl border border-[#d5cec2] dark:border-[#3e3630] shadow-sm animate-in fade-in duration-300">

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

            {(isJefe && (modulo !== 'reunion' || ['admin', 'super', 'rrhh'].includes(perfil.rol?.toLowerCase() || ''))) && (
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto scrollbar-hide">
                {/* BOTÓN HISTORIAL DE SUSTITUCIONES */}
                <button
                  onClick={() => setIsRegistroOpen(true)}
                  className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 p-3 rounded-2xl transition-colors border border-amber-100 dark:border-amber-800 shrink-0"
                  title="Registro de Sustituciones"
                >
                  <ClipboardList size={20} />
                </button>

                {/* BOTÓN BANCO ALABANZAS - Ocultar en Global y en Reunion */}
                {!(modulo === 'reunion' || (tipoVista === 'todas' && modulo === 'todas')) && (
                  <button
                    onClick={() => setIsAlabanzasOpen(true)}
                    className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 p-3 rounded-2xl transition-colors border border-purple-100 dark:border-purple-800 shrink-0"
                    title="Banco de Alabanzas"
                  >
                    <Music size={20} />
                  </button>
                )}

                {/* BOTÓN ESTADÍSTICAS ALABANZAS - Solo para SUPER, ADMIN, LIDERES en el módulo de alabanza */}
                {modulo === 'alabanza' && (isJefe || ['super', 'admin', 'lider'].includes(perfil?.rol?.toLowerCase() || '')) && (
                  <Link
                    href="/kore/reportes/alabanzas?from=planificador"
                    className="bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40 p-3 rounded-2xl transition-colors border border-sky-100 dark:border-sky-800 shrink-0"
                    title="Estadísticas de Alabanzas"
                  >
                    <BarChart size={20} />
                  </Link>
                )}

                {/* BOTÓN GESTOR DE EQUIPOS */}
                <button
                  onClick={() => setIsGestorEquiposOpen(true)}
                  className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 p-3 rounded-2xl transition-colors border border-indigo-100 dark:border-indigo-800 shrink-0"
                  title="Gestionar Plantillas de Equipo"
                >
                  <Users size={20} />
                </button>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex-1 md:flex-none bg-[#d6a738] hover:bg-[#c08e2a] text-white px-4 sm:px-6 py-3 rounded-2xl font-bold shadow-lg shadow-[#d6a738]/20 dark:shadow-none transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 text-[13px] sm:text-sm whitespace-nowrap"
                >
                  <Plus size={18} className="hidden sm:block shrink-0" /> Nueva Actividad
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col xl:flex-row gap-4 items-center">

            <div className="flex flex-wrap gap-2 justify-center xl:justify-start w-full xl:w-auto">
              {['Para hoy', 'Próximos', 'Terminados'].map((estado) => {

                const planificadoresEnMes = planificadores.filter(plan => {
                  if (!plan.due_date) return false;
                  const fecha = new Date(plan.due_date);
                  return fecha.getMonth() === mesSeleccionado && fecha.getFullYear() === anioSeleccionado;
                });

                const count = planificadoresEnMes.filter(p => {
                  const est = getEstadoCalculado(p.due_date);
                  return est === estado;
                }).length;

                const isActive = filtroEstado === estado;

                let activeStyle = '';
                if (estado === 'Para hoy') activeStyle = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
                else if (estado === 'Próximos') activeStyle = 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
                else activeStyle = 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';

                return (
                  <button
                    key={estado}
                    onClick={() => setFiltroEstado(prev => prev === estado ? '' : estado)}
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

              <div className="flex gap-2 min-w-35">
                <select value={mesSeleccionado} onChange={e => setMesSeleccionado(Number(e.target.value))} className="flex-1 px-3 py-2.5 bg-[#faf8f4] dark:bg-neutral-800 rounded-2xl text-sm font-bold text-[#4a3f36] dark:text-[#f4ebc3] outline-none cursor-pointer border-r-8 border-r-transparent focus:ring-2 focus:ring-[#d6a738]/20">
                  {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={anioSeleccionado} onChange={e => setAnioSeleccionado(Number(e.target.value))} className="px-3 py-2.5 bg-[#faf8f4] dark:bg-neutral-800 rounded-2xl text-sm font-bold text-[#4a3f36] dark:text-[#f4ebc3] outline-none cursor-pointer border-r-8 border-r-transparent focus:ring-2 focus:ring-[#d6a738]/20">
                  {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
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

      <div className="pb-20 space-y-6">
        {expandedId ? renderListaPlanificadores(planificadoresGrupales) : (
          <>
            {isVistaDepartamentos ? (
              <div className="space-y-4">
                {actosDirectos.length > 0 && (
                  <div className="flex flex-col bg-white dark:bg-[#1a1a1a] border border-[#d5cec2] dark:border-[#3e3630] rounded-2xl overflow-hidden shadow-sm">
                    <div onClick={() => toggleDepto('directas')} className="flex items-center justify-between p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 flex items-center justify-center shrink-0">
                          <Users size={24} />
                        </div>
                        <div className="flex flex-col">
                          <h3 className="text-[#4a3f36] dark:text-white font-bold text-sm uppercase tracking-wide">
                            {tipoVista === 'todas' ? 'Grupales / Externas' : 'Mis Grupos Directos'}
                          </h3>
                          <p className="text-[#847563] dark:text-gray-400 text-xs mt-0.5">{actosDirectos.length} actividades</p>
                        </div>
                      </div>
                      <div className="text-[#9c8e7c] dark:text-gray-500 mr-2">
                        {expandedDeptos['directas'] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </div>
                    </div>
                    {expandedDeptos['directas'] && (
                      <div className="p-4 sm:p-6 border-t border-[#d5cec2] dark:border-[#3e3630] bg-[#faf8f4] dark:bg-black/20">
                        {renderListaPlanificadores(actosDirectos)}
                      </div>
                    )}
                  </div>
                )}

                {departamentosEquipo.map(depto => {
                  const actsDepto = mapActividadesPorDepto[depto.id] || [];
                  const isOpen = expandedDeptos[depto.id];
                  if (actsDepto.length === 0) return null;

                  return (
                    <div key={depto.id} className="flex flex-col bg-white dark:bg-[#1a1a1a] border border-[#d5cec2] dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                      <div onClick={() => toggleDepto(depto.id)} className="flex items-center justify-between p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-[#fbf7e6] dark:bg-[#d6a738]/20 text-[#c08e2a] dark:text-[#d6a738] flex items-center justify-center shrink-0">
                            <Building2 size={24} />
                          </div>
                          <div className="flex flex-col">
                            <h3 className="text-[#4a3f36] dark:text-white font-bold text-sm uppercase tracking-wide">{depto.nombre}</h3>
                            <p className="text-[#847563] dark:text-gray-400 text-xs mt-0.5">{actsDepto.length} actividades</p>
                          </div>
                        </div>
                        <div className="text-[#9c8e7c] dark:text-gray-500 mr-2">
                          {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </div>
                      </div>

                      {isOpen && (
                        <div className="p-4 sm:p-6 border-t border-[#d5cec2] dark:border-neutral-800 bg-[#faf8f4] dark:bg-black/20">
                          {renderListaPlanificadores(actsDepto)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2">
                {renderListaPlanificadores(planificadoresGrupales)}
              </div>
            )}
          </>
        )}
      </div>

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