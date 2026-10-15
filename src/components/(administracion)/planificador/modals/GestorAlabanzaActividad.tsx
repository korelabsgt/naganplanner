'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  Music, Plus, Search, X, 
  ChevronDown, Filter, Info, Loader2,
  CheckCircle2
} from 'lucide-react';
import { usePlanificadorMutations } from '../lib/hooks';
import { obtenerBancoAlabanzas } from '../lib/actions/alabanzas';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import Swal from 'sweetalert2';

// Lista fija de tipos — debe coincidir con RegistroAlabanzas.tsx
const TIPOS_ALABANZA = [
  'Acción de Gracias',
  'Alabanza',
  'Alabanza de Adoración',
  'Canto Especial'
];

interface Song {
  id: string;
  nombre: string;
  tipo: string;
  tonalidad?: string;
  estado?: string;
}

interface Props {
  actividadId: string;
  alabanzasIniciales: Song[] | null;
  readonly?: boolean;
}

export default function GestorAlabanzaActividad({ actividadId, alabanzasIniciales, readonly = false }: Props) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  const { sincronizarRepertorio } = usePlanificadorMutations();
  const linkedSongs = alabanzasIniciales || [];

  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(new Set(linkedSongs.map(s => s.id)));

  // Sincronizar estado local al abrir el modal
  useEffect(() => {
    if (isPickerOpen) {
      setLocalSelectedIds(new Set(linkedSongs.map(s => s.id)));
    }
  }, [isPickerOpen, linkedSongs]);

  // Si los cantos actuales ya estaban publicados previamente
  const yaEstaPublicado = useMemo(() => {
    if (linkedSongs.length === 0) return false;
    return linkedSongs.every(s => s.estado === 'publicado');
  }, [linkedSongs]);

  // 1. Obtener canciones del banco central
  const { data: banco = [], isLoading: loadingBanco } = useQuery({
    queryKey: ['banco-alabanzas'],
    queryFn: () => obtenerBancoAlabanzas(),
    enabled: isPickerOpen
  });

  const filteredBanco = useMemo(() => {
    return banco.filter(s => {
      const matchSearch = s.nombre.toLowerCase().includes(busqueda.toLowerCase());
      // Comparación case-insensitive para evitar duplicados por capitalización
      const matchTipo = !filtroTipo || s.tipo.toLowerCase() === filtroTipo.toLowerCase();
      return matchSearch && matchTipo;
    });
  }, [banco, busqueda, filtroTipo]);

  const handleToggleSong = (song: Song) => {
    const nextIds = new Set(localSelectedIds);
    if (nextIds.has(song.id)) {
      nextIds.delete(song.id);
    } else {
      nextIds.add(song.id);
    }
    setLocalSelectedIds(nextIds);
  };

  const handleSave = async (modo: 'borrador' | 'publicado' = 'borrador') => {
    try {
      await sincronizarRepertorio.mutateAsync({ 
        id: actividadId, 
        alabanzasIds: Array.from(localSelectedIds),
        estado: modo
      });
      setIsPickerOpen(false);
      Swal.fire({ 
        toast: true, 
        position: 'top-end', 
        icon: 'success', 
        title: modo === 'borrador' ? 'Guardado en preparación (Borrador)' : 'Repertorio publicado y notificado', 
        showConfirmButton: false, 
        timer: 2000
      });
    } catch (e: any) {
      Swal.fire({
        title: 'Error', 
        text: e.message, 
        icon: 'error'
      });
    }
  };

  const isPending = sincronizarRepertorio.isPending;

  return (
    <>
      <button 
        onClick={() => setIsPickerOpen(true)}
        className="w-full flex-1"
      >
        <div className="w-full h-10 group flex items-center justify-center gap-2 px-3 rounded-xl border border-dashed border-gray-300 dark:border-[#2a2624] hover:border-[#d6a738] dark:hover:border-[#d6a738] hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-all duration-200 active:scale-95 shadow-sm">
           <Music size={15} className="text-gray-400 group-hover:text-[#d6a738] transition-colors group-hover:scale-110 shrink-0" />
           <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 group-hover:text-[#d6a738] dark:group-hover:text-[#d6a738] uppercase tracking-wider truncate">
             {linkedSongs.length > 0 ? `Editar Selección (${linkedSongs.length})` : 'Añadir Repertorio'}
           </span>
        </div>
      </button>

      {/* MODAL / PICKER DE CANCIONES */}
      <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <DialogPortal>
          <DialogOverlay className="backdrop-blur-md bg-black/60 z-[100]" />
          <DialogPrimitive.Content 
            id="modal-catalogo-alabanzas"
            className={cn(
               "fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]",
               "z-[101] w-full sm:max-w-[1100px] h-[90vh] sm:h-[80vh] flex flex-col p-0 overflow-hidden",
               "bg-white dark:bg-[#0a0a0b] border border-[#d5cec2] dark:border-[#d6a738]/40 rounded-[2.5rem]",
               "shadow-[0_0_50px_rgba(214,167,56,0.15)] outline-none duration-500 transition-all",
               "data-[state=open]:animate-in data-[state=closed]:animate-out",
               "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
               "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
            )}
          >
          <DialogHeader className="px-4 sm:px-6 py-4 sm:py-6 border-b border-[#e5e5e5] dark:border-neutral-800 bg-white dark:bg-[#0a0a0b]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-[#d6a738] to-[#c08e2a] text-white flex items-center justify-center shadow-lg shadow-[#d6a738]/20 shrink-0">
                  <Music size={24} className="sm:hidden" />
                  <Music size={28} className="hidden sm:block" />
                </div>
                <div className="flex flex-col text-left">
                  <DialogTitle className="text-sm sm:text-base font-black text-[#4a3f36] dark:text-white tracking-tight leading-none sm:leading-normal">
                    Catálogo de Alabanzas
                  </DialogTitle>
                  <p className="text-[10px] font-black text-[#d6a738] uppercase tracking-widest mt-1">SELECCIONA EL REPERTORIO PARA ESTE SERVICIO</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPickerOpen(false)}
                className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 dark:bg-white/10 hover:bg-white/20 text-[#d6a738] transition-all"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>
          </DialogHeader>

          <div className="px-4 py-4 sm:px-6 sm:py-5 bg-[#fafafa] dark:bg-[#0a0a0b] flex flex-col gap-4 border-b border-[#e5e5e5] dark:border-neutral-800">
             <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 group">
                   <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-[#d6a738] transition-colors" />
                   <input 
                      type="text" 
                      placeholder="Buscar por nombre..."
                      value={busqueda}
                      onChange={e => setBusqueda(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900/50 border border-[#e5e5e5] dark:border-neutral-800 focus:border-[#d6a738]/50 rounded-xl text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-[#d6a738]/10 text-[#4a3f36] dark:text-white placeholder:text-[#847563] dark:placeholder:text-gray-600 transition-all"
                   />
                </div>
                 <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
                    <PopoverTrigger asChild>
                       <button
                          type="button"
                          className="w-full sm:w-[220px] h-[48px] px-4 bg-white dark:bg-neutral-900/50 border border-[#e5e5e5] dark:border-neutral-800 hover:border-[#d6a738]/50 rounded-xl flex items-center justify-between gap-2 shadow-sm transition-all text-left outline-none focus:ring-2 focus:ring-[#d6a738]/10 cursor-pointer"
                       >
                          <div className="flex items-center gap-2 min-w-0">
                             <Filter size={16} className="text-[#847563] dark:text-gray-500 shrink-0" />
                             <span className="text-[10px] font-black uppercase tracking-widest text-[#4a3f36] dark:text-white truncate">
                                {filtroTipo ? filtroTipo.toUpperCase() : 'TODOS LOS TIPOS'}
                             </span>
                          </div>
                          <ChevronDown size={14} className="text-[#d6a738] shrink-0 opacity-70" />
                       </button>
                    </PopoverTrigger>

                    <PopoverContent
                       align="center"
                       side="bottom"
                       sideOffset={8}
                       className="w-56 p-2 bg-white dark:bg-[#131211] border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-[150]"
                    >
                       <div className="flex flex-col gap-1 max-h-56 overflow-y-auto custom-scrollbar">
                          <button
                             type="button"
                             onClick={() => { setFiltroTipo(''); setIsFilterPopoverOpen(false); }}
                             className={`text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                                filtroTipo === ''
                                   ? 'bg-[#d6a738]/10 text-[#d6a738] font-bold'
                                   : 'hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300'
                             }`}
                          >
                             TODOS LOS TIPOS
                          </button>
                          {TIPOS_ALABANZA.map(t => (
                             <button
                                key={t}
                                type="button"
                                onClick={() => { setFiltroTipo(t); setIsFilterPopoverOpen(false); }}
                                className={`text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                                   filtroTipo === t
                                      ? 'bg-[#d6a738]/10 text-[#d6a738] font-bold'
                                      : 'hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300'
                                }`}
                             >
                                {t.toUpperCase()}
                             </button>
                          ))}
                       </div>
                    </PopoverContent>
                 </Popover>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:px-6 sm:py-6 custom-scrollbar bg-white dark:bg-[#0c0c0c]">
             {loadingBanco ? (
               <div className="flex flex-col items-center justify-center h-full gap-4">
                  <Loader2 size={32} className="animate-spin text-[#d6a738]" />
                  <p className="text-[10px] font-black text-[#847563] uppercase tracking-widest">Cargando catálogo...</p>
               </div>
             ) : filteredBanco.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-center gap-4 opacity-50">
                  <Info size={48} className="text-gray-300" />
                  <p className="text-sm font-bold text-[#847563]">No se encontraron alabanzas</p>
               </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredBanco.map((song) => {
                    const isSelected = localSelectedIds.has(song.id);
                    return (
                      <button
                        key={song.id}
                        onClick={() => handleToggleSong(song)}
                        disabled={isPending}
                          className={`
                            flex items-center justify-between p-5 rounded-2xl border-2 transition-all text-left shadow-sm
                            ${isSelected 
                              ? 'bg-[#d6a738]/5 border-[#d6a738] shadow-[0_0_15px_rgba(214,167,56,0.15)]' 
                              : 'bg-white dark:bg-neutral-900/40 border-[#e5e5e5] dark:border-neutral-800 hover:border-[#d6a738]/40 hover:bg-gray-50 dark:hover:bg-neutral-900/60 hover:shadow-md'
                            }
                          `}
                        >
                         <div className="flex flex-col gap-1">
                            <h4 className={`font-black text-sm uppercase tracking-tight ${isSelected ? 'text-[#d6a738]' : 'text-[#4a3f36] dark:text-[#f4ebc3]'}`}>
                              {song.nombre}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#847563]">
                               <span>{song.tipo}</span>
                               {song.tonalidad && (
                                 <>
                                   <span className="h-1 w-1 rounded-full bg-gray-300" />
                                   <span className={isSelected ? 'text-[#d6a738]' : ''}>{song.tonalidad}</span>
                                 </>
                               )}
                            </div>
                         </div>
                         
                         {isSelected ? (
                           <CheckCircle2 size={24} className="text-[#d6a738] fill-[#d6a738]/10" />
                         ) : (
                           <div className="h-6 w-6 rounded-full border-2 border-gray-200 dark:border-neutral-700" />
                         )}
                      </button>
                    )
                  })}
               </div>
             )}
          </div>
          
           <div className="px-4 py-4 sm:px-6 border-t border-[#e5e5e5] dark:border-neutral-800 bg-white dark:bg-[#0a0a0b] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {localSelectedIds.size} {localSelectedIds.size === 1 ? 'canto seleccionado' : 'cantos seleccionados'}
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => handleSave('borrador')}
                  disabled={isPending}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-200 rounded-2xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                  title="Guarda los cantos en preparación sin notificar a los músicos"
                >
                  {isPending && <Loader2 size={15} className="animate-spin" />}
                  Guardar Borrador
                </button>

                <button 
                  onClick={() => handleSave('publicado')}
                  disabled={isPending}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-[#d6a738] to-[#c08e2a] hover:from-[#c08e2a] hover:to-[#a07621] text-white rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-[#d6a738]/20 disabled:opacity-50"
                  title="Confirma el repertorio y notifica a los músicos"
                >
                  {isPending && <Loader2 size={15} className="animate-spin" />}
                  Publicar y Notificar
                </button>
              </div>
           </div>
           
           <style dangerouslySetInnerHTML={{ __html: `
             .custom-scrollbar::-webkit-scrollbar {
               width: 5px;
             }
             .custom-scrollbar::-webkit-scrollbar-track {
               background: rgba(0, 0, 0, 0.05);
               border-radius: 10px;
             }
             .custom-scrollbar::-webkit-scrollbar-thumb {
               background: #e5e5e5;
               border-radius: 10px;
               transition: all 0.3s ease;
             }
             .dark .custom-scrollbar::-webkit-scrollbar-thumb {
               background: #2a2624;
             }
             .custom-scrollbar::-webkit-scrollbar-thumb:hover {
               background: #d6a738;
             }
             .swal2-container {
               z-index: 10000 !important;
             }
           `}} />

         </DialogPrimitive.Content>
         </DialogPortal>
       </Dialog>
    </>
  );
}
