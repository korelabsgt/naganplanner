'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Save, Sparkles, Loader2, Trash2, Layers, Tag, Users, UserPlus, ClipboardList, Dices, Building2, Briefcase, Plus, ChevronDown, Copy, Edit2, Calendar } from 'lucide-react';
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

// Estructura interna de un servicio en modo multi-servicio durante la creación
interface ServicioBorrador {
  id?: string;
  title: string;
  dueDate: string;
  description: string;
  status: string;
  modulo: ModuloType;
  integrantes: IntegranteUI[];
  checklist: ChecklistItem[];
  videosUrl: VideoAdjunto[];
}

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
  isDuplicating?: boolean;
  actividadesDelGrupo?: Planificador[];
}

export default function NuevoPlanificador({
  isOpen,
  onClose,
  usuarios,
  usuarioActualId,
  planificadorEditar,
  isJefe,
  modulo,
  tipoVista,
  departamentosEquipo = [],
  tiposServicio = [],
  isDuplicating = false,
  actividadesDelGrupo = []
}: Props) {
  const { guardar, guardarGrupo, agregarAlGrupo, eliminar } = usePlanificadorMutations();
  const { cargarMiembros, plantillas } = useGestorEquipos();

  const isEditing = !!planificadorEditar && !isDuplicating;
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

  // --- ESTADOS DE LA ACTIVIDAD ACTUAL ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedModulo, setSelectedModulo] = useState<ModuloType>('alabanza');
  const [selectedStatus, setSelectedStatus] = useState<string>('servicio');
  
  const [customStatusInput, setCustomStatusInput] = useState('');
  const [isStatusPopoverOpenDesktop, setIsStatusPopoverOpenDesktop] = useState(false);
  const [isStatusPopoverOpenMobile, setIsStatusPopoverOpenMobile] = useState(false);
  const [isModuloPopoverOpenDesktop, setIsModuloPopoverOpenDesktop] = useState(false);
  const [isModuloPopoverOpenMobile, setIsModuloPopoverOpenMobile] = useState(false);

  const [modoAsignacion, setModoAsignacion] = useState<ModoAsignacion>('INDIVIDUAL');
  const [integrantes, setIntegrantes] = useState<IntegranteUI[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [videosUrl, setVideosUrl] = useState<VideoAdjunto[]>([]);

  const [isGestorOpen, setIsGestorOpen] = useState(false);
  const [isRandomLoading, setIsRandomLoading] = useState(false);
  const [lastRandomIndex, setLastRandomIndex] = useState<number | null>(null);

  // --- ESTADOS MULTI-SERVICIO ---
  const [isMultiService, setIsMultiService] = useState(false);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [serviciosList, setServiciosList] = useState<ServicioBorrador[]>([]);

  // Regla de desactivación: si ya está guardado en base de datos con 2 o más servicios en el grupo
  const yaTieneVariosServiciosEnBD = useMemo(() => {
    if (!isEditing || !planificadorEditar?.group_id) return false;
    return actividadesDelGrupo.length >= 2;
  }, [isEditing, planificadorEditar?.group_id, actividadesDelGrupo.length]);

  const canDisableMultiService = !yaTieneVariosServiciosEnBD;

  // Ordenar los servicios del grupo cronológicamente para determinar cuál es el primer servicio
  const hermanosGrupoOrdenados = useMemo(() => {
    if (!actividadesDelGrupo || actividadesDelGrupo.length === 0) return [];
    return [...actividadesDelGrupo].sort((a, b) => {
      const tA = a.due_date ? new Date(a.due_date).getTime() : 0;
      const tB = b.due_date ? new Date(b.due_date).getTime() : 0;
      if (tA !== tB) return tA - tB;
      const cA = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
      const cB = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
      return cA - cB;
    });
  }, [actividadesDelGrupo]);

  const esEdicionEnGrupo = isEditing && !!planificadorEditar?.group_id && hermanosGrupoOrdenados.length > 1;
  const primerServicioEdicion = esEdicionEnGrupo ? hermanosGrupoOrdenados[0] : null;
  const esElPrimerServicioEnGrupo = esEdicionEnGrupo ? primerServicioEdicion?.id === planificadorEditar?.id : false;
  const esServicioPosteriorEnEdicion = esEdicionEnGrupo && !esElPrimerServicioEnGrupo;

  // Extraer fecha local YYYY-MM-DD del primer servicio sin desfase
  const fechaPrimerServicioLocal = useMemo(() => {
    if (!primerServicioEdicion?.due_date) return '';
    const d = new Date(primerServicioEdicion.due_date);
    if (isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }, [primerServicioEdicion]);

  // --- BLOQUEO DE SCROLL DEFINITIVO (PC + iOS Safari) ---
  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    const htmlStyle = document.documentElement.style.overflow;
    const bodyStyle = document.body.style.overflow;
    const bodyPos = document.body.style.position;
    const bodyTop = document.body.style.top;
    const bodyWidth = document.body.style.width;
    const bodyPadding = document.body.style.paddingRight;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.modal-scroll-area')) {
        if (e.cancelable) e.preventDefault();
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
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

  // Helper para crear un borrador por defecto
  const crearBorradorVacio = (idx: number, fechaBase: string = ''): ServicioBorrador => {
    const defaultMod = isReunionMode ? 'reunion' : (isModuloLocked ? (modulo === 'todas' ? 'alabanza' : modulo) : 'alabanza');
    const yo = usuarios.find(u => u.id === usuarioActualId);
    return {
      title: `Servicio ${idx + 1}`,
      dueDate: fechaBase || '',
      description: '',
      status: isReunionMode ? 'reunion' : 'servicio',
      modulo: defaultMod as ModuloType,
      integrantes: yo ? [{ usuario_id: yo.id, nombre: yo.nombre, avatar_url: yo.avatar_url, es_encargado: true, rol: '', is_new: true }] : [],
      checklist: [],
      videosUrl: []
    };
  };

  // Control de inicialización para evitar bucle de re-render al montar/abrir
  useEffect(() => {
    if (!isOpen) return;

    if (planificadorEditar) {
      const esGrupo = !!planificadorEditar.group_id && actividadesDelGrupo.length > 1;
      setIsMultiService(esGrupo);

      if (esGrupo) {
        const listaOrdenada = [...actividadesDelGrupo].sort((a, b) => {
          const tA = a.due_date ? new Date(a.due_date).getTime() : 0;
          const tB = b.due_date ? new Date(b.due_date).getTime() : 0;
          if (tA !== tB) return tA - tB;
          const cA = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
          const cB = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
          return cA - cB;
        });

        const borradores: ServicioBorrador[] = listaOrdenada.map(p => {
          let f = '';
          if (p.due_date) {
            const d = new Date(p.due_date);
            f = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          }
          return {
            id: p.id,
            title: p.title,
            dueDate: f,
            description: p.description || '',
            status: p.status || 'servicio',
            modulo: (p.modulo as ModuloType) || 'alabanza',
            integrantes: (p.integrantes || []).map(i => ({
              usuario_id: i.usuario_id,
              nombre: i.perfil?.nombre || 'Desconocido',
              avatar_url: i.perfil?.avatar_url,
              es_encargado: i.es_encargado,
              rol: i.rol || '',
              is_new: false
            })),
            checklist: p.checklist || [],
            videosUrl: p.videos_url || []
          };
        });

        const targetIdx = listaOrdenada.findIndex(p => p.id === planificadorEditar.id);
        const activeIdx = targetIdx >= 0 ? targetIdx : 0;

        setActiveTabIdx(activeIdx);
        setServiciosList(borradores);

        const activo = borradores[activeIdx];
        setTitle(activo.title);
        setDescription(activo.description);
        setSelectedModulo(activo.modulo);
        setSelectedStatus(activo.status);
        setDueDate(activo.dueDate);
        setIntegrantes(activo.integrantes);
        setChecklist(activo.checklist);
        setVideosUrl(activo.videosUrl);
        setModoAsignacion('INDIVIDUAL');
      } else {
        setTitle(planificadorEditar.title);
        setDescription(planificadorEditar.description || '');
        setSelectedModulo((planificadorEditar.modulo as ModuloType) || 'alabanza');
        const statusDB = planificadorEditar.status;
        setSelectedStatus(statusDB || 'servicio');

        let fechaCargada = '';
        if (planificadorEditar.due_date) {
          const d = new Date(planificadorEditar.due_date);
          fechaCargada = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setDueDate(fechaCargada);
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

        setActiveTabIdx(0);
        setServiciosList([]);
      }
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

      setIsMultiService(false);
      setActiveTabIdx(0);
      setServiciosList([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, planificadorEditar?.id]);

  // Cálculo de la fecha compartida para todos los servicios de la jornada
  const sharedDateCalculada = useMemo(() => {
    if (isEditing) {
      if (esServicioPosteriorEnEdicion) {
        return fechaPrimerServicioLocal || (dueDate ? dueDate.split('T')[0] : '');
      }
      return dueDate ? dueDate.split('T')[0] : '';
    }
    if (!isMultiService) return '';
    if (activeTabIdx === 0) {
      return dueDate ? dueDate.split('T')[0] : '';
    }
    return serviciosList[0]?.dueDate ? serviciosList[0].dueDate.split('T')[0] : (dueDate ? dueDate.split('T')[0] : '');
  }, [isEditing, esServicioPosteriorEnEdicion, fechaPrimerServicioLocal, isMultiService, activeTabIdx, dueDate, serviciosList]);

  // Manejo de cambio de fecha/hora con propagación de fecha compartida
  const handleDueDateChange = (newDueDate: string) => {
    setDueDate(newDueDate);

    // Si estamos en modo multi-servicio (creación)
    if (!isEditing && isMultiService) {
      if (activeTabIdx === 0) {
        // En Servicio 1: la fecha seleccionada se propaga a todos los demás servicios conservando sus horas
        const newDatePart = newDueDate ? newDueDate.split('T')[0] : '';
        setServiciosList(prevList => {
          if (!prevList || prevList.length === 0) return prevList;
          return prevList.map((serv, idx) => {
            if (idx === 0) {
              return { ...serv, dueDate: newDueDate };
            }
            const horaExistente = serv.dueDate && serv.dueDate.includes('T')
              ? serv.dueDate.split('T')[1]
              : '';
            return {
              ...serv,
              dueDate: newDatePart ? (horaExistente ? `${newDatePart}T${horaExistente}` : `${newDatePart}T`) : ''
            };
          });
        });
      } else {
        // En servicios posteriores: actualizar el dueDate en la lista de borradores
        setServiciosList(prevList => {
          if (!prevList || prevList.length <= activeTabIdx) return prevList;
          const copy = [...prevList];
          copy[activeTabIdx] = { ...copy[activeTabIdx], dueDate: newDueDate };
          return copy;
        });
      }
    }
  };

  // Manejo del Switch Multi-servicio
  const handleToggleMultiService = (checked: boolean) => {
    if (!checked && yaTieneVariosServiciosEnBD) {
      Swal.fire({
        icon: 'info',
        title: 'Acción bloqueada',
        text: 'Esta jornada ya tiene múltiples servicios registrados. No se puede desactivar el grupo.',
        background: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#fff',
      });
      return;
    }

    setIsMultiService(checked);

    if (checked) {
      // Si estamos creando una nueva actividad desde cero
      if (!isEditing) {
        const s1: ServicioBorrador = {
          title: title || '1er Servicio',
          dueDate,
          description,
          status: selectedStatus,
          modulo: selectedModulo,
          integrantes,
          checklist,
          videosUrl
        };
        const fechaServicio1 = dueDate ? dueDate.split('T')[0] : '';
        const s2: ServicioBorrador = crearBorradorVacio(1, fechaServicio1 ? `${fechaServicio1}T` : '');
        setServiciosList([s1, s2]);
        setActiveTabIdx(0);
      }
    } else {
      setServiciosList([]);
      setActiveTabIdx(0);
    }
  };

  // Cambio de pestaña en modo creación multi-servicio
  const handleCambiarTab = (nuevoIdx: number) => {
    if (nuevoIdx === activeTabIdx || nuevoIdx < 0 || nuevoIdx >= serviciosList.length) return;

    // Guardar el estado actual en el índice actual de la lista
    const listaActualizada = [...serviciosList];
    listaActualizada[activeTabIdx] = {
      ...listaActualizada[activeTabIdx],
      title,
      dueDate,
      description,
      status: selectedStatus,
      modulo: selectedModulo,
      integrantes,
      checklist,
      videosUrl
    };

    // Obtener la fecha del Servicio 1
    const fechaServicio1 = (activeTabIdx === 0 ? dueDate : listaActualizada[0]?.dueDate || '').split('T')[0];

    // Asegurar que todos los servicios posteriores mantengan sincronizada la fecha del Servicio 1
    if (fechaServicio1) {
      for (let i = 1; i < listaActualizada.length; i++) {
        const s = listaActualizada[i];
        const horaExistente = s.dueDate && s.dueDate.includes('T') ? s.dueDate.split('T')[1] : '';
        listaActualizada[i] = {
          ...s,
          dueDate: horaExistente ? `${fechaServicio1}T${horaExistente}` : `${fechaServicio1}T`
        };
      }
    }

    // Cargar los datos del nuevo tab
    const target = listaActualizada[nuevoIdx];
    setTitle(target.title);
    setDueDate(target.dueDate);
    setDescription(target.description);
    setSelectedStatus(target.status);
    setSelectedModulo(target.modulo);
    setIntegrantes(target.integrantes);
    setChecklist(target.checklist);
    setVideosUrl(target.videosUrl);

    setServiciosList(listaActualizada);
    setActiveTabIdx(nuevoIdx);
  };

  // Agregar un nuevo servicio (+ pestaña) en modo creación
  const handleAgregarPestana = () => {
    const listaActualizada = [...serviciosList];
    // Guardamos el servicio en el que estamos actualmente
    listaActualizada[activeTabIdx] = {
      title,
      dueDate,
      description,
      status: selectedStatus,
      modulo: selectedModulo,
      integrantes,
      checklist,
      videosUrl
    };

    const fechaServicio1 = (activeTabIdx === 0 ? dueDate : listaActualizada[0]?.dueDate || '').split('T')[0];

    const nuevoIdx = listaActualizada.length;
    const nuevoBorrador = crearBorradorVacio(nuevoIdx, fechaServicio1 ? `${fechaServicio1}T` : '');
    listaActualizada.push(nuevoBorrador);

    setServiciosList(listaActualizada);
    setActiveTabIdx(nuevoIdx);

    // Cargar nuevo borrador en inputs
    setTitle(nuevoBorrador.title);
    setDueDate(nuevoBorrador.dueDate);
    setDescription(nuevoBorrador.description);
    setSelectedStatus(nuevoBorrador.status);
    setSelectedModulo(nuevoBorrador.modulo);
    setIntegrantes(nuevoBorrador.integrantes);
    setChecklist(nuevoBorrador.checklist);
    setVideosUrl(nuevoBorrador.videosUrl);
  };

  // Eliminar pestaña en creación (mínimo deben quedar 2 si el switch sigue activo)
  const handleEliminarPestana = (idxAEliminar: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (serviciosList.length <= 2) {
      Swal.fire({
        icon: 'info',
        title: 'Mínimo 2 servicios',
        text: 'Una jornada con múltiples servicios debe tener al menos 2 servicios. Si solo deseas 1, apaga el interruptor.',
        background: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#fff',
      });
      return;
    }

    const nuevaLista = serviciosList.filter((_, i) => i !== idxAEliminar);

    // Si se eliminó el Servicio 1, actualizar la fecha base en los restantes
    if (idxAEliminar === 0 && nuevaLista.length > 0) {
      const nuevaFechaBase = nuevaLista[0].dueDate ? nuevaLista[0].dueDate.split('T')[0] : '';
      if (nuevaFechaBase) {
        for (let i = 1; i < nuevaLista.length; i++) {
          const s = nuevaLista[i];
          const hora = s.dueDate && s.dueDate.includes('T') ? s.dueDate.split('T')[1] : '';
          nuevaLista[i] = {
            ...s,
            dueDate: hora ? `${nuevaFechaBase}T${hora}` : `${nuevaFechaBase}T`
          };
        }
      }
    }

    setServiciosList(nuevaLista);

    // Si borramos la pestaña activa, cambiar a la primera
    const siguienteIdx = idxAEliminar === activeTabIdx ? 0 : (activeTabIdx > idxAEliminar ? activeTabIdx - 1 : activeTabIdx);
    setActiveTabIdx(siguienteIdx);

    const target = nuevaLista[siguienteIdx];
    setTitle(target.title);
    setDueDate(target.dueDate);
    setDescription(target.description);
    setSelectedStatus(target.status);
    setSelectedModulo(target.modulo);
    setIntegrantes(target.integrantes);
    setChecklist(target.checklist);
    setVideosUrl(target.videosUrl);
  };

  const handleDeleteComision = async () => {
    if (!planificadorEditar) return;
    const esMultiple = isMultiService && serviciosList.length > 1;
    const result = await Swal.fire({
      title: esMultiple ? '¿Eliminar todos los servicios?' : '¿Eliminar actividad?',
      text: esMultiple
        ? `Se eliminarán permanentemente los ${serviciosList.length} servicios de esta jornada y todos sus integrantes.`
        : "Se eliminará permanentemente el registro y sus integrantes.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: esMultiple ? 'Sí, eliminar todos' : 'Sí, eliminar',
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

  // ENVÍO DEL FORMULARIO
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ==========================================
    // CASO 1: CREACIÓN CON MÚLTIPLES SERVICIOS
    // ==========================================
    if (!isEditing && isMultiService && serviciosList.length > 0) {
      // Sincronizamos el tab actual antes de enviar
      const listaFinal = [...serviciosList];
      listaFinal[activeTabIdx] = {
        title,
        dueDate,
        description,
        status: selectedStatus,
        modulo: selectedModulo,
        integrantes,
        checklist,
        videosUrl
      };

      // Validar cada uno de los servicios
      for (let i = 0; i < listaFinal.length; i++) {
        const serv = listaFinal[i];
        if (!serv.title.trim()) {
          Swal.fire('Atención', `El Servicio ${i + 1} necesita un nombre.`, 'warning');
          handleCambiarTab(i);
          return;
        }
        if (!serv.dueDate || serv.dueDate.endsWith('T') || serv.dueDate.length < 16) {
          const mensajeHora = i === 0 ? 'fecha y hora completa' : 'una hora asignada';
          Swal.fire('Atención', `El Servicio ${i + 1} necesita ${mensajeHora}.`, 'warning');
          handleCambiarTab(i);
          return;
        }
        if (!serv.integrantes || serv.integrantes.length === 0) {
          Swal.fire('Atención', `El Servicio ${i + 1} debe tener al menos un integrante.`, 'warning');
          handleCambiarTab(i);
          return;
        }
        if (!serv.integrantes.some(int => int.es_encargado)) {
          Swal.fire('Atención', `El Servicio ${i + 1} debe tener al menos un Encargado (Líder).`, 'warning');
          handleCambiarTab(i);
          return;
        }
      }

      // Sincronizar fecha exacta del Servicio 1 en todos los servicios por seguridad
      const fechaServicio1 = listaFinal[0].dueDate.split('T')[0];
      for (let i = 1; i < listaFinal.length; i++) {
        const s = listaFinal[i];
        const hora = s.dueDate && s.dueDate.includes('T') ? s.dueDate.split('T')[1] : '';
        listaFinal[i].dueDate = hora ? `${fechaServicio1}T${hora}` : s.dueDate;
      }

      // Preparar payloads
      const payloads: PlanificadorForm[] = listaFinal.map(s => ({
        title: s.title,
        description: s.description,
        due_date: s.dueDate,
        checklist: s.checklist || [],
        modulo: s.modulo,
        status: s.status,
        videos_url: s.videosUrl || [],
        archivos_drive: [],
        alabanzas: [],
        integrantes: s.integrantes.map(it => ({
          usuario_id: it.usuario_id,
          es_encargado: it.es_encargado,
          rol: it.rol,
          es_nuevo: it.is_new
        }))
      }));

      try {
        await guardarGrupo.mutateAsync(payloads);
        Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }).fire({
          icon: 'success',
          title: `¡Jornada de ${payloads.length} servicios creada con éxito!`
        });
        onClose();
      } catch (err: any) {
        Swal.fire('Error', err.message || 'No se pudieron guardar los servicios', 'error');
      }
      return;
    }

    // ==========================================
    // CASO 2: EDICIÓN CON MÚLTIPLES SERVICIOS (JORNADA)
    // ==========================================
    if (isEditing && isMultiService && serviciosList.length > 0) {
      // Sincronizamos el tab actual antes de enviar
      const listaFinal = [...serviciosList];
      listaFinal[activeTabIdx] = {
        ...listaFinal[activeTabIdx],
        title,
        dueDate,
        description,
        status: selectedStatus,
        modulo: selectedModulo,
        integrantes,
        checklist,
        videosUrl
      };

      // Validar cada uno de los servicios
      for (let i = 0; i < listaFinal.length; i++) {
        const serv = listaFinal[i];
        if (!serv.title.trim()) {
          Swal.fire('Atención', `El Servicio ${i + 1} necesita un nombre.`, 'warning');
          handleCambiarTab(i);
          return;
        }
        if (!serv.dueDate || serv.dueDate.endsWith('T') || serv.dueDate.length < 16) {
          const mensajeHora = i === 0 ? 'fecha y hora completa' : 'una hora asignada';
          Swal.fire('Atención', `El Servicio ${i + 1} necesita ${mensajeHora}.`, 'warning');
          handleCambiarTab(i);
          return;
        }
        if (!serv.integrantes || serv.integrantes.length === 0) {
          Swal.fire('Atención', `El Servicio ${i + 1} debe tener al menos un integrante.`, 'warning');
          handleCambiarTab(i);
          return;
        }
        if (!serv.integrantes.some(int => int.es_encargado)) {
          Swal.fire('Atención', `El Servicio ${i + 1} debe tener al menos un Encargado (Líder).`, 'warning');
          handleCambiarTab(i);
          return;
        }
      }

      // Sincronizar fecha exacta del Servicio 1 en todos los servicios por seguridad
      const fechaServicio1 = listaFinal[0].dueDate.split('T')[0];
      for (let i = 1; i < listaFinal.length; i++) {
        const s = listaFinal[i];
        const hora = s.dueDate && s.dueDate.includes('T') ? s.dueDate.split('T')[1] : '';
        listaFinal[i].dueDate = hora ? `${fechaServicio1}T${hora}` : s.dueDate;
      }

      try {
        for (const s of listaFinal) {
          const sPayload: PlanificadorForm = {
            title: s.title,
            description: s.description,
            due_date: s.dueDate,
            checklist: s.checklist || [],
            modulo: s.modulo,
            status: s.status,
            videos_url: s.videosUrl || [],
            archivos_drive: [],
            alabanzas: [],
            group_id: planificadorEditar?.group_id || undefined,
            integrantes: s.integrantes.map(it => ({
              usuario_id: it.usuario_id,
              es_encargado: it.es_encargado,
              rol: it.rol,
              es_nuevo: it.is_new
            }))
          };
          if (s.id) {
            await guardar.mutateAsync({ data: sPayload, id: s.id });
          } else {
            await guardar.mutateAsync({ data: sPayload });
          }
        }

        Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }).fire({
          icon: 'success',
          title: `¡Jornada de servicios actualizada con éxito!`
        });
        onClose();
      } catch (err: any) {
        Swal.fire('Error', err.message || 'No se pudieron actualizar los servicios', 'error');
      }
      return;
    }

    // ==========================================
    // CASO 3: GUARDADO INDIVIDUAL / EDICIÓN NORMAL
    // ==========================================
    if (!integrantes.some(i => i.es_encargado)) {
      Swal.fire('Atención', 'Debes seleccionar al menos a un Encargado (Líder).', 'warning');
      return;
    }

    // Asegurar que si es un servicio posterior en edición, conserve estrictamente la fecha del primer servicio
    let finalDueDate = dueDate;
    if (isEditing && esServicioPosteriorEnEdicion && fechaPrimerServicioLocal) {
      const horaParte = dueDate && dueDate.includes('T') ? dueDate.split('T')[1] : '';
      if (horaParte) {
        finalDueDate = `${fechaPrimerServicioLocal}T${horaParte}`;
      }
    }

    const rawData = {
      title,
      description,
      due_date: finalDueDate,
      checklist: isDuplicating ? checklist.filter(c => !c.is_completed).map(c => ({ ...c, is_completed: false })) : checklist,
      modulo: selectedModulo,
      status: selectedStatus,
      videos_url: videosUrl,
      // Si estamos editando y el switch se activó pero aún no tenía group_id, dejamos que se maneje o se agregue
      group_id: planificadorEditar?.group_id || undefined,
      integrantes: integrantes.map(i => ({
        usuario_id: i.usuario_id,
        es_encargado: i.es_encargado,
        rol: i.rol,
        es_nuevo: i.is_new
      })),
      ...(isDuplicating && planificadorEditar?.id ? { origen_id_para_duplicar: planificadorEditar.id } : {})
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
      await guardar.mutateAsync({ data: rawData as PlanificadorForm, id: isDuplicating ? undefined : planificadorEditar?.id });
      onClose();
    } catch (error: any) { }
  };

  const isSaving = guardar.isPending || guardarGrupo.isPending || agregarAlGrupo.isPending;

  const renderStatusSelector = (isMobile: boolean = false) => {
    const isOpen = isMobile ? isStatusPopoverOpenMobile : isStatusPopoverOpenDesktop;
    const setIsOpen = isMobile ? setIsStatusPopoverOpenMobile : setIsStatusPopoverOpenDesktop;

    const handleAddNewType = () => {
      const cleanValue = customStatusInput.trim().toLowerCase();
      if (cleanValue) {
        setSelectedStatus(cleanValue);
        setCustomStatusInput('');
        setIsOpen(false);
      }
    };

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isSaving}
            className={`relative group h-9 flex items-center justify-center gap-1.5 px-3 bg-gray-100 dark:bg-neutral-800 border border-transparent hover:border-gray-200 dark:hover:border-neutral-700 rounded-lg transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : ''} ${isMobile ? 'flex-1 w-full' : 'min-w-[120px]'}`}
          >
            <Tag size={isMobile ? 12 : 13} className="text-gray-400 shrink-0" />
            <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 truncate`}>
              {serviciosVisibles.find(t => t.value === selectedStatus)?.label || selectedStatus}
            </span>
            <ChevronDown size={14} className="text-gray-400 shrink-0 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="center"
          side="bottom"
          sideOffset={8}
          className="w-56 p-2 bg-white dark:bg-[#131211] border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-[150]"
        >
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar">
            {serviciosVisibles.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => { setSelectedStatus(t.value); setIsOpen(false); }}
                className={`text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                  selectedStatus === t.value 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold' 
                    : 'hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300'
                }`}
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
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNewType();
                }
              }}
              className="flex-1 min-w-0 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={handleAddNewType}
              title="Añadir tipo"
              className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg transition-colors shrink-0 shadow-sm"
            >
              <Plus size={14} />
            </button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const renderModuloSelector = (isMobile: boolean = false) => {
    const isOpen = isMobile ? isModuloPopoverOpenMobile : isModuloPopoverOpenDesktop;
    const setIsOpen = isMobile ? setIsModuloPopoverOpenMobile : setIsModuloPopoverOpenDesktop;
    const isLocked = !!isModuloLocked || isSaving;

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isLocked}
            className={`relative group h-9 flex items-center justify-center gap-1.5 px-3 bg-gray-100 dark:bg-neutral-800 border border-transparent hover:border-gray-200 dark:hover:border-neutral-700 rounded-lg transition-all ${isLocked ? 'opacity-50 cursor-not-allowed' : ''} ${isMobile ? 'flex-1 w-full' : 'min-w-[120px]'}`}
          >
            <Layers size={isMobile ? 12 : 13} className="text-gray-400 shrink-0" />
            <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 truncate`}>
              {modulosVisibles.find(m => m.value === selectedModulo)?.label || selectedModulo}
            </span>
            <ChevronDown size={14} className="text-gray-400 shrink-0 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="center"
          side="bottom"
          sideOffset={8}
          className="w-56 p-2 bg-white dark:bg-[#131211] border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-[150]"
        >
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar">
            {modulosVisibles.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => { setSelectedModulo(m.value as ModuloType); setIsOpen(false); }}
                className={`text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                  selectedModulo === m.value 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold' 
                    : 'hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
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
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  {isDuplicating ? (
                    <>
                      <Copy size={24} className="text-blue-500" />
                      Duplicar Actividad
                    </>
                  ) : isEditing ? (
                    <>
                      <Edit2 size={24} className="text-blue-500" />
                      {isMultiService && serviciosList.length > 1
                        ? `Editar Servicio (${activeTabIdx === 0 ? '1er Servicio' : `Servicio ${activeTabIdx + 1}`})`
                        : 'Editar Actividad'}
                    </>
                  ) : (
                    <>
                      <Sparkles size={24} className="text-blue-500" />
                      Nueva Actividad
                    </>
                  )}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {isDuplicating
                    ? "Modifica los detalles antes de crear la copia."
                    : (isEditing ? "Modifica los detalles de esta actividad." : "Completa la información para registrar una actividad.")}
                </p>
              </div>

              <button onClick={onClose} className="sm:hidden p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-400 shrink-0">
                <X size={22} />
              </button>

              {!isReunionMode ? (
                <div className="hidden sm:flex items-center gap-2.5 shrink-0">
                  {renderStatusSelector(false)}
                  {renderModuloSelector(false)}

                  {/* Switch abreviado superior para PC (a la derecha y sin fondo) */}
                  {!isDuplicating && (
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-neutral-400 select-none">
                        Múltiples servicios
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={isMultiService}
                          disabled={isSaving || (isMultiService && !canDisableMultiService)}
                          onChange={(e) => {
                            if (isMultiService && !canDisableMultiService) return;
                            handleToggleMultiService(e.target.checked);
                          }}
                        />
                        <div
                          className={`w-8 h-4.5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-neutral-600 peer-checked:bg-emerald-500 dark:peer-checked:bg-emerald-500 ${
                            isMultiService && !canDisableMultiService ? 'opacity-70 cursor-not-allowed' : ''
                          }`}
                        />
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2.5 shrink-0">
                  {renderStatusSelector(false)}

                  {/* Switch abreviado superior para PC en modo reunión (a la derecha y sin fondo) */}
                  {!isDuplicating && (
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-neutral-400 select-none">
                        Múltiples servicios
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={isMultiService}
                          disabled={isSaving || (isMultiService && !canDisableMultiService)}
                          onChange={(e) => {
                            if (isMultiService && !canDisableMultiService) return;
                            handleToggleMultiService(e.target.checked);
                          }}
                        />
                        <div
                          className={`w-8 h-4.5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-neutral-600 peer-checked:bg-emerald-500 dark:peer-checked:bg-emerald-500 ${
                            isMultiService && !canDisableMultiService ? 'opacity-70 cursor-not-allowed' : ''
                          }`}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* VISTA MÓVIL (SELECTORES CON ESPACIO COMPLETO ORIGINAL) */}
            <div className="flex sm:hidden items-center gap-2 w-full">
              {isReunionMode ? (
                renderStatusSelector(true)
              ) : (
                <>
                  {renderStatusSelector(true)}
                  {renderModuloSelector(true)}
                </>
              )}
            </div>

            <button onClick={onClose} className="hidden sm:block p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-400 shrink-0">
              <X size={22} />
            </button>
          </div>

          {/* BARRA DE PESTAÑAS (Estilo con indicador inferior - Imagen 2) */}
          {isMultiService && serviciosList.length > 0 && (
            <div className="px-6 sm:px-8 bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-neutral-800 flex items-center gap-6 overflow-x-auto custom-scrollbar">
              {serviciosList.map((serv, idx) => {
                const isActive = activeTabIdx === idx;
                const fechaTab = idx === activeTabIdx ? dueDate : serv.dueDate;
                const horaTab = fechaTab && fechaTab.includes('T') ? fechaTab.split('T')[1]?.slice(0, 5) : '';

                return (
                  <div
                    key={idx}
                    className={`relative flex items-center gap-2 py-3 cursor-pointer shrink-0 transition-colors ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400 font-bold'
                        : 'text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200 font-medium'
                    }`}
                    onClick={() => handleCambiarTab(idx)}
                  >
                    <Calendar size={15} className={`shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-neutral-500'}`} />
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-xs sm:text-sm tracking-tight whitespace-nowrap">
                        {`Servicio ${idx + 1}`}
                      </span>
                      {horaTab && (
                        <span className="text-[10px] font-normal opacity-75">
                          {horaTab}
                        </span>
                      )}
                    </div>
                    {serviciosList.length > 2 && !isEditing && (
                      <span
                        onClick={(e) => handleEliminarPestana(idx, e)}
                        title="Eliminar este servicio"
                        className={`p-0.5 ml-0.5 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 ${
                          isActive ? 'text-blue-400 hover:text-red-500' : 'text-gray-400 hover:text-red-500'
                        }`}
                      >
                        <X size={12} />
                      </span>
                    )}

                    {/* Línea inferior activa */}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 dark:bg-blue-500 rounded-t-full shadow-sm" />
                    )}
                  </div>
                );
              })}

              {!isEditing && (
                <button
                  type="button"
                  onClick={handleAgregarPestana}
                  className="flex items-center gap-1.5 py-3 text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors shrink-0"
                >
                  <Plus size={14} />
                  <span>Agregar Servicio</span>
                </button>
              )}
            </div>
          )}

          {/* CONTENIDO */}
          <form id="form-comision" onSubmit={handleSubmit} className="modal-scroll-area flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-white dark:bg-[#1a1a1a] overscroll-contain">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12 h-full">

              {/* COLUMNA IZQUIERDA */}
              <div className="flex flex-col space-y-8 lg:pr-4">
                <SeccionGeneral
                  title={title} setTitle={setTitle}
                  description={description} setDescription={setDescription}
                  dueDate={dueDate} setDueDate={handleDueDateChange}
                  disabled={isSaving}
                  isMultiService={isMultiService}
                  onToggleMultiService={handleToggleMultiService}
                  canDisableMultiService={canDisableMultiService}
                  showMultiServiceSwitch={!isDuplicating && !isEditing}
                  isSubsequentService={isMultiService && activeTabIdx > 0}
                  sharedDate={
                    activeTabIdx === 0
                      ? (dueDate ? dueDate.split('T')[0] : '')
                      : (serviciosList[0]?.dueDate ? serviciosList[0].dueDate.split('T')[0] : (dueDate ? dueDate.split('T')[0] : ''))
                  }
                  isEditing={isEditing}
                />

                {!isEditing && selectedStatus !== 'reunion' && (
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
                      disabled={isSaving}
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
                disabled={isSaving || (integrantes.length === 0 && !isEditing)}
                className="flex items-center justify-center gap-2 px-12 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-500/20 disabled:opacity-70 transition-all transform active:scale-95 min-w-[160px]"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {isEditing ? 'Guardar' : (isMultiService ? `Crear (${serviciosList.length} servicios)` : 'Crear')}
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