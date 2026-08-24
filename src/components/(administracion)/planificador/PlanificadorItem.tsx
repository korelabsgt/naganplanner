'use client';

import { useState } from 'react';
import {
  Edit2, Trash2, ChevronDown, Calendar, User, Users,
  Clock, AlertCircle, Ban, Mail, Paperclip, Youtube, X,
  Star, Music, Copy, BookOpen
} from 'lucide-react';
import { Planificador, Perfil } from './lib/zod';
import { usePlanificadorLogic, usePlanificadorMutations } from './lib/hooks';
import NuevoPlanificador from './modals/NuevoPlanificador';
import FilaIntegrante from './FilaIntegrante';
import PlanificadorChecklist from './PlanificadorChecklist';
import GestorArchivos from './modals/GestorArchivos';
import GestorVideo from './modals/GestorVideo';
import GestorDrive from './modals/GestorDrive';
import GestorDones from './modals/GestorDones';
import GestorAlabanzaActividad from './modals/GestorAlabanzaActividad';
import ModalRepertorioActividad from './modals/ModalRepertorioActividad';
import { obtenerRepertoriosDelMismoDia } from './lib/actions';
import Swal from 'sweetalert2';

type DeptoEquipo = {
  id: string;
  nombre: string;
  miembros: string[];
  parent_id?: string | null;
};

interface Props {
  planificador: Planificador;
  isExpanded?: boolean;
  onToggle?: () => void;
  usuarioActualId: string;
  usuarios: Perfil[];
  isJefe: boolean;
  modulo: string;
  tipoVista: 'mis_actividades' | 'mi_equipo' | 'todas';
  departamentosEquipo?: DeptoEquipo[];
}

export default function PlanificadorItem({
  planificador,
  isExpanded = false,
  onToggle,
  usuarioActualId,
  usuarios,
  isJefe,
  modulo,
  tipoVista,
  departamentosEquipo = []
}: Props) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [forceShowFiles, setForceShowFiles] = useState(false);
  const [forceShowVideos, setForceShowVideos] = useState(false);
  const [forceShowDrive, setForceShowDrive] = useState(false);
  const [forceShowAlabanzas, setForceShowAlabanzas] = useState(false);
  const [forceShowDones, setForceShowDones] = useState(false);
  const [modalRepertorioOpen, setModalRepertorioOpen] = useState(false);

  const [repertoriosHoy, setRepertoriosHoy] = useState<{ id: string, title: string, canciones_count: number }[]>([]);
  const [isSearchingRepertorios, setIsSearchingRepertorios] = useState(false);
  const [showImportList, setShowImportList] = useState(false);

  const { permisos, datos, acciones } = usePlanificadorLogic(
    planificador,
    usuarioActualId,
    usuarios,
    isJefe,
    onToggle,
    isExpanded
  );

  const { importarRepertorio } = usePlanificadorMutations();

  const handleHeaderClick = (e: React.MouseEvent) => {
    if (permisos.estaPendiente) {
      acciones.abrirModalInvitacion(e);
      return;
    }
    if (permisos.estaRechazado && !permisos.esCreador && !isJefe) {
      return;
    }
    if (onToggle) onToggle();
  };

  // --- 1. COLOR DEL BORDE (Solo borde izquierdo discreto según urgencia) ---
  const getStatusColor = () => {
    if (datos.estado === 'Para hoy') return 'border-l-blue-500 bg-blue-50/10 dark:bg-blue-900/10';
    if (datos.estado === 'Terminado') return 'border-l-purple-500 bg-purple-50/10 dark:bg-purple-900/10';
    return 'border-l-[#d6a738] bg-white dark:bg-neutral-900';
  };

  // --- 2. ESTILO DEL BADGE DE SERVICIO (Servicio, Ensayo, Servicio Especial) ---
  const getServiceBadgeStyle = (tipo: string | null | undefined) => {
    switch (tipo) {
      case 'servicio':
      case 'culto':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800';
      case 'ensayo':
        return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      case 'servicio_especial':
      case 'especial':
        return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800';
      case 'reunion':
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-800';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-neutral-800 dark:text-gray-400';
    }
  };

  const getServiceLabel = (status: string | null | undefined) => {
    switch (status) {
      case 'servicio':
      case 'culto': return 'Servicio';
      case 'ensayo': return 'Ensayo';
      case 'servicio_especial':
      case 'especial': return 'Servicio Especial';
      case 'reunion': return 'Reunión';
      default: 
        if (!status) return 'General';
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }
  };

  const esMiembroConfirmado = [...datos.encargados, ...datos.miembros].some(
    i => i.usuario_id === usuarioActualId && i.invitación !== false
  );
  const puedeHacerCheck = permisos.puedeEditar || esMiembroConfirmado;
  const esEncargadoActividad = datos.encargados.some(i => i.usuario_id === usuarioActualId);
  const puedeGestionarContenido = isJefe || esEncargadoActividad || permisos.esCreador;

  const checklistSeguro = planificador.checklist ?? [];
  const adjuntosSeguros = planificador.archivos_pdf ?? [];
  const videosSeguros = planificador.videos_url ?? [];
  const driveSeguros = planificador.archivos_drive ?? [];
  const alabanzasSeguras = (planificador as any).alabanzas ?? [];
  const donesSeguros = (planificador as any).dones_espirituales ?? [];

  const showFiles = adjuntosSeguros.length > 0 || forceShowFiles;
  const showVideos = videosSeguros.length > 0 || forceShowVideos;
  const showDrive = driveSeguros.length > 0 || forceShowDrive;
  const showAlabanzas = alabanzasSeguras.length > 0 || forceShowAlabanzas;
  const showDones = donesSeguros.length > 0 || forceShowDones;

  const handleBuscarRepertorios = async () => {
    setIsSearchingRepertorios(true);
    try {
      const res = await obtenerRepertoriosDelMismoDia(planificador.id);
      setRepertoriosHoy(res);
      setShowImportList(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearchingRepertorios(false);
    }
  };

  const handleClonar = async (origenId: string) => {
    // Cerramos el popover de inmediato para evitar bloqueos
    setShowImportList(false);

    const isDark = document.documentElement.classList.contains('dark');

    Swal.fire({
      title: '¿Importar Repertorio?',
      text: 'Esto reemplazará cualquier canción que ya tengas seleccionada en esta actividad.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, importar',
      cancelButtonText: 'Cancelar',
      heightAuto: false,     // Crucial para evitar congelamientos en iOS/móviles
      scrollbarPadding: false, // Crucial para evitar congelamientos
      showLoaderOnConfirm: true,
      background: isDark ? '#1a1a1a' : '#ffffff',
      color: isDark ? '#ffffff' : '#1f2937',
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl shadow-2xl border border-gray-100 dark:border-neutral-800',
        confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6 py-2.5 mx-2',
        cancelButton: 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl px-6 py-2.5 mx-2'
      },
      preConfirm: async () => {
        try {
          await importarRepertorio.mutateAsync({ origenId, destinoId: planificador.id });
          return true;
        } catch (error: any) {
          Swal.showValidationMessage(`Error al importar: ${error.message}`);
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed) {
        setForceShowAlabanzas(true);
        // Pequeño brindis visual de éxito
        Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
          background: isDark ? '#10b981' : '#d1fae5', // Fondo verde éxito
          color: isDark ? '#ffffff' : '#065f46'
        }).fire({
          icon: 'success',
          title: 'Importación exitosa'
        });
      }
    });
  };

  return (
    <>
      <div className={`
        group rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col
        ${getStatusColor()} 
        ${isExpanded ? 'ring-1 ring-blue-500/50 shadow-lg dark:border-blue-900/50' : 'hover:shadow-md border-gray-200 dark:border-[#3e3630]'}
        dark:bg-neutral-900
      `}>
        {/* ================= HEADER ================= */}
        <div
          onClick={handleHeaderClick}
          className={`p-4 sm:p-5 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${permisos.estaPendiente ? 'hover:bg-blue-50/30 dark:hover:bg-blue-900/10' : ''}`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">

              {/* ÚNICO BADGE VISIBLE: TIPO DE SERVICIO */}
              <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${getServiceBadgeStyle(planificador.status)}`}>
                {(planificador.status === 'servicio_especial' || planificador.status === 'especial') && <Star size={10} className="fill-current" />}
                {getServiceLabel(planificador.status)}
              </span>

            </div>

            <h3 className="font-bold text-gray-800 dark:text-[#f4ebc3] truncate text-base">
              {isExpanded ? 'Detalles de la actividad' : planificador.title}
            </h3>

            {!isExpanded && (
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500 dark:text-[#b9ae9f]">
                <span className="flex items-center gap-1"><Clock size={14} className="text-[#d6a738]" /> {datos.fechaFmt}</span>
                <span className="flex items-center gap-1"><User size={14} /> {datos.encargados[0]?.perfil?.nombre || 'N/A'}</span>
                <span className="flex items-center gap-1"><Users size={14} /> {planificador.integrantes.length} Integrante(s)</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>

              {permisos.estaPendiente && (
                <button
                  onClick={acciones.abrirModalInvitacion}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 mr-2 animate-pulse"
                >
                  <Mail size={14} /> Invitación
                </button>
              )}

              {permisos.estaRechazado && !permisos.esCreador && (
                <span className="mr-2 px-3 py-1.5 text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50 flex items-center gap-1">
                  <Ban size={14} /> Rechazado
                </span>
              )}

              {permisos.mostrarHerramientasEdicion && (
                <>
                  <button onClick={() => setIsEditOpen(true)} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-500 dark:text-[#9c8e7c] dark:hover:bg-neutral-800 rounded-lg transition-colors">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={acciones.eliminarActividad} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:text-[#9c8e7c] dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </>
              )}

              <button
                className={`transition-all duration-300 p-2 rounded-lg ${isExpanded ? 'rotate-180 text-blue-500' : 'text-gray-400 hover:bg-gray-100 dark:text-[#9c8e7c] dark:hover:bg-neutral-800'
                  } ${permisos.estaPendiente ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <ChevronDown size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* ================= CUERPO EXPANDIDO ================= */}
        <div className={`
          flex flex-col overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-1250 border-t border-gray-100 dark:border-blue-900/30' : 'max-h-0 border-t-0'}
        `}>
          <div className="px-1 py-4 sm:px-5 sm:py-6 bg-gray-50/50 dark:bg-transparent flex flex-col gap-6">

            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{planificador.title}</h2>

              {planificador.due_date && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 font-medium">
                  <Calendar size={16} className="text-blue-500" />
                  <span>Fecha y Hora: {datos.vencimiento}</span>
                </div>
              )}

              {planificador.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-line">
                  {planificador.description}
                </p>
              )}

              {(checklistSeguro.length > 0 || permisos.puedeEditar) && (
                <PlanificadorChecklist
                  planificadorId={planificador.id}
                  checklist={checklistSeguro}
                  readOnly={!puedeHacerCheck}
                  puedeEditarEstructura={permisos.puedeEditar}
                />
              )}

              {puedeGestionarContenido && (!showFiles || !showVideos || !showDrive || !showDones) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-3 animate-in fade-in slide-in-from-top-2">
                  {!showFiles && (
                    <button
                      onClick={() => setForceShowFiles(true)}
                      className="group flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all duration-200 active:scale-95 hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      <Paperclip size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors group-hover:scale-110" />
                      <span className="text-sm font-bold text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        Adjuntar PDF
                      </span>
                    </button>
                  )}
                  {!showVideos && (
                    <button
                      onClick={() => setForceShowVideos(true)}
                      className="group flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 dark:border-neutral-700 hover:border-red-500 dark:hover:border-red-500 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-all duration-200 active:scale-95 hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      <Youtube size={18} className="text-gray-400 group-hover:text-red-500 transition-colors group-hover:scale-110" />
                      <span className="text-sm font-bold text-gray-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400">
                        Vincular Video
                      </span>
                    </button>
                  )}
                  {!showDrive && (
                    <button
                      onClick={() => setForceShowDrive(true)}
                      className="group flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 dark:border-neutral-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-all duration-200 active:scale-95 hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-green-500 transition-colors group-hover:scale-110"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                      <span className="text-sm font-bold text-gray-500 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400">
                        Vincular Drive
                      </span>
                    </button>
                  )}
                  {!showDones && (
                    <button
                      onClick={() => setForceShowDones(true)}
                      className="group flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 dark:border-neutral-700 hover:border-fuchsia-500 dark:hover:border-fuchsia-500 hover:bg-fuchsia-50/50 dark:hover:bg-fuchsia-900/10 transition-all duration-200 active:scale-95 hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      <BookOpen size={18} className="text-gray-400 group-hover:text-fuchsia-500 transition-colors group-hover:scale-110" />
                      <span className="text-sm font-bold text-gray-500 dark:text-gray-400 group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400">
                        Añadir Dones Espirituales
                      </span>
                    </button>
                  )}
                  {!showAlabanzas && (
                    <button
                      onClick={() => setForceShowAlabanzas(true)}
                      className="group flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 dark:border-[#2a2624] hover:border-[#d6a738] dark:hover:border-[#d6a738] hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-all duration-200 active:scale-95 hover:-translate-y-0.5 hover:shadow-sm sm:col-span-full"
                    >
                      <Music size={18} className="text-gray-400 group-hover:text-[#d6a738] transition-colors group-hover:scale-110" />
                      <span className="text-sm font-bold text-gray-500 dark:text-gray-400 group-hover:text-[#d6a738] dark:group-hover:text-[#d6a738]">
                        Añadir Repertorio Musical
                      </span>
                    </button>
                  )}
                </div>
              )}

              {showAlabanzas && (
                <div className="relative animate-in fade-in slide-in-from-top-2 flex flex-col gap-3 p-5 bg-gradient-to-br from-white to-gray-50 dark:from-[#131211] dark:to-[#0f0e0d] rounded-2xl border border-[#d5cec2]/50 dark:border-[#2a2624]/50 shadow-sm mt-4">
                  {forceShowAlabanzas && alabanzasSeguras.length === 0 && (
                    <button
                      onClick={() => setForceShowAlabanzas(false)}
                      className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all z-10 active:scale-90"
                      title="Quitar sección de alabanza"
                    >
                      <X size={16} />
                    </button>
                  )}

                  <div className="flex flex-col gap-3">

                    {/* Fila superior: icono + título */}
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 shrink-0 flex items-center justify-center bg-gradient-to-br from-[#d6a738] to-[#c08e2a] text-white rounded-xl shadow-lg shadow-[#d6a738]/20">
                        <Music size={24} />
                      </div>
                      <div>
                        <h4 className="font-black text-lg text-[#4a3f36] dark:text-[#f4ebc3] tracking-tight">Repertorio Musical</h4>
                        <p className="text-xs font-bold text-[#847563] uppercase tracking-widest mt-0.5">{alabanzasSeguras.length} CANTOS PROGRAMADOS</p>
                      </div>
                    </div>

                    {/* Fila inferior: botones de acción */}
                    <div className="flex items-center gap-2">

                      {/* Botón importar — solo visible si no hay canciones */}
                      {alabanzasSeguras.length === 0 && puedeGestionarContenido && (
                        <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleBuscarRepertorios(); }}
                            disabled={isSearchingRepertorios}
                            title="Importar de otra actividad de hoy"
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 dark:bg-[#1a2b4b] dark:text-[#60a5fa] border border-blue-100 dark:border-[#2a3b5b] rounded-xl hover:bg-blue-100 dark:hover:bg-[#1e345b] transition-all active:scale-95 shadow-sm"
                          >
                            {isSearchingRepertorios ? <Music size={15} className="animate-pulse" /> : <Copy size={15} />}
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              {isSearchingRepertorios ? 'Buscando...' : 'Importar de Hoy'}
                            </span>
                          </button>

                          {showImportList && (
                            <div className="absolute z-50 top-full left-0 mt-2 p-3 bg-white dark:bg-neutral-800 rounded-2xl border border-gray-200 dark:border-[#3e3630] shadow-2xl animate-in fade-in slide-in-from-top-2 w-[250px] max-w-[85vw]">
                              <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100 dark:border-neutral-700">
                                <span className="text-[10px] font-black uppercase text-gray-400">¿Importar de hoy?</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setShowImportList(false); }}
                                  className="hover:text-red-500 text-gray-400 transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto pr-1">
                                {repertoriosHoy.length === 0 ? (
                                  <p className="text-xs text-center py-4 text-gray-500">No hay otros repertorios hoy</p>
                                ) : (
                                  repertoriosHoy.map(rep => (
                                    <button
                                      key={rep.id}
                                      onClick={(e) => { e.stopPropagation(); handleClonar(rep.id); }}
                                      className="flex flex-col text-left p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-blue-700 dark:text-blue-300 w-full"
                                    >
                                      <span className="text-[11px] font-bold truncate">{rep.title}</span>
                                      <span className="text-[9px] opacity-70">{rep.canciones_count} cantos</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Ver Repertorio */}
                      {alabanzasSeguras.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setModalRepertorioOpen(true); }}
                          className="flex-1 px-4 py-2 bg-neutral-900 text-white dark:bg-[#f4ebc3] dark:text-[#2a2624] rounded-xl text-[10px] font-black uppercase tracking-widest transition-transform active:scale-95 shadow-md flex justify-center items-center"
                        >
                          Ver Repertorio
                        </button>
                      )}

                      {/* Añadir / editar canciones */}
                      {puedeGestionarContenido && (
                        <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                          <GestorAlabanzaActividad
                            actividadId={planificador.id}
                            alabanzasIniciales={alabanzasSeguras}
                            readonly={!puedeGestionarContenido}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <ModalRepertorioActividad
                    isOpen={modalRepertorioOpen}
                    onClose={() => setModalRepertorioOpen(false)}
                    songs={alabanzasSeguras}
                    actividadId={planificador.id}
                    integrantes={planificador.integrantes}
                    puedeGestionar={puedeGestionarContenido}
                  />
                </div>
              )}

              {showFiles && (
                <div className="relative mt-4 pt-9 border-t border-gray-100 dark:border-neutral-800 animate-in fade-in slide-in-from-top-2">
                  {forceShowFiles && adjuntosSeguros.length === 0 && (
                    <button
                      onClick={() => setForceShowFiles(false)}
                      className="absolute top-2 right-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all z-10 active:scale-90"
                      title="Cancelar adjunto"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <GestorArchivos
                    actividadId={planificador.id}
                    adjuntosIniciales={adjuntosSeguros}
                    readonly={!puedeGestionarContenido}
                  />
                </div>
              )}

              {showVideos && (
                <div className="relative mt-2 animate-in fade-in slide-in-from-top-2">
                  {forceShowVideos && videosSeguros.length === 0 && (
                    <button
                      onClick={() => setForceShowVideos(false)}
                      className="absolute top-2 right-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all z-10 active:scale-90"
                      title="Cancelar video"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <GestorVideo
                    actividadId={planificador.id}
                    videosIniciales={videosSeguros}
                    readonly={!puedeGestionarContenido}
                  />
                </div>
              )}

              {showDrive && (
                <div className="relative mt-2 animate-in fade-in slide-in-from-top-2">
                  {forceShowDrive && driveSeguros.length === 0 && (
                    <button
                      onClick={() => setForceShowDrive(false)}
                      className="absolute top-2 right-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all z-10 active:scale-90"
                      title="Cancelar archivo Drive"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <GestorDrive
                    actividadId={planificador.id}
                    archivosIniciales={driveSeguros}
                    readonly={!puedeGestionarContenido}
                  />
                </div>
              )}

              {showDones && (
                <div className="relative mt-2 animate-in fade-in slide-in-from-top-2">
                  {forceShowDones && donesSeguros.length === 0 && (
                    <button
                      onClick={() => setForceShowDones(false)}
                      className="absolute top-2 right-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all z-10 active:scale-90"
                      title="Cancelar dones espirituales"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <GestorDones
                    actividadId={planificador.id}
                    donesIniciales={donesSeguros}
                    readonly={!puedeGestionarContenido}
                  />
                </div>
              )}

            </div>

            {/* INTEGRANTES */}
            {[
              { titulo: 'Encargados', icon: User, lista: datos.encargados, empty: 'No hay encargados asignados.' },
              { titulo: 'Integrantes', icon: Users, lista: datos.miembros, empty: 'No hay integrantes adicionales.' }
            ].map((grupo, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-neutral-800 pb-2">
                  <grupo.icon size={16} className="text-blue-500" /> {grupo.titulo}
                </div>
                <div className="flex flex-col gap-2">
                  {grupo.lista.length > 0 ? (
                    grupo.lista.map((integrante, idx) => (
                      <FilaIntegrante
                        key={idx}
                        integrante={integrante}
                        usuarioActualId={usuarioActualId}
                        puedeEditar={permisos.puedeEditar}
                        onVerJustificacion={acciones.verJustificacion}
                        onSustituir={acciones.sustituir}
                        onDarDeBaja={acciones.darDeBaja}
                        isJefe={isJefe}
                        actividadId={planificador.id}
                      />
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 italic">{grupo.empty}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-4 bg-gray-100/50 dark:bg-[#0a0a0a] border-t border-gray-200 dark:border-neutral-800/50 mt-auto">
            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-[#9c8e7c]">
              <span>Creado por: <strong className="text-gray-700 dark:text-gray-300">{planificador.creator?.nombre}</strong></span>
              <span>Registro: {datos.fechaFmt}</span>
            </div>
          </div>
        </div>
      </div>

      {isEditOpen && (
        <NuevoPlanificador
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          usuarios={usuarios}
          usuarioActualId={usuarioActualId}
          planificadorEditar={planificador}
          isJefe={isJefe}
          modulo={modulo}
          tipoVista={tipoVista}
          departamentosEquipo={departamentosEquipo}
        />
      )}
    </>
  );
}