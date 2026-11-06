'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Plus, Search, Calendar as CalendarIcon, 
  SearchX, LayoutGrid, ArrowLeft, Building2, ChevronDown, ChevronRight, ChevronLeft, User
} from 'lucide-react';
import { Actividad, Perfil } from '@/components/(administracion)/actividades/lib/zod';
import { useGestorActividades } from '@/components/(administracion)/actividades/lib/hooks';
import ActividadItem from './ActividadItem';
import NuevaActividad from './modals/NuevaActividad';
import CalendarioModulo from '@/components/(administracion)/common/CalendarioModulo';
import { smoothScrollToElement } from '@/lib/scroll-utils';

type DeptoEquipo = {
  id: string;
  nombre: string;
  miembros: string[];
};

interface Props {
  initialData: {
    actividades: Actividad[];
    usuarios: Perfil[];
    perfil: Perfil;
    departamentosEquipo?: DeptoEquipo[]; 
    isJefe?: boolean;
  };
  tipoVista: 'mis_actividades' | 'mi_equipo' | 'todas';
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function ActividadList({ initialData, tipoVista }: Props) {
  const { data } = useGestorActividades(tipoVista, initialData);
  
  const actividades = (data?.actividades || []) as Actividad[];
  const usuarios = (data?.usuarios || []) as Perfil[];
  const perfil = (data?.perfil || initialData.perfil) as Perfil;
  const departamentosEquipo = (data?.departamentosEquipo || initialData.departamentosEquipo || []) as DeptoEquipo[];
  const isJefe = data?.isJefe ?? initialData.isJefe ?? false;

  // --- ESTADOS ---
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [filtroVista, setFiltroVista] = useState<'TODAS' | 'MÍAS'>('TODAS');
  const [paginaTabla, setPaginaTabla] = useState(1);
  const ITEMS_POR_PAGINA = 5;
  const tablaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPaginaTabla(1);
  }, [mesSeleccionado, anioSeleccionado, diaSeleccionado, filtroEstado, busqueda]);

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

  const getCategoriaBadge = (status: string | null | undefined) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'completado') {
      return {
        label: 'Completado',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
      };
    }
    if (s === 'vencido') {
      return {
        label: 'Vencido',
        className: 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
      };
    }
    return {
      label: s ? s.toUpperCase() : 'Actividad',
      className: 'bg-sky-50 text-sky-700 border border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30'
    };
  };

  const formatFullDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const opciones: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    return dateObj.toLocaleDateString('es-ES', opciones);
  };

  const userRole = (perfil?.rol || '').toLowerCase().trim();
  const canViewAll = (userRole === 'admin' || userRole === 'super') && tipoVista === 'todas';

  const actividadesBase = useMemo(() => {
    if (!canViewAll || filtroVista === 'TODAS') return actividades;
    return actividades.filter(a => a.assigned_to === perfil.id || a.created_by === perfil.id);
  }, [actividades, canViewAll, filtroVista, perfil.id]);

  const eventosPorFecha = useMemo(() => {
    const map = new Map<string, number>();
    actividadesBase.forEach((a) => {
      if (!a.due_date) return;
      const d = new Date(a.due_date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      map.set(dateStr, (map.get(dateStr) || 0) + 1);
    });
    return map;
  }, [actividadesBase]);

  const stats = useMemo(() => {
    let count = 0;
    actividadesBase.forEach(a => {
      if (!a.due_date) return;
      const d = new Date(a.due_date);
      if (d.getMonth() === mesSeleccionado && d.getFullYear() === anioSeleccionado) {
        count++;
      }
    });
    return { actividades: count, servicios: 0 };
  }, [actividadesBase, mesSeleccionado, anioSeleccionado]);

  const searchParams = useSearchParams();
  const actividadIdParam = searchParams.get('actividadId');

  useEffect(() => {
    if (!actividadIdParam || !actividades || actividades.length === 0) return;

    const target = actividades.find(a => a.id === actividadIdParam);
    if (target) {
      if (target.due_date) {
        const d = new Date(target.due_date);
        setMesSeleccionado(d.getMonth());
        setAnioSeleccionado(d.getFullYear());
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setDiaSeleccionado(`${y}-${m}-${day}`);
      }
      if (target.status) {
        setFiltroEstado(target.status);
      }
      setBusqueda('');
      setExpandedId(actividadIdParam);

      setTimeout(() => {
        const el = document.getElementById(`actividad-${actividadIdParam}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);
    }
  }, [actividadIdParam, actividades]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [expandedDeptos, setExpandedDeptos] = useState<Record<string, boolean>>({});
  const toggleDepto = (id: string) => setExpandedDeptos(prev => ({...prev, [id]: !prev[id]}));

  // --- LÓGICA DE FILTRADO BASE (Fecha, Texto, Estado) ---
    // Resetear página al cambiar filtros
  useEffect(() => {
    setPaginaTabla(1);
  }, [diaSeleccionado, mesSeleccionado, anioSeleccionado, busqueda, filtroEstado, filtroVista]);

  // --- LÓGICA DE FILTRADO BASE (Fecha, Texto, Estado) ---
  const actividadesFiltradasRaw = useMemo(() => {
    return actividadesBase.filter((act: Actividad) => {
      if (!act.due_date) return false;
      const fecha = new Date(act.due_date);
      
      const coincideFecha = fecha.getMonth() === mesSeleccionado && fecha.getFullYear() === anioSeleccionado;
      if (!coincideFecha) return false;

      // Filtro exacto por día seleccionado si existe
      if (diaSeleccionado) {
        const y = fecha.getFullYear();
        const m = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        const actDateStr = `${y}-${m}-${day}`;
        if (actDateStr !== diaSeleccionado) return false;
      }
      
      const termino = busqueda.toLowerCase();
      const nombreAsignado = act.assignee?.nombre?.toLowerCase() || '';
      const coincideTexto = act.title.toLowerCase().includes(termino) || nombreAsignado.includes(termino);
      
      // Si hay un día seleccionado en el calendario, se ignora el filtro de estado para mostrar todas las actividades de esa fecha concreta.
      const coincideEstado = Boolean(diaSeleccionado) || filtroEstado === '' || act.status === filtroEstado;

      return coincideTexto && coincideEstado;
    });
  }, [actividadesBase, busqueda, mesSeleccionado, anioSeleccionado, diaSeleccionado, filtroEstado]);

  const actividadesIndividuales = useMemo(() => {
    return actividadesFiltradasRaw.filter(act => {
      // Casteamos a any para verificar si viene de la tabla de planificador (con integrantes)
      const actWithIntegrantes = act as any;

      if (actWithIntegrantes.integrantes && Array.isArray(actWithIntegrantes.integrantes)) {
        // Si tiene más de 1 integrante -> ES GRUPAL -> OCULTAR
        if (actWithIntegrantes.integrantes.length > 1) return false;

        // Si tiene 1 integrante, pero NO soy yo -> ES DELEGADA/GRUPAL -> OCULTAR
        if (actWithIntegrantes.integrantes.length === 1) {
           const integranteId = actWithIntegrantes.integrantes[0].usuario_id || actWithIntegrantes.integrantes[0].id;
           if (integranteId !== perfil.id) return false;
        }
      }
      
      // Si pasa las pruebas, es individual
      return true;
    });
  }, [actividadesFiltradasRaw, perfil.id]);


  // --- HELPERS VISUALES ---
  const getNombreFecha = (isoFormatted: string) => {
    if (isoFormatted === 'sin-fecha') return 'Sin fecha límite';
    // isoFormatted viene como YYYY-MM-DD local
    const [year, month, day] = isoFormatted.split('-').map(Number);
    const fechaObj = new Date(year, month - 1, day);
    const opciones: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    return fechaObj.toLocaleDateString('es-ES', opciones);
  };

  const aniosDisponibles = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i);

  // --- RENDERIZADO ---
  const renderListaActividades = (listaAProcesar: Actividad[]) => {
    let listaFinal = listaAProcesar;
    if (expandedId) {
      const actividadActiva = actividades.find(a => a.id === expandedId);
      if (actividadActiva) listaFinal = [actividadActiva];
    }

    const map: Record<string, Actividad[]> = {};
    listaFinal.forEach((act) => {
      let fechaKey = 'sin-fecha';
      
      if (act.due_date) {
        // En lugar de hacer split('T'), usamos el objeto Date para obtener el año/mes/día LOCAL
        const d = new Date(act.due_date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        fechaKey = `${y}-${m}-${day}`;
      }

      if (!map[fechaKey]) map[fechaKey] = [];
      map[fechaKey].push(act);
    });
    
    const grupos = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));

    if (grupos.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 bg-[#faf8f4] dark:bg-neutral-900/30 rounded-2xl border border-dashed border-[#d5cec2] dark:border-[#3e3630]">
          <SearchX size={36} className="text-[#d5cec2] mb-3" />
          <h3 className="text-sm font-bold text-[#9c8e7c]">No hay actividades individuales aquí</h3>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {grupos.map(([fecha, actividadesGrupo]) => (
          <div key={fecha} className="space-y-3 animate-in fade-in">
            <h3 className="flex items-center gap-2 text-[11px] font-black text-[#9c8e7c] dark:text-[#847563] uppercase tracking-[0.2em] ml-2">
              <CalendarIcon size={14} className="text-[#d6a738]" />
              {getNombreFecha(fecha)}
              <span className="ml-auto bg-[#faf8f4] dark:bg-neutral-800 text-[#4a3f36] dark:text-[#b9ae9f] px-2 py-0.5 rounded-lg text-[10px] font-bold">
                {actividadesGrupo.length}
              </span>
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {actividadesGrupo.map((act) => (
                <ActividadItem 
                  key={act.id} 
                  actividad={act} 
                  usuarios={usuarios} 
                  usuarioActualId={perfil.id}
                  isExpanded={expandedId === act.id} 
                  onToggle={() => setExpandedId(expandedId === act.id ? null : act.id)}
                  isJefe={isJefe} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const isVistaDepartamentos = (tipoVista === 'mi_equipo' || tipoVista === 'todas') && departamentosEquipo.length > 0;

  // Calculamos tareas individuales directas (no asociadas a un departamento en esta vista)
  const idsEnDeptos = departamentosEquipo.flatMap(d => d.miembros);
  const actosDirectos = actividadesIndividuales.filter(a => !idsEnDeptos.includes(a.assigned_to!));

  return (
    <div className="space-y-4 sm:space-y-6 font-sans max-w-[1750px] w-full mx-auto px-0.5 sm:px-3 lg:px-4">
      
      {!expandedId ? (
        <div className="flex flex-col gap-4 sm:gap-6 bg-white dark:bg-neutral-900 p-2.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#d5cec2] dark:border-[#3e3630] shadow-sm animate-in fade-in duration-300">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-base font-black text-[#4a3f36] dark:text-[#f4ebc3] flex items-center gap-2">
                <LayoutGrid className="text-[#d6a738]" size={20} />
                Gestor de Actividades
              </h1>
              <p className="text-sm text-[#847563] dark:text-[#b9ae9f] font-medium">
                {tipoVista === 'mis_actividades' && 'Mis tareas personales'}
                {tipoVista === 'mi_equipo' && 'Tareas individuales de mi equipo'}
                {tipoVista === 'todas' && 'Todas las tareas individuales'}
              </p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full md:w-auto bg-[#d6a738] hover:bg-[#c08e2a] text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-[#d6a738]/20 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95 text-sm"
            >
              <Plus size={18} /> Nueva Actividad
            </button>
          </div>

          <div className="flex flex-col xl:flex-row gap-4 items-center">
            
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide w-full xl:w-auto justify-start">
              {['Asignado', 'Completado', 'Vencido'].map((estado) => {
                // Count sobre la lista FILTRADA (solo individuales)
                const count = actividadesIndividuales.filter((act) => act.status === estado).length;
                const isActive = filtroEstado === estado;
                
                return (
                  <button
                    key={estado} 
                    onClick={() => {
                      if (diaSeleccionado) setDiaSeleccionado(null);
                      setFiltroEstado(prev => prev === estado ? '' : estado);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-2 ${isActive ? 'bg-[#d6a738] border-[#d6a738] text-white shadow-md' : 'bg-white dark:bg-neutral-800 border-[#d5cec2] dark:border-[#3e3630] text-[#847563] hover:border-[#d6a738]/50 dark:text-[#b9ae9f]'}`}
                  >
                    <span>{estado === 'Vencido' ? 'VENCIDOS' : estado.toUpperCase()}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] min-w-5 text-center ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-neutral-700 text-gray-500 dark:text-gray-400'}`}>{count}</span>
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
              
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center animate-in fade-in slide-in-from-left-4 duration-300">
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
          renderListaActividades(actividadesIndividuales)
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
                stats={stats}
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
              </div>

              {/* Contenido Tabla distribuido */}
              {actividadesIndividuales.length === 0 ? (
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
                        const itemsPagina = actividadesIndividuales.slice(
                          (paginaTabla - 1) * ITEMS_POR_PAGINA,
                          paginaTabla * ITEMS_POR_PAGINA
                        );
                        const slots = Array.from({ length: ITEMS_POR_PAGINA }, (_, i) => itemsPagina[i] || null);

                        return slots.map((act, index) => {
                          if (act) {
                            const badge = getCategoriaBadge(act.status);
                            const asignadoNombre = act.assignee?.nombre;

                            return (
                              <tr
                                key={act.id}
                                onClick={() => setExpandedId(act.id)}
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
                                    {act.title}
                                  </div>
                                  <div className="text-[11px] text-[#847563] dark:text-muted-foreground line-clamp-1 mt-0.5">
                                    {asignadoNombre ? `Asignado a: ${asignadoNombre}` : ''}
                                  </div>
                                </td>
                                <td className="w-36 sm:w-44 shrink-0 whitespace-nowrap text-[#847563] dark:text-muted-foreground text-left text-[11px] font-medium">
                                  {formatFechaTabla(act.due_date)}
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
              {actividadesIndividuales.length > 0 && (() => {
                const totalItems = actividadesIndividuales.length;
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

      <NuevaActividad 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        usuarios={usuarios}
        usuarioActualId={perfil.id}
        isJefe={isJefe} 
      />
    </div>
  );
}