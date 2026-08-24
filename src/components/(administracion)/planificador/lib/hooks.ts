'use client';

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

import {
  obtenerDatosPlanificador,
  guardarPlanificador,
  eliminarPlanificador,
  responderInvitacionComision,
  removerMiembroComision,
  sustituirMiembroComision,
  actualizarChecklistPlanificador,
  guardarVideo,
  eliminarVideo,
  guardarAdjunto,
  eliminarAdjunto,
  guardarDrive,
  eliminarDrive,
  // Importaciones para el Gestor de Equipos
  obtenerPlantillasEquipos,
  guardarPlantillaEquipo,
  eliminarPlantillaEquipo,
  cargarMiembrosDePlantilla,
  obtenerRolesExistentes,
  obtenerRegistroSustituciones,
  sincronizarRepertorioActividad,
  marcarAsistenciaUbicacion,
  clonarRepertorio,
  guardarDonEspiritual,
  eliminarDonEspiritual
} from "./actions";

import {
  PlanificadorForm,
  Planificador,
  Perfil,
  VideoAdjunto,
  Adjunto,
  EquipoPlantilla,
  DonEspiritual
} from "./zod";

const CACHE_TIME = 1000 * 60 * 6;

const PLANIFICADOR_KEYS = {
  gestor: (vista: string, modulo: string) => ["gestor-planificador", vista, modulo],
  all: ["gestor-planificador"]
};

// =========================================================================
// 1. HOOK DE LECTURA (SUSCRIPCIÓN A DATOS)
// =========================================================================
export const useGestorPlanificador = (
  tipoVista: 'mis_actividades' | 'mi_equipo' | 'todas',
  modulo: 'alabanza' | 'danza' | 'danza-damas' | 'danza-caballeros' | 'multimedia' | 'todas' | 'reunion' | string,
  initialData?: any
) => {
  return useQuery({
    queryKey: PLANIFICADOR_KEYS.gestor(tipoVista, modulo),
    queryFn: () => obtenerDatosPlanificador(tipoVista, modulo),
    initialData,
    staleTime: CACHE_TIME,
  });
};

export const useRegistroSustituciones = () => {
  return useQuery({
    queryKey: ["registro-sustituciones"],
    queryFn: () => obtenerRegistroSustituciones(),
    staleTime: CACHE_TIME,
  });
};

// =========================================================================
// 2. HOOK DE MUTACIONES (CONTROL DE ESCRITURA Y CACHÉ)
// =========================================================================
export const usePlanificadorMutations = () => {
  const queryClient = useQueryClient();

  const invalidar = () => queryClient.invalidateQueries({ queryKey: PLANIFICADOR_KEYS.all });

  // --- Actividades ---
  const guardar = useMutation({
    mutationFn: ({ data, id }: { data: PlanificadorForm, id?: string }) => guardarPlanificador(data, id),
    onSuccess: invalidar,
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => eliminarPlanificador(id),
    onSuccess: invalidar,
  });

  // --- Gestión de Integrantes ---
  const responderInvitacion = useMutation({
    mutationFn: ({ actividad_id, aceptada, motivo }: { actividad_id: string, aceptada: boolean, motivo?: string }) =>
      responderInvitacionComision(actividad_id, aceptada, motivo),
    onSuccess: invalidar,
  });

  const darDeBaja = useMutation({
    mutationFn: ({ actividad_id, usuario_id, motivo }: { actividad_id: string, usuario_id: string, motivo: string }) =>
      removerMiembroComision(actividad_id, usuario_id, motivo),
    onSuccess: invalidar,
  });

  const sustituirMiembro = useMutation({
    mutationFn: ({ actividad_id, usuario_actual, usuario_nuevo, justificacion }: { actividad_id: string, usuario_actual: string, usuario_nuevo: string, justificacion: string }) =>
      sustituirMiembroComision(actividad_id, usuario_actual, usuario_nuevo, justificacion),
    onSuccess: invalidar,
  });

  // --- Checklist ---
  const updateChecklist = useMutation({
    mutationFn: ({ id, items }: { id: string, items: any[] }) =>
      actualizarChecklistPlanificador(id, items),
    onSuccess: invalidar,
  });
  
  const marcarAsistencia = useMutation({
    mutationFn: ({ actividadId, usuarioId, tipo, lat, lng, fecha }: { 
      actividadId: string, 
      usuarioId: string, 
      tipo: 'entrada' | 'salida', 
      lat: number, 
      lng: number, 
      fecha: string 
    }) => marcarAsistenciaUbicacion(actividadId, usuarioId, tipo, lat, lng, fecha),
    onSuccess: invalidar,
  });

  // --- Mutaciones de Video ---
  const mutationAgregarVideo = useMutation({
    mutationFn: ({ id, video }: { id: string, video: VideoAdjunto }) => guardarVideo(id, video),
    onSuccess: invalidar,
  });

  const mutationBorrarVideo = useMutation({
    mutationFn: ({ id, videoId }: { id: string, videoId: string }) => eliminarVideo(id, videoId),
    onSuccess: invalidar,
  });

  // --- Mutaciones de Archivos ---
  const mutationAgregarAdjunto = useMutation({
    mutationFn: ({ id, adjunto }: { id: string, adjunto: Adjunto }) => guardarAdjunto(id, adjunto),
    onSuccess: invalidar,
  });

  const mutationBorrarAdjunto = useMutation({
    mutationFn: ({ id, url }: { id: string, url: string }) => eliminarAdjunto(id, url),
    onSuccess: invalidar,
  });

  // --- Mutaciones de Drive ---
  const mutationAgregarDrive = useMutation({
    mutationFn: ({ id, archivo }: { id: string, archivo: { id: string, nombre: string, url: string } }) => guardarDrive(id, archivo),
    onSuccess: invalidar,
  });

  const mutationBorrarDrive = useMutation({
    mutationFn: ({ id, driveId }: { id: string, driveId: string }) => eliminarDrive(id, driveId),
    onSuccess: invalidar,
  });

  // --- Mutaciones de Dones Espirituales ---
  const mutationAgregarDon = useMutation({
    mutationFn: ({ id, don }: { id: string, don: Partial<DonEspiritual> }) => guardarDonEspiritual(id, don),
    onSuccess: invalidar,
  });

  const mutationBorrarDon = useMutation({
    mutationFn: ({ donId }: { donId: string }) => eliminarDonEspiritual(donId),
    onSuccess: invalidar,
  });

  const mutationSincronizarRepertorio = useMutation({
    mutationFn: ({ id, alabanzasIds }: { id: string, alabanzasIds: string[] }) => sincronizarRepertorioActividad(id, alabanzasIds),
    onSuccess: invalidar,
  });

  const mutationImportarRepertorio = useMutation({
    mutationFn: ({ origenId, destinoId }: { origenId: string, destinoId: string }) => clonarRepertorio(origenId, destinoId),
    onSuccess: invalidar,
  });

  return {
    guardar,
    eliminar,
    responderInvitacion,
    darDeBaja,
    sustituirMiembro,
    updateChecklist,
    agregarVideo: mutationAgregarVideo,
    borrarVideo: mutationBorrarVideo,
    agregarAdjunto: mutationAgregarAdjunto,
    borrarAdjunto: mutationBorrarAdjunto,
    agregarDrive: mutationAgregarDrive,
    borrarDrive: mutationBorrarDrive,
    marcarAsistencia,
    sincronizarRepertorio: mutationSincronizarRepertorio,
    importarRepertorio: mutationImportarRepertorio,
    agregarDon: mutationAgregarDon,
    borrarDon: mutationBorrarDon,
    isLoading: guardar.isPending || eliminar.isPending || responderInvitacion.isPending ||
      darDeBaja.isPending || sustituirMiembro.isPending || updateChecklist.isPending ||
      mutationAgregarVideo.isPending || mutationAgregarAdjunto.isPending || mutationAgregarDrive.isPending
  };
};

// =========================================================================
// 3. HOOK DE LÓGICA DE UI (VISUALIZACIÓN Y MODALES)
// =========================================================================

const swalBaseStyles = {
  popup: 'rounded-3xl shadow-2xl border border-gray-100 dark:border-neutral-800',
  title: 'text-xl font-black pt-4',
  htmlContainer: 'text-sm text-gray-500 dark:text-gray-400',
  actions: 'flex gap-3 justify-center mt-6 pb-4 w-full flex-wrap',
  cancelButton: 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700 font-bold rounded-xl px-6 py-2.5 transition-all',
  input: 'w-[90%] mx-auto mt-4 px-4 py-3 border border-gray-200 dark:border-neutral-700 rounded-xl bg-gray-50 dark:bg-[#262626] text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm dark:[&>option]:bg-[#262626] dark:[&>option]:text-white',
};

export const usePlanificadorLogic = (
  planificador: Planificador,
  usuarioActualId: string,
  usuarios: Perfil[],
  isJefe: boolean,
  onToggle?: () => void,
  isExpanded?: boolean
) => {
  const { eliminar, responderInvitacion, darDeBaja, sustituirMiembro } = usePlanificadorMutations();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const swalBg = isDarkMode ? '#1a1a1a' : '#ffffff';
  const swalText = isDarkMode ? '#f3f4f6' : '#1f2937';

  const calcularEstado = (fechaISO: string | null) => {
    if (!fechaISO) return 'Sin fecha';

    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

    const fecha = new Date(fechaISO);
    const fechaSoloDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

    if (fechaSoloDia.getTime() === hoy.getTime()) return 'Para hoy';
    if (fechaSoloDia.getTime() < hoy.getTime()) return 'Terminado';
    return 'Próximo';
  };

  const estadoCalculado = calcularEstado(planificador.due_date);

  const esCreador = planificador.created_by === usuarioActualId;
  const miRegistro = planificador.integrantes.find(i => i.usuario_id === usuarioActualId);
  const estaPendiente = miRegistro && (miRegistro.invitación === null || miRegistro.invitación === undefined);
  const estaRechazado = miRegistro && miRegistro.invitación === false;

  const isLocked = !isJefe && estadoCalculado === 'Terminado';

  const puedeEditar = (isJefe || esCreador) && !isLocked;
  const mostrarHerramientasEdicion = puedeEditar && !estaPendiente;

  const idsActuales = planificador.integrantes.map(i => i.usuario_id);
  const usuariosDisponibles = usuarios.filter(u => !idsActuales.includes(u.id));

  const formatearFecha = (fechaISO: string | null) => {
    if (!fechaISO) return 'Sin fecha';
    return new Date(fechaISO).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const obtenerDatosVencimiento = (fechaISO: string | null) => {
    if (!fechaISO) return null;
    const date = new Date(fechaISO);
    const fechaStr = date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const horaStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1)} | ${horaStr.toUpperCase()}`;
  };

  const encargados = planificador.integrantes.filter(i => i.es_encargado);
  const miembros = planificador.integrantes.filter(i => !i.es_encargado);

  const notificar = (icon: 'success' | 'error' | 'info' | 'warning', title: string, text?: string) => {
    if (icon === 'error') {
      Swal.fire({ icon, title, text, background: swalBg, color: swalText, customClass: swalBaseStyles });
    } else {
      Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: swalBg, color: swalText }).fire({ icon, title });
    }
  };

  const acciones = {
    abrirModalInvitacion: (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      Swal.fire({
        title: 'Nueva Invitación',
        html: `
          <div class="mt-2 text-gray-600 dark:text-gray-300 text-sm">
            Has sido asignado a: <br/>
            <strong class="text-gray-900 dark:text-white text-base mt-2 block">${planificador.title}</strong>
            <br/> ¿Confirmas tu asistencia?
          </div>
        `,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Confirmar',
        denyButtonText: 'Rechazar',
        cancelButtonText: 'Decidir luego',
        background: swalBg,
        color: swalText,
        buttonsStyling: false,
        customClass: {
          ...swalBaseStyles,
          confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6 py-2.5 shadow-lg shadow-blue-500/30 transition-all mx-1',
          denyButton: 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 font-bold rounded-xl px-6 py-2.5 transition-all mx-1',
          cancelButton: swalBaseStyles.cancelButton + ' mx-1'
        }
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await responderInvitacion.mutateAsync({ actividad_id: planificador.id, aceptada: true });
            notificar('success', '¡Asistencia confirmada!');
            if (!isExpanded && onToggle) onToggle();
          } catch (e: any) { notificar('error', 'Error', e.message); }
        } else if (result.isDenied) {
          const { value: motivo } = await Swal.fire({
            title: 'Rechazar Actividad',
            input: 'textarea',
            inputLabel: 'Justificación (Obligatoria)',
            showCancelButton: true,
            confirmButtonText: 'Enviar rechazo',
            background: swalBg,
            color: swalText,
            buttonsStyling: false,
            customClass: { ...swalBaseStyles, confirmButton: 'bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl px-6 py-2.5 mx-1' }
          });
          if (motivo) {
            try {
              await responderInvitacion.mutateAsync({ actividad_id: planificador.id, aceptada: false, motivo });
              notificar('info', 'Se notificó tu inasistencia');
            } catch (e: any) { notificar('error', 'Error', e.message); }
          }
        }
      });
    },

    eliminarActividad: async (e: React.MouseEvent) => {
      e.stopPropagation();
      const res = await Swal.fire({
        title: '¿Eliminar actividad?',
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: swalBg,
        color: swalText,
        buttonsStyling: false,
        customClass: { ...swalBaseStyles, confirmButton: 'bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl px-6 py-2.5 mx-1' }
      });
      if (res.isConfirmed) {
        try {
          await eliminar.mutateAsync(planificador.id);
          notificar('success', 'Eliminada correctamente');
        } catch (e: any) { notificar('error', 'Error', e.message); }
      }
    },

    darDeBaja: async (e: React.MouseEvent, usuario_id: string, nombre: string) => {
      e.stopPropagation();
      const { value: motivo } = await Swal.fire({
        title: `Dar de baja a ${nombre}`,
        input: 'textarea',
        inputLabel: 'Motivo de la baja',
        showCancelButton: true,
        confirmButtonText: 'Confirmar baja',
        background: swalBg,
        color: swalText,
        buttonsStyling: false,
        customClass: { ...swalBaseStyles, confirmButton: 'bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl px-6 py-2.5 mx-1' }
      });
      if (motivo) {
        try {
          await darDeBaja.mutateAsync({ actividad_id: planificador.id, usuario_id, motivo });
          notificar('success', 'Usuario dado de baja');
        } catch (e: any) { notificar('error', 'Error', e.message); }
      }
    },

    sustituir: async (e: React.MouseEvent, usuario_id_actual: string, nombre_actual: string) => {
      e.stopPropagation();
      if (usuariosDisponibles.length === 0) return notificar('info', 'Sin usuarios disponibles');
      const opciones = usuariosDisponibles.reduce((acc, u) => { acc[u.id] = u.nombre; return acc; }, {} as Record<string, string>);

      const { value: formValues } = await Swal.fire({
        title: `<span class="text-xl font-bold tracking-tight text-gray-900 dark:text-white mt-1 block">Sustituir a ${nombre_actual}</span>`,
        html: `
          <style>
            .swal2-validation-message {
              background-color: rgba(239, 68, 68, 0.1) !important;
              color: #ef4444 !important;
              border: 1px solid rgba(239, 68, 68, 0.2) !important;
              border-radius: 0.75rem !important;
              padding: 0.75rem 1rem !important;
              font-size: 0.875rem !important;
              font-weight: 500 !important;
              margin-top: 1rem !important;
              box-shadow: none !important;
              justify-content: center !important;
              width: 90% !important;
              margin-left: auto !important;
              margin-right: auto !important;
            }
            .swal2-validation-message::before {
              background-color: #ef4444 !important;
              color: #ffffff !important;
              border-radius: 50% !important;
            }
          </style>
          <div class="flex flex-col gap-6 text-left mt-4 font-sans mx-auto w-full">
            <div class="relative w-full">
              <label class="text-base font-bold text-gray-800 dark:text-gray-100 mb-2 block">Nuevo integrante</label>
              
              <!-- Custom Dropdown Trigger (Input) -->
              <div class="relative w-full">
                <input type="text" id="swal-search-input" autocomplete="off" class="w-full px-4 py-3 min-h-[50px] border border-gray-300 dark:border-[#3f3f46] rounded-xl bg-gray-50 dark:bg-[#27272a] text-gray-800 dark:text-gray-100 outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-all text-base placeholder-gray-500 dark:placeholder-gray-400 peer" placeholder="Buscar y seleccionar nuevo integrante...">
                <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 peer-focus:text-blue-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
              <input type="hidden" id="swal-select-nuevo" />

              <!-- Custom Dropdown Options -->
              <div id="swal-custom-dropdown" class="absolute z-[10000] top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#3f3f46] rounded-xl shadow-2xl hidden flex-col max-h-[240px] overflow-y-auto custom-scrollbar overflow-x-hidden">
                <div id="swal-no-results" class="hidden p-4 text-center text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#27272a]">
                   No se encontraron integrantes
                </div>
                ${usuariosDisponibles.map(u => `
                  <div class="swal-option-item flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#27272a] cursor-pointer border-b border-gray-50 dark:border-[#27272a] last:border-0 transition-colors" data-id="${u.id}" data-name="${u.nombre}">
                    <span class="text-gray-800 dark:text-[#e4e4e7] text-base tracking-wide truncate font-medium">${u.nombre}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="w-full">
              <label class="text-base font-bold text-gray-800 dark:text-gray-100 mb-2 block">Justificación</label>
              <textarea id="swal-input-motivo" class="w-full px-4 py-3 border border-gray-300 dark:border-[#3f3f46] rounded-xl bg-gray-50 dark:bg-[#27272a] text-gray-800 dark:text-[#e4e4e7] outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-all text-base min-h-[100px] resize-y placeholder-gray-500 dark:placeholder-gray-400" placeholder="Explica por qué se realiza esta sustitución..."></textarea>
            </div>
          </div>
        `,
        width: '540px',
        focusConfirm: false,
        heightAuto: false,     // Previene saltos de scroll en movil
        scrollbarPadding: false,
        showCancelButton: true,
        confirmButtonText: 'Sustituir',
        cancelButtonText: 'Cancel',
        background: isDarkMode ? '#18181b' : '#ffffff', // Usa zinc-900 en dark
        color: isDarkMode ? '#ffffff' : '#000000',
        buttonsStyling: false,
        customClass: {
          popup: 'rounded-[1.5rem] shadow-2xl border border-gray-200 dark:border-[#27272a] p-4 sm:p-6 w-full max-w-[95vw] sm:max-w-xl font-sans text-center overflow-visible',
          title: 'text-[22px] sm:text-[26px] font-bold tracking-tight text-gray-900 dark:text-white mt-2 mb-2',
          actions: 'flex gap-4 justify-center w-full mt-7 mb-2',
          confirmButton: 'bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-95 text-white font-bold rounded-xl px-10 py-2.5 transition-all text-[15px] shadow-sm flex-1 sm:flex-none',
          cancelButton: 'bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] active:scale-95 text-gray-200 font-bold rounded-xl px-10 py-2.5 transition-all text-[15px] flex-1 sm:flex-none',
          validationMessage: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3 text-[14px] font-medium shadow-sm w-[90%] mx-auto'
        },
        didOpen: () => {
          const inputSearch = document.getElementById('swal-search-input') as HTMLInputElement;
          const dropdown = document.getElementById('swal-custom-dropdown')!;
          const hiddenInput = document.getElementById('swal-select-nuevo') as HTMLInputElement;
          const options = document.querySelectorAll('.swal-option-item');
          const noResults = document.getElementById('swal-no-results')!;

          let isOpen = false;

          const openDropdown = () => {
            if (isOpen) return;
            dropdown.classList.remove('hidden');
            dropdown.classList.add('flex');
            isOpen = true;
          };

          const closeDropdown = () => {
            if (!isOpen) return;
            dropdown.classList.add('hidden');
            dropdown.classList.remove('flex');
            isOpen = false;
          };

          // Abrir al hacer focus o clic
          inputSearch.addEventListener('focus', openDropdown);
          inputSearch.addEventListener('click', openDropdown);

          // Filtrar mientras escribe
          inputSearch.addEventListener('input', (e) => {
             openDropdown();
             const val = (e.target as HTMLInputElement).value.toLowerCase();
             let count = 0;
             // Si el user modifica el input, se borra la id secreta previa (debe re-seleccionar)
             hiddenInput.value = '';

             options.forEach(opt => {
                const name = opt.getAttribute('data-name')?.toLowerCase() || '';
                if (name.includes(val)) {
                   opt.classList.remove('hidden');
                   opt.classList.add('flex');
                   count++;
                } else {
                   opt.classList.add('hidden');
                   opt.classList.remove('flex');
                }
             });

             if (count === 0) {
                noResults.classList.remove('hidden');
             } else {
                noResults.classList.add('hidden');
             }
          });

          // Al hacer clic en una opción
          options.forEach(opt => {
             opt.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = opt.getAttribute('data-id');
                const name = opt.getAttribute('data-name');
                hiddenInput.value = id || '';
                inputSearch.value = name || '';
                closeDropdown();
             });
          });

          // Cierra la lista si se hace click fuera del input y del dropdown
          document.addEventListener('click', (e) => {
             if (isOpen && !inputSearch.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
                closeDropdown();
             }
          });
        },
        preConfirm: () => {
          const input = document.getElementById('swal-select-nuevo') as HTMLInputElement;
          const text = document.getElementById('swal-input-motivo') as HTMLTextAreaElement;
          if (!input.value || !text.value.trim()) {
            Swal.showValidationMessage('Debes seleccionar un reemplazo y escribir una justificación.');
            return false;
          }
          return { nuevoUsuarioId: input.value, justificacion: text.value.trim() };
        }
      });

      if (formValues) {
        try {
          await sustituirMiembro.mutateAsync({
            actividad_id: planificador.id,
            usuario_actual: usuario_id_actual,
            usuario_nuevo: formValues.nuevoUsuarioId,
            justificacion: formValues.justificacion
          });
          notificar('success', 'Miembro sustituido con éxito');
        } catch (e: any) { notificar('error', 'Error', e.message); }
      }
    },

    verJustificacion: (motivo: string, nombre: string) => {
      Swal.fire({
        title: `Justificación de ${nombre}`,
        html: `<p class="mt-3 p-4 bg-amber-50/50 dark:bg-[#d6a738]/10 rounded-xl text-gray-700 dark:text-gray-300 italic border border-amber-100 dark:border-[#d6a738]/20">"${motivo}"</p>`,
        confirmButtonText: 'Cerrar',
        background: swalBg,
        color: swalText,
        buttonsStyling: false,
        customClass: { ...swalBaseStyles, confirmButton: 'bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl px-8 py-2.5 transition-colors' }
      });
    }
  };

  return {
    permisos: { esCreador, estaPendiente, estaRechazado, mostrarHerramientasEdicion, puedeEditar },
    datos: {
      encargados,
      miembros,
      fechaFmt: formatearFecha(planificador.due_date),
      vencimiento: obtenerDatosVencimiento(planificador.due_date),
      estado: estadoCalculado
    },
    acciones
  };
};

// =========================================================================
// 4. HOOK PARA GESTIÓN DE PLANTILLAS DE EQUIPO
// =========================================================================

const EQUIPOS_KEYS = {
  all: ["equipos-plantillas"]
};

export const useGestorEquipos = () => {
  const queryClient = useQueryClient();

  // 1. Query para listar plantillas
  const { data: plantillas, isLoading, isError } = useQuery({
    queryKey: EQUIPOS_KEYS.all,
    queryFn: obtenerPlantillasEquipos,
    staleTime: 1000 * 60 * 5,
  });

  // 2. Mutaciones
  const invalidar = () => queryClient.invalidateQueries({ queryKey: EQUIPOS_KEYS.all });

  const guardar = useMutation({
    mutationFn: ({ nombre, integrantes, id }: { nombre: string, integrantes: any[], id?: string }) =>
      guardarPlantillaEquipo(nombre, integrantes, id),
    onSuccess: invalidar,
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => eliminarPlantillaEquipo(id),
    onSuccess: invalidar,
  });

  // Acción auxiliar para cargar miembros
  const cargarMiembros = useMutation({
    mutationFn: (id: string) => cargarMiembrosDePlantilla(id),
  });

  return {
    plantillas: (plantillas || []) as EquipoPlantilla[],
    isLoadingList: isLoading,
    guardar,
    eliminar,
    cargarMiembros
  };
};

export const useRolesSugeridos = () => {
  return useQuery({
    queryKey: ['roles-existentes'],
    queryFn: obtenerRolesExistentes,
    staleTime: 1000 * 60 * 30, // Los roles no cambian seguido, 30 min de caché está bien
  });
};