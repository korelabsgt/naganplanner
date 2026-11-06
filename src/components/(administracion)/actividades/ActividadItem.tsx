'use client';

import { useState, useEffect } from 'react';
import { 
  Edit2, Trash2, ChevronDown, Calendar, User, 
  Clock, AlertCircle, Copy, CheckCircle2, CalendarDays, Ban, Loader2
} from 'lucide-react';
import Swal from 'sweetalert2';
import { Actividad, Perfil, ChecklistItem } from '@/components/(administracion)/actividades/lib/zod';
import { useActividadMutations } from '@/components/(administracion)/actividades/lib/hooks';
import ActividadesChecklist from './ActividadesChecklist';
import NuevaActividad from './modals/NuevaActividad';
import DuplicarActividad from './modals/DuplicarActividad';

interface Props {
  actividad: Actividad;
  isExpanded?: boolean;
  onToggle?: () => void;
  usuarioActualId: string;
  usuarios: Perfil[];
  isJefe: boolean; 
}

export default function ActividadItem({ 
  actividad, 
  isExpanded = false, 
  onToggle, 
  usuarioActualId, 
  usuarios,
  isJefe 
}: Props) {
  const { cambiarStatus, eliminar } = useActividadMutations();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); 

  const [localChecklist, setLocalChecklist] = useState<ChecklistItem[]>(actividad.checklist || []);

  useEffect(() => {
    setLocalChecklist(actividad.checklist || []);
  }, [actividad.checklist]);

  const formatearFecha = (fechaISO: string | null) => {
    if (!fechaISO) return 'Sin fecha';
    return new Date(fechaISO).toLocaleDateString('es-ES', { 
      day: 'numeric', month: 'short', year: 'numeric' 
    });
  };

  const obtenerDatosVencimiento = (fechaISO: string | null) => {
    if (!fechaISO) return null;
    const date = new Date(fechaISO);
    
    const fecha = date.toLocaleDateString('es-ES', { 
      weekday: 'short', day: 'numeric', month: 'short' 
    });
    
    const hora = date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', minute: '2-digit' 
    });
    
    return { fecha, hora };
  };

  const vencimiento = obtenerDatosVencimiento(actividad.due_date);

  const getInicial = (nombre: string | undefined) => {
    if (!nombre) return '?';
    return nombre.charAt(0).toUpperCase();
  };

  const completados = localChecklist.filter(c => c.is_completed).length;
  const total = localChecklist.length;
  const porcentaje = total === 0 ? 0 : Math.round((completados / total) * 100);

  // --- REGLA DE PERMISOS PARA BOTONES ---
  // 1. Si está Asignado: Todos pueden editar/eliminar (isLocked = false).
  // 2. Si está Completado/Vencido: Solo el Jefe puede (isLocked = true si no es jefe).
  const isLocked = !isJefe && (actividad.status === 'Completado' || actividad.status === 'Vencido');

  const handleToggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (actividad.status === 'Vencido') {
      Swal.fire('Acción bloqueada', 'No puedes completar una tarea vencida. Edita la fecha primero.', 'error');
      return;
    }
    
    if (actividad.status !== 'Completado' && localChecklist.some(i => !i.is_completed)) {
      Swal.fire({
        icon: 'warning',
        title: 'Checklist pendiente',
        text: 'Debes completar todos los pasos antes de marcar la actividad como terminada.',
        confirmButtonColor: '#d6a738', 
        iconColor: '#d6a738',
        background: '#fff',
        color: '#4a3f36'
      });
      return;
    }

    const nuevoEstado = actividad.status === 'Completado' ? 'Asignado' : 'Completado';
    
    setIsUpdatingStatus(true); 

    try {
      await cambiarStatus.mutateAsync({ id: actividad.id, estado: nuevoEstado });
      const Toast = Swal.mixin({
        toast: true, position: 'top-end', showConfirmButton: false, timer: 2000
      });
      Toast.fire({ 
        icon: 'success', 
        title: nuevoEstado === 'Completado' ? '¡Actividad terminada!' : 'Estado actualizado' 
      });
    } catch (error: any) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setIsUpdatingStatus(false); 
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); 

    const result = await Swal.fire({
      title: '¿Eliminar actividad?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444', 
      cancelButtonColor: '#d5cec2', 
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#fff',
      color: '#4a3f36'
    });

    if (result.isConfirmed) {
      try {
        await eliminar.mutateAsync(actividad.id);
        Swal.fire({ 
          icon: 'success', 
          title: 'Eliminada', 
          timer: 1500, 
          showConfirmButton: false 
        });
      } catch (error: any) {
        Swal.fire('Error', error.message, 'error');
      }
    }
  };

  const getStatusColor = () => {
    if (actividad.status === 'Completado') return 'border-l-green-600/50 bg-green-50/50 dark:bg-green-900/10';
    if (actividad.status === 'Vencido') return 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10';
    return 'border-l-[#d6a738] bg-white dark:bg-neutral-900';
  };

  const esElMismoUsuario = actividad.created_by === actividad.assigned_to;

  return (
    <>
      <div id={`actividad-${actividad.id}`} className={`
        group rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col
        ${getStatusColor()} 
        ${isExpanded ? 'ring-2 ring-[#d6a738]/30 shadow-lg' : 'hover:shadow-md border-gray-200 dark:border-[#3e3630]'}
        dark:bg-neutral-900
      `}>
        <div 
          onClick={onToggle}
          className="p-4 sm:p-5 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                actividad.status === 'Completado' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                  : actividad.status === 'Vencido'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-[#fbf7e6] text-[#c08e2a] dark:bg-neutral-800 dark:text-[#d6a738]' 
              }`}>
                {actividad.status === 'Vencido' && <AlertCircle size={10}/>}
                {actividad.status}
              </span>
            </div>

            <h3 className="font-bold text-gray-800 dark:text-[#f4ebc3] truncate">
              {actividad.title}
            </h3>
            
            {!isExpanded && (
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500 dark:text-[#b9ae9f]">
                <span className="flex items-center gap-1"><Clock size={14}/> {formatearFecha(actividad.due_date)}</span>
                <span className="flex items-center gap-1"><User size={14}/> {actividad.assignee?.nombre}</span>
                
                {total > 0 && (
                  <>
                    <div className="hidden sm:block w-px h-3 bg-gray-300 dark:bg-neutral-700"></div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#d6a738] transition-all" style={{ width: `${porcentaje}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-[#847563]">{porcentaje}%</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setIsCopyOpen(true)}
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-[#d6a738] dark:text-[#9c8e7c] dark:hover:bg-neutral-800 rounded-lg transition-colors"
                title="Duplicar"
              >
                <Copy size={18} />
              </button>
              
              {/* LÓGICA DE BOTONES: Si NO está bloqueado, mostramos editar y eliminar */}
              {!isLocked && (
                <>
                  <button 
                    onClick={() => setIsEditOpen(true)} 
                    className="p-2 text-gray-400 hover:bg-gray-100 hover:text-[#d6a738] dark:text-[#9c8e7c] dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  
                  <button 
                    onClick={handleDelete} 
                    className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:text-[#9c8e7c] dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              )}

              <button 
                className={`transition-transform duration-300 p-2 rounded-lg ${
                  isExpanded ? 'rotate-180 text-[#d6a738]' : 'text-gray-400 hover:bg-gray-100 dark:text-[#9c8e7c] dark:hover:bg-neutral-800'
                }`}
              >
                <ChevronDown size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className={`
          flex flex-col overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-[1500px] border-t border-gray-100 dark:border-[#3e3630]' : 'max-h-0 border-t-0'}
        `}>
          <div className="p-5 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            
            <div className="lg:col-span-2 flex flex-col gap-4">
              
              <div className="bg-white dark:bg-neutral-800/50 p-4 rounded-2xl border border-gray-100 dark:border-[#3e3630] shadow-sm">
                <label className="text-[10px] font-bold text-gray-500 dark:text-[#9c8e7c] uppercase tracking-widest mb-1.5 block">
                  Descripción
                </label>
                <p className="text-sm text-gray-700 dark:text-[#d5cec2] whitespace-pre-line leading-relaxed min-height: 1.5rem">
                  {actividad.description || 'Sin descripción adicional.'}
                </p>
              </div>

              {vencimiento && (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-500/30 bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 w-full sm:w-fit">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <CalendarDays size={14} className="text-blue-500"/>
                    <span className="capitalize">Vence: {vencimiento.fecha}</span>
                  </div>
                  <div className="w-px h-4 bg-blue-500/30 mx-1" />
                  <div className="flex items-center gap-1 text-xs opacity-80">
                    <Clock size={13} />
                    <span>{vencimiento.hora}</span>
                  </div>
                </div>
              )}

              {total > 0 && (
                <div className="bg-gray-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-gray-100 dark:border-[#3e3630]">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-[#9c8e7c] uppercase tracking-widest">
                      Progreso del Checklist
                    </span>
                    <span className="text-xs font-bold text-gray-700 dark:text-[#d5cec2]">
                      {porcentaje}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#d6a738] transition-all duration-500 ease-out" 
                      style={{ width: `${porcentaje}%` }} 
                    />
                  </div>
                </div>
              )}

              {actividad.status !== 'Completado' && (
                <button 
                  onClick={handleToggleStatus}
                  disabled={actividad.status === 'Vencido' || isUpdatingStatus}
                  className={`
                    w-full py-3 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2
                    active:scale-[0.98]
                    ${actividad.status === 'Vencido' 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none dark:bg-neutral-800 dark:text-neutral-600' 
                      : 'bg-[#d6a738] hover:bg-[#c08e2a] text-white shadow-[#d6a738]/20 dark:shadow-none'
                    }
                    ${isUpdatingStatus ? 'opacity-80 cursor-wait' : ''}
                  `}
                >
                  {actividad.status === 'Vencido' ? (
                    <>
                      <Ban size={18} />
                      Actividad Vencida
                    </>
                  ) : isUpdatingStatus ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} /> 
                      Marcar como Terminada
                    </>
                  )}
                </button>
              )}
            </div>

            <div className={`
              bg-gray-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-dashed border-gray-200 dark:border-[#3e3630] lg:col-span-3 h-full max-h-[450px] overflow-y-auto
              scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent
              [color-scheme:light] dark:[color-scheme:dark]
            `}>
              <ActividadesChecklist 
                actividadId={actividad.id} 
                checklist={localChecklist} 
                readOnly={actividad.status === 'Completado'}
                onChecklistChange={(newChecklist) => setLocalChecklist(newChecklist)} 
              />
            </div>
          </div>

          <div className="mt-auto px-5 py-4 bg-gray-50/50 dark:bg-[#1a1512] border-t border-gray-100 dark:border-[#3e3630]">
            <div className="flex justify-between items-center pb-3 mb-3 border-b border-gray-200 dark:border-[#3e3630]">
              <span className="font-bold tracking-wider uppercase text-[10px] text-gray-500 dark:text-[#9c8e7c]">
                Detalles del Registro
              </span>
              <span className="text-xs text-gray-500 dark:text-[#9c8e7c]">
                Creado: {formatearFecha(actividad.created_at)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-gray-500 dark:text-[#9c8e7c]">
              {esElMismoUsuario ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#fbf7e6] dark:bg-[#d6a738]/20 flex items-center justify-center text-[#c08e2a] dark:text-[#d6a738] font-bold text-[10px]">
                    {getInicial(actividad.creator?.nombre)}
                  </div>
                  <span>Creado y asignado por: <strong className="text-gray-700 dark:text-[#d5cec2]">{actividad.creator?.nombre} {actividad.created_by === usuarioActualId ? '(Yo)' : ''}</strong></span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center text-gray-600 dark:text-[#d5cec2] font-bold text-[10px]">
                      {getInicial(actividad.creator?.nombre)}
                    </div>
                    <span>Creado por: <strong className="text-gray-700 dark:text-[#d5cec2]">{actividad.creator?.nombre} {actividad.created_by === usuarioActualId ? '(Yo)' : ''}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#fbf7e6] dark:bg-[#d6a738]/20 flex items-center justify-center text-[#c08e2a] dark:text-[#d6a738] font-bold text-[10px]">
                      {getInicial(actividad.assignee?.nombre)}
                    </div>
                    <span>Asignado a: <strong className="text-gray-700 dark:text-[#d5cec2]">{actividad.assignee?.nombre} {actividad.assigned_to === usuarioActualId ? '(Yo)' : ''}</strong></span>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {isEditOpen && (
        <NuevaActividad 
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          usuarios={usuarios}
          usuarioActualId={usuarioActualId}
          actividadEditar={actividad}
          isJefe={isJefe} 
        />
      )}

      {isCopyOpen && (
        <DuplicarActividad 
          isOpen={isCopyOpen}
          onClose={() => setIsCopyOpen(false)}
          actividadOriginal={actividad}
          usuarios={usuarios}
          usuarioActualId={usuarioActualId}
        />
      )}
    </>
  );
}