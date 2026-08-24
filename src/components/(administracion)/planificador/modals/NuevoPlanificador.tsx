'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Save, Sparkles, Loader2, Trash2, Layers, Tag, Users, UserPlus, ClipboardList, Dices, Building2, Briefcase, Plus, ChevronDown } from 'lucide-react';
import Swal from 'sweetalert2';
import { usePlanificadorMutations, useGestorEquipos } from '../lib/hooks';
import { PlanificadorForm, planificadorFormSchema, Perfil, Planificador, ChecklistItem, VideoAdjunto } from '../lib/zod';

// Componentes de sección
import { SeccionGeneral } from './SeccionGeneral';
import { SeccionChecklist } from './SeccionChecklist';
import { SeccionEquipo, IntegranteUI } from './SeccionEquipo';
import GestorEquipos from './GestorEquipos';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const MODULOS_DISPONIBLES = [
  { value: 'alabanza', label: 'Alabanza' },
  { value: 'danza-damas', label: 'Danza Damas' },
  { value: 'danza-caballeros', label: 'Danza Caballeros' },
  { value: 'multimedia', label: 'Multimedia' },
  { value: 'reunion', label: 'Reunión' },
];

const TIPOS_SERVICIO = [
  { value: 'servicio', label: 'Servicio' },
  { value: 'ensayo', label: 'Ensayo' },
  { value: 'servicio_especial', label: 'Servicio Especial' },
  { value: 'reunion', label: 'Reunión' },
];

type ModuloType = 'alabanza' | 'danza' | 'danza-damas' | 'danza-caballeros' | 'multimedia' | 'reunion';
type StatusType = 'servicio' | 'ensayo' | 'servicio_especial' | 'reunion';
type ModoAsignacion = 'INDIVIDUAL' | 'EQUIPO' | 'DEPARTAMENTO';

type DeptoEquipo = {
  id: string;
  nombre: string;
  miembros: string[];
  parent_id?: string | null;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  usuarios: Perfil[];
  usuarioActualId: string;
  planificadorEditar?: Planificador | null;
  isJefe: boolean;
  modulo: 'alabanza' | 'danza' | 'danza-damas' | 'danza-caballeros' | 'multimedia' | 'todas' | string;
  tipoVista: 'mis_actividades' | 'mi_equipo' | 'todas';
  departamentosEquipo?: DeptoEquipo[];
  tiposServicio?: string[];
}

export default function NuevoPlanificador({ isOpen, onClose, usuarios, usuarioActualId, planificadorEditar, isJefe, modulo, tipoVista, departamentosEquipo = [], tiposServicio = [] }: Props) {
  const { guardar, eliminar } = usePlanificadorMutations();
  const { cargarMiembros, plantillas } = useGestorEquipos();

  const isEditing = !!planificadorEditar;
  const isModuloLocked = modulo && modulo !== 'todas';
  const isAdminGlobalView = tipoVista === 'todas';
  const isReunionView = modulo === 'reunion';
  const isReunionMode = isAdminGlobalView || isReunionView;

  const modulosVisibles = MODULOS_DISPONIBLES;

  const allStatusOptions = useMemo(() => {
    const base = [...TIPOS_SERVICIO];
    tiposServicio.forEach(ts => {
      if (!base.find(b => b.value.toLowerCase() === ts.toLowerCase())) {
        const label = ts.charAt(0).toUpperCase() + ts.slice(1).toLowerCase();
        base.push({ value: ts.toLowerCase(), label });
      }
    });
    return base;
  }, [tiposServicio]);

  const serviciosVisibles = allStatusOptions.filter(t => t.value !== 'borrador');

  // --- ESTADOS ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedModulo, setSelectedModulo] = useState<ModuloType>('alabanza');
  const [selectedStatus, setSelectedStatus] = useState<string>('servicio');
  
  const [customStatusInput, setCustomStatusInput] = useState('');
  const [isStatusPopoverOpenDesktop, setIsStatusPopoverOpenDesktop] = useState(false);
  const [isStatusPopoverOpenMobile, setIsStatusPopoverOpenMobile] = useState(false);

  const [modoAsignacion, setModoAsignacion] = useState<ModoAsignacion>('INDIVIDUAL');
  const [integrantes, setIntegrantes] = useState<IntegranteUI[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [videosUrl, setVideosUrl] = useState<VideoAdjunto[]>([]);

  const [isGestorOpen, setIsGestorOpen] = useState(false);
  const [isRandomLoading, setIsRandomLoading] = useState(false);
  const [lastRandomIndex, setLastRandomIndex] = useState<number | null>(null);

  // --- BLOQUEO DE SCROLL DEFINITIVO (PC + iOS Safari) ---
  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // 1. Guardar estilos originales para restaurarlos al cerrar
    const htmlStyle = document.documentElement.style.overflow;
    const bodyStyle = document.body.style.overflow;
    const bodyPos = document.body.style.position;
    const bodyTop = document.body.style.top;
    const bodyWidth = document.body.style.width;
    const bodyPadding = document.body.style.paddingRight;

    // 2. Aplicar bloqueo estricto (En iOS bloquear el body NO basta, hay que bloquear el html)
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // 3. Prevenir "scroll chaining" (el rebote elástico de iOS)
    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      // Si el usuario intenta hacer scroll tocando fuera del área permitida (ej. el fondo oscuro), lo bloqueamos
      if (!target.closest('.modal-scroll-area')) {
        if (e.cancelable) e.preventDefault();
      }
    };

    // { passive: false } es OBLIGATORIO en Safari para que preventDefault() funcione en eventos táctiles
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      // Restaurar todo exactamente como estaba
      document.documentElement.style.overflow = htmlStyle;
      document.body.style.overflow = bodyStyle;
      document.body.style.position = bodyPos;
      document.body.style.top = bodyTop;
      document.body.style.width = bodyWidth;
      document.body.style.paddingRight = bodyPadding;

      document.removeEventListener('touchmove', handleTouchMove);
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // --- FILTRO DE USUARIOS POR GÉNERO ---
  const usuariosDisponibles = useMemo(() => {
    if (tipoVista === 'mis_actividades') {
      if (selectedModulo === 'danza-damas') {
        return usuarios.filter(u => u.genero?.toLowerCase() === 'femenino');
      }
      if (selectedModulo === 'danza-caballeros') {
        return usuarios.filter(u => u.genero?.toLowerCase() === 'masculino');
      }
    }
    return usuarios;
  }, [usuarios, selectedModulo, tipoVista]);

  // --- ORDEN DE JERARQUÍA PARA EL SELECTOR ---
  const departamentosOrdenados = useMemo(() => {
    if (!departamentosEquipo || departamentosEquipo.length === 0) return [];

    const mapa = new Map<string, any>();
    departamentosEquipo.forEach(d => {
      mapa.set(d.id, { ...d, children: [] });
    });

    const roots: any[] = [];
    mapa.forEach(d => {
      if (d.parent_id && mapa.has(d.parent_id)) {
        mapa.get(d.parent_id).children.push(d);
      } else {
        roots.push(d);
      }
    });

    const flattened: (DeptoEquipo & { level: number })[] = [];

    const flatten = (node: any, level: number) => {
      flattened.push({ ...node, level });
      if (node.children) {
        node.children.forEach((child: any) => flatten(child, level + 1));
      }
    };

    roots.forEach(root => flatten(root, 0));

    return flattened;
  }, [departamentosEquipo]);

  // CARGA DE DATOS
  useEffect(() => {
    if (isOpen) {
      if (planificadorEditar) {
        setTitle(planificadorEditar.title);
        setDescription(planificadorEditar.description || '');
        setSelectedModulo((planificadorEditar.modulo as ModuloType) || 'alabanza');
        const statusDB = planificadorEditar.status;
        setSelectedStatus(statusDB || 'servicio');

        if (planificadorEditar.due_date) {
          const d = new Date(planificadorEditar.due_date);
          const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setDueDate(localISO);
        }

        const mapped = planificadorEditar.integrantes.map(i => ({
          usuario_id: i.usuario_id,
          nombre: i.perfil?.nombre || 'Desconocido',
          avatar_url: i.perfil?.avatar_url,
          es_encargado: i.es_encargado,
          rol: i.rol || '',
          is_new: false
        }));
        setIntegrantes(mapped);
        setChecklist(planificadorEditar.checklist || []);
        setVideosUrl(planificadorEditar.videos_url || []);
        setModoAsignacion('INDIVIDUAL');

      } else {
        setTitle('');
        setDescription('');
        setDueDate('');
        setChecklist([]);
        setVideosUrl([]);
        setModoAsignacion('INDIVIDUAL');
        const defaultMod = isReunionMode ? 'reunion' : (isModuloLocked ? (modulo === 'todas' ? 'alabanza' : modulo) : 'alabanza');
        setSelectedModulo(defaultMod as ModuloType);
        setSelectedStatus(isReunionMode ? 'reunion' : 'servicio');
        const yo = usuarios.find(u => u.id === usuarioActualId);
        setIntegrantes(yo ? [{ usuario_id: yo.id, nombre: yo.nombre, avatar_url: yo.avatar_url, es_encargado: true, rol: '', is_new: true }] : []);
      }
    }
  }, [isOpen, planificadorEditar, usuarios, usuarioActualId, modulo, isModuloLocked]);

  const handleDeleteComision = async () => {
    if (!planificadorEditar) return;
    const result = await Swal.fire({
      title: '¿Eliminar actividad?',
      text: "Se eliminará permanentemente el registro y sus integrantes.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#fff',
      color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
    });

    if (result.isConfirmed) {
      try {
        await eliminar.mutateAsync(planificadorEditar.id);
        onClose();
      } catch (e: any) { }
    }
  };

  const handleSelectPlantilla = async (plantillaId: string, nombrePlantilla?: string) => {
    try {
      const nuevosMiembros = await cargarMiembros.mutateAsync(plantillaId) as any;
      setIntegrantes(nuevosMiembros);

      const msg = nombrePlantilla
        ? `¡Equipo "${nombrePlantilla}" cargado!`
        : 'Equipo cargado correctamente';

      Swal.mixin({
        toast: true, position: 'top-end', showConfirmButton: false, timer: 2000
      }).fire({ icon: 'success', title: msg });

    } catch (error) {
      Swal.fire('Error', 'No se pudo cargar la plantilla', 'error');
    }
  };

  const handleRandomTeam = async () => {
    if (!plantillas || plantillas.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin equipos',
        text: 'Primero debes crear plantillas en el Gestor de Equipos.',
        toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
      });
      return;
    }

    setIsRandomLoading(true);
    await new Promise(resolve => setTimeout(resolve, 600));

    let randomIndex;

    if (plantillas.length === 1) {
      randomIndex = 0;
    } else {
      do {
        randomIndex = Math.floor(Math.random() * plantillas.length);
      } while (randomIndex === lastRandomIndex);
    }

    setLastRandomIndex(randomIndex);

    const randomTemplate = plantillas[randomIndex];
    await handleSelectPlantilla(randomTemplate.id, randomTemplate.nombre);

    setIsRandomLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!integrantes.some(i => i.es_encargado)) {
      Swal.fire('Atención', 'Debes seleccionar al menos a un Encargado (Líder).', 'warning');
      return;
    }
    const rawData = {
      title,
      description,
      due_date: dueDate,
      checklist,
      modulo: selectedModulo,
      status: selectedStatus,
      videos_url: videosUrl,
      integrantes: integrantes.map(i => ({
        usuario_id: i.usuario_id,
        es_encargado: i.es_encargado,
        rol: i.rol,
        es_nuevo: i.is_new
      }))
    };
    const validation = planificadorFormSchema.safeParse(rawData);
    if (!validation.success) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: validation.error.issues[0].message,
        background: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#fff',
      });
      return;
    }
    try {
      await guardar.mutateAsync({ data: rawData as PlanificadorForm, id: planificadorEditar?.id });
      onClose();
    } catch (error: any) { }
  };

  const renderStatusSelector = (isMobile: boolean = false) => {
    const isOpen = isMobile ? isStatusPopoverOpenMobile : isStatusPopoverOpenDesktop;
    const setIsOpen = isMobile ? setIsStatusPopoverOpenMobile : setIsStatusPopoverOpenDesktop;
    
    return (
      <div className={`relative ${isMobile ? 'flex-1' : ''}`}>
        <button
          type="button"
          disabled={guardar.isPending}
          onClick={() => setIsOpen(!isOpen)}
          className={`relative group h-9 flex items-center justify-center w-full gap-1.5 px-3 bg-gray-100 dark:bg-neutral-800 border border-transparent hover:border-gray-200 dark:hover:border-neutral-700 rounded-lg transition-all ${guardar.isPending ? 'opacity-50 cursor-not-allowed' : ''} ${isMobile ? '' : 'min-w-[120px]'}`}
        >
          <Tag size={isMobile ? 12 : 13} className="text-gray-400 shrink-0" />
          <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 truncate`}>
            {serviciosVisibles.find(t => t.value === selectedStatus)?.label || selectedStatus}
          </span>
          <ChevronDown size={14} className="text-gray-400 shrink-0 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 mt-2 w-56 p-2 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 origin-top-left">
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar">
                {serviciosVisibles.map(t => (
                  <button
                    key={t.value}
                    onClick={() => { setSelectedStatus(t.value); setIsOpen(false); }}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedStatus === t.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold' : 'hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-neutral-800 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nuevo tipo..."
                  value={customStatusInput}
                  onChange={(e) => setCustomStatusInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customStatusInput.trim()) {
                      e.preventDefault();
                      setSelectedStatus(customStatusInput.trim().toLowerCase());
                      setCustomStatusInput('');
                      setIsOpen(false);
                    }
                  }}
                  className="flex-1 w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-neutral-800 rounded-md px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customStatusInput.trim()) {
                      setSelectedStatus(customStatusInput.trim().toLowerCase());
                      setCustomStatusInput('');
                      setIsOpen(false);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-md transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300 sm:p-4"
        style={{ touchAction: 'none' }}
      >
        <div
          className="bg-white dark:bg-[#1a1a1a] w-full h-full sm:max-w-7xl sm:h-[90vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border-0 sm:border border-gray-100 dark:border-neutral-800"
          style={{ touchAction: 'pan-y' }}
        >

          {/* HEADER */}
          <div className="px-6 sm:px-8 py-4 sm:py-5 border-b border-gray-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-white dark:bg-[#1a1a1a]">

            <div className="flex items-center justify-between sm:justify-start gap-3 flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 whitespace-nowrap shrink-0">
                {isEditing ? <Save className="text-blue-600" size={20} /> : <Sparkles className="text-blue-600" size={20} />}
                {isEditing ? 'Editar Actividad' : 'Nueva Actividad'}
              </h2>

              <button onClick={onClose} className="sm:hidden p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-400 shrink-0">
                <X size={22} />
              </button>

              {!isReunionMode ? (
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  {renderStatusSelector(false)}
                  <div className="relative group h-9 min-w-[120px]">
                    <div className="absolute inset-0 flex items-center justify-center gap-2 px-3 bg-gray-100 dark:bg-neutral-800 border border-transparent group-hover:border-gray-200 dark:group-hover:border-neutral-700 rounded-lg pointer-events-none transition-all">
                      <Layers size={13} className="text-gray-400 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300 truncate">
                        {modulosVisibles.find(m => m.value === selectedModulo)?.label || selectedModulo}
                      </span>
                    </div>
                    <select value={selectedModulo} onChange={(e) => setSelectedModulo(e.target.value as ModuloType)} disabled={!!isModuloLocked || guardar.isPending} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100">
                      {modulosVisibles.map(m => <option className="bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  {renderStatusSelector(false)}
                </div>
              )}
            </div>

            <div className="flex sm:hidden items-center gap-2 w-full">
              {isReunionMode ? (
                renderStatusSelector(true)
              ) : (
                <>
                  {renderStatusSelector(true)}
                  <div className="relative group h-9 flex-1">
                    <div className="absolute inset-0 flex items-center justify-center gap-2 px-3 bg-gray-100 dark:bg-neutral-800 border border-transparent rounded-lg pointer-events-none">
                      <Layers size={13} className="text-gray-400 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300 truncate">
                        {modulosVisibles.find(m => m.value === selectedModulo)?.label || selectedModulo}
                      </span>
                    </div>
                    <select value={selectedModulo} onChange={(e) => setSelectedModulo(e.target.value as ModuloType)} disabled={!!isModuloLocked || guardar.isPending} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100">
                      {modulosVisibles.map(m => <option className="bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>

            <button onClick={onClose} className="hidden sm:block p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-400 shrink-0">
              <X size={22} />
            </button>
          </div>

          {/* CONTENIDO - Añadido overscroll-contain aquí */}
          <form id="form-comision" onSubmit={handleSubmit} className="modal-scroll-area flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-white dark:bg-[#1a1a1a] overscroll-contain">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12 h-full">

              {/* COLUMNA IZQUIERDA */}
              <div className="flex flex-col space-y-8 lg:pr-4">
                <SeccionGeneral
                  title={title} setTitle={setTitle}
                  description={description} setDescription={setDescription}
                  dueDate={dueDate} setDueDate={setDueDate}
                  disabled={guardar.isPending}
                />

                {!isEditing && (
                  <div className="animate-in fade-in duration-300">
                    <div className="h-px bg-gray-100 dark:bg-neutral-800 mb-8" />
                    <SeccionChecklist checklist={checklist} setChecklist={setChecklist} />
                  </div>
                )}
              </div>

              {/* COLUMNA DERECHA */}
              {(!isEditing || selectedModulo === 'reunion') && (
                <div className="flex flex-col space-y-4 lg:pl-6 lg:border-l lg:border-gray-100 dark:lg:border-neutral-800 h-full animate-in fade-in duration-300">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        <Users size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800 dark:text-white leading-none">
                          Asignación de Miembros
                        </span>
                        {integrantes.length > 0 && (
                          <span className="text-[10px] text-gray-500 font-medium mt-0.5">
                            {integrantes.length} {integrantes.length === 1 ? 'miembro seleccionado' : 'miembros seleccionados'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                      <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-xl w-full sm:w-fit border border-gray-200 dark:border-neutral-700">
                        <button
                          type="button"
                          onClick={() => setModoAsignacion('INDIVIDUAL')}
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${modoAsignacion === 'INDIVIDUAL' ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                          <UserPlus size={14} /> Individual
                        </button>
                        <button
                          type="button"
                          onClick={() => setModoAsignacion('EQUIPO')}
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${modoAsignacion === 'EQUIPO' ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                          <Users size={14} /> Equipos
                        </button>

                        {isAdminGlobalView && (
                          <button
                            type="button"
                            onClick={() => setModoAsignacion('DEPARTAMENTO')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${modoAsignacion === 'DEPARTAMENTO' ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                          >
                            <Briefcase size={14} /> Departamentos
                          </button>
                        )}
                      </div>

                      {modoAsignacion === 'EQUIPO' && (
                        <div className="flex items-center gap-2 w-full sm:w-auto animate-in fade-in slide-in-from-right-2">
                          <button
                            type="button"
                            onClick={() => setIsGestorOpen(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
                          >
                            <ClipboardList size={14} />
                            <span>Elegir Equipo</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleRandomTeam}
                            disabled={isRandomLoading}
                            className="flex-1 sm:flex-none relative flex items-center justify-center gap-2 px-3 py-2 sm:py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:shadow-[0_0_25px_rgba(245,158,11,0.6)] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed group overflow-hidden border border-amber-400/30"
                            title="Seleccionar equipo al azar"
                          >
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                            <Dices size={15} className={`relative z-10 ${isRandomLoading ? "animate-spin" : "group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-300"}`} />
                            <span className="relative z-10 drop-shadow-md tracking-wide">Azar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 mt-2">
                    {modoAsignacion === 'DEPARTAMENTO' && (
                      <div className="mb-4 p-4 border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 rounded-2xl animate-in slide-in-from-top-2">
                        <label className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-widest mb-2 block flex items-center gap-2">
                          <Building2 size={14} /> Seleccionar Departamento:
                        </label>
                        <select
                          className="w-full bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-800 text-sm p-3 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all cursor-pointer font-bold text-gray-700 dark:text-gray-200"
                          defaultValue=""
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            if (!selectedId) return;

                            const deptoSeleccionado = departamentosEquipo.find(d => d.id === selectedId);
                            if (deptoSeleccionado) {
                              const obtenerIdsFamilia = (padreId: string): string[] => {
                                const hijos = departamentosEquipo.filter(d => d.parent_id === padreId).map(d => d.id);
                                let todos = [padreId, ...hijos];
                                hijos.forEach(hijoId => {
                                  todos = [...todos, ...obtenerIdsFamilia(hijoId).filter(id => id !== hijoId)];
                                });
                                return todos;
                              };

                              const todosLosIds = obtenerIdsFamilia(selectedId);
                              const miembrosTotalesIds = new Set<string>();

                              departamentosEquipo
                                .filter(d => todosLosIds.includes(d.id))
                                .forEach(d => {
                                  d.miembros.forEach(mId => miembrosTotalesIds.add(mId));
                                });

                              const miembrosDepto = usuariosDisponibles.filter(u => miembrosTotalesIds.has(u.id));
                              const nuevos = miembrosDepto
                                .filter(u => !integrantes.some(i => i.usuario_id === u.id))
                                .map(u => ({
                                  usuario_id: u.id,
                                  nombre: u.nombre,
                                  avatar_url: u.avatar_url,
                                  es_encargado: false,
                                  rol: '',
                                  is_new: true
                                }));

                              if (nuevos.length > 0) {
                                setIntegrantes([...integrantes, ...nuevos]);
                                Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 }).fire({
                                  icon: 'success',
                                  title: `¡${nuevos.length} miembros añadidos!`,
                                });
                              } else {
                                Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 }).fire({ icon: 'info', title: 'Todos ya están en la lista' });
                              }
                            }
                            e.target.value = "";
                          }}
                        >
                          <option value="" disabled hidden>Elige un departamento de la lista...</option>
                          {departamentosOrdenados.map(d => {
                            const prefix = d.level > 0 ? "— ".repeat(d.level) + " " : "";
                            return (
                              <option key={d.id} value={d.id}>
                                {prefix}{d.nombre.toUpperCase()}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}
                    <SeccionEquipo
                      integrantes={integrantes}
                      setIntegrantes={setIntegrantes}
                      usuarios={usuariosDisponibles}
                      disabled={guardar.isPending}
                      hideSearch={modoAsignacion !== 'INDIVIDUAL'}
                    />
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* FOOTER */}
          <div className="px-8 py-5 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-[#1a1a1a] flex justify-between gap-3">
            {isEditing && (
              <button
                type="button"
                onClick={handleDeleteComision}
                disabled={eliminar.isPending}
                className="flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
              >
                {eliminar.isPending ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                <span className="hidden sm:inline">Eliminar Actividad</span>
              </button>
            )}

            <div className="flex justify-center w-full">
              <button
                type="submit"
                form="form-comision"
                disabled={guardar.isPending || (integrantes.length === 0 && !isEditing)}
                className="flex items-center justify-center gap-2 px-12 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-500/20 disabled:opacity-70 transition-all transform active:scale-95 min-w-[160px]"
              >
                {guardar.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {isEditing ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <GestorEquipos
        isOpen={isGestorOpen}
        onClose={() => setIsGestorOpen(false)}
        usuarios={usuariosDisponibles}
        onSelectPlantilla={(id) => handleSelectPlantilla(id)}
      />
    </>
  );
}