'use client';

import { useState, useEffect } from 'react';
import {
  X, Users, Plus, Trash2, Edit2, Save, ArrowLeft, Loader2,
  ChevronDown, Crown, UserCircle
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useGestorEquipos } from '@/components/(administracion)/planificador/lib/hooks';
import { SeccionEquipo, IntegranteUI } from './SeccionEquipo';
import { Perfil } from '@/components/(administracion)/planificador/lib/zod';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  usuarios: Perfil[];
  onSelectPlantilla?: (plantillaId: string) => void;
}

type ViewMode = 'LIST' | 'FORM';

// Función auxiliar para generar colores consistentes basados en el ID
const getTeamColor = (id: string) => {
  const colors = [
    'from-blue-500 to-cyan-400',
    'from-purple-500 to-pink-400',
    'from-amber-500 to-orange-400',
    'from-emerald-500 to-teal-400',
    'from-indigo-500 to-blue-400',
    'from-rose-500 to-red-400',
  ];
  const index = id.charCodeAt(id.length - 1) % colors.length;
  return colors[index];
};

export default function GestorEquipos({ isOpen, onClose, usuarios, onSelectPlantilla }: Props) {
  const { plantillas, isLoadingList, guardar, eliminar, cargarMiembros } = useGestorEquipos();

  const [view, setView] = useState<ViewMode>('LIST');
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- Estado para el Acordeón ---
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [membersCache, setMembersCache] = useState<Record<string, IntegranteUI[]>>({});
  const [loadingMembersId, setLoadingMembersId] = useState<string | null>(null);

  // --- Estado del Formulario ---
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [integrantes, setIntegrantes] = useState<IntegranteUI[]>([]);

  // BLOQUEO DE SCROLL DEL FONDO (Ultra-reforzado para iOS/iPhone)
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      document.body.setAttribute('data-scroll-pos-gestor', scrollY.toString());
      
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.width = '100vw';
      document.body.style.height = '100%';
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none'; 
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.height = '100%';
    } else {
      const scrollY = document.body.getAttribute('data-scroll-pos-gestor');
      
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY));
        document.body.removeAttribute('data-scroll-pos-gestor');
      }
    }
    return () => {
      const scrollY = document.body.getAttribute('data-scroll-pos-gestor');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      if (scrollY) window.scrollTo(0, parseInt(scrollY));
    };
  }, [isOpen]);

  // Resetear al abrir
  useEffect(() => {
    if (isOpen) {
      setView('LIST');
      setEditingId(null);
      setNombreEquipo('');
      setIntegrantes([]);
      setExpandedId(null);
    }
  }, [isOpen]);

  // --- MANEJADORES DEL ACORDEÓN ---
  const handleToggleAccordion = async (plantillaId: string) => {
    if (expandedId === plantillaId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(plantillaId);

    if (membersCache[plantillaId]) return;

    setLoadingMembersId(plantillaId);
    try {
      const data = await cargarMiembros.mutateAsync(plantillaId) as any;
      setMembersCache(prev => ({ ...prev, [plantillaId]: data }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMembersId(null);
    }
  };

  // --- MANEJADORES CRUD ---
  const handleCreateNew = () => {
    setEditingId(null);
    setNombreEquipo('');
    setIntegrantes([]);
    setView('FORM');
  };

  const handleEdit = async (e: React.MouseEvent, plantilla: any) => {
    e.stopPropagation();
    try {
      let miembros = membersCache[plantilla.id];
      if (!miembros) {
        miembros = await cargarMiembros.mutateAsync(plantilla.id) as any;
        setMembersCache(prev => ({ ...prev, [plantilla.id]: miembros }));
      }

      setEditingId(plantilla.id);
      setNombreEquipo(plantilla.nombre);
      setIntegrantes(miembros);
      setView('FORM');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron cargar los detalles del equipo', 'error');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, nombre: string) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: '¿Eliminar equipo?',
      text: `Se borrará la plantilla "${nombre}" permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#fff',
      color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
    });
    
    // REFORZAR BLOQUEO TRAS CERRAR SWAL
    document.body.style.overflow = 'hidden';

    if (result.isConfirmed) {
      try {
        await eliminar.mutateAsync(id);
        if (membersCache[id]) {
          const newCache = { ...membersCache };
          delete newCache[id];
          setMembersCache(newCache);
        }
        Swal.fire({ icon: 'success', title: 'Equipo eliminado', timer: 1500, showConfirmButton: false });
      } catch (e: any) {
        Swal.fire('Error', e.message, 'error');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreEquipo.trim()) return Swal.fire('Falta información', 'Ingresa un nombre para el equipo', 'warning');
    if (integrantes.length === 0) return Swal.fire('Falta información', 'Agrega al menos un miembro', 'warning');

    try {
      await guardar.mutateAsync({
        nombre: nombreEquipo,
        integrantes,
        id: editingId || undefined
      });

      if (editingId) {
        const newCache = { ...membersCache };
        delete newCache[editingId];
        setMembersCache(newCache);
        setExpandedId(null);
      }

      Swal.fire({ icon: 'success', title: 'Equipo guardado correctamente', timer: 1500, showConfirmButton: false });
      setView('LIST');
    } catch (e: any) {
      Swal.fire('Error al guardar', e.message, 'error');
    }
  };

  const handleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onSelectPlantilla) {
      onSelectPlantilla(id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#121212] w-full sm:w-[80vw] h-full sm:h-[80vh] rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border-0 sm:border border-gray-200 dark:border-neutral-800 transition-all">

        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-[#121212] shrink-0 relative z-10">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                <Users size={18} />
              </div>
              Gestor de Equipos
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {view === 'LIST' && (
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 mr-2"
              >
                <Plus size={16} strokeWidth={3} />
                <span className="hidden sm:inline">Nuevo Equipo</span>
              </button>
            )}

            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-400">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto px-2 py-4 sm:p-6 bg-gray-50/50 dark:bg-[#0a0a0a]">

          {view === 'LIST' ? (
            <div className="space-y-4">
              {isLoadingList ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" size={30} /></div>
              ) : (plantillas || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 opacity-60">
                  <div className="p-4 bg-gray-100 dark:bg-neutral-800 rounded-full mb-3">
                    <Users size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">No hay equipos creados</h3>
                  <button onClick={handleCreateNew} className="text-blue-600 dark:text-blue-400 text-xs font-bold hover:underline mt-2">
                    Crear mi primer equipo
                  </button>
                </div>
              ) : (
                /* CAMBIO PRINCIPAL:
                   Se eliminó 'grid grid-cols-1 md:grid-cols-2' y se reemplazó por 'flex flex-col'.
                   Esto hace que sea una lista vertical, evitando los espacios vacíos feos al expandir.
                */
                <div className="flex flex-col gap-3 relative z-0 pb-4">
                  <p className="text-[9px] font-bold text-gray-400 dark:text-[#9c8e7c] uppercase tracking-wider mb-2 text-center">
                    Haz clic para ver miembros del equipo
                  </p>
                  {plantillas.map(p => {
                    const isExpanded = expandedId === p.id;
                    const isLoadingMembers = loadingMembersId === p.id;
                    const members = membersCache[p.id] || [];
                    const gradientColor = getTeamColor(p.id);

                    return (
                      <div
                        key={p.id}
                        className={`
                          bg-white dark:bg-[#1a1a1a] rounded-2xl border transition-all duration-500 overflow-hidden group 
                          ${isExpanded
                            ? 'border-blue-500 shadow-xl ring-1 ring-blue-500/20 z-10'
                            : 'border-gray-200 dark:border-neutral-800 shadow-sm hover:border-gray-300 dark:hover:border-neutral-700 hover:shadow-md'
                          }
                        `}
                      >
                        {/* HEADER DEL ITEM */}
                        <div
                          onClick={() => handleToggleAccordion(p.id)}
                          style={{ borderLeftColor: isExpanded ? 'transparent' : gradientColor.split('-')[1].split(' ')[0] + (gradientColor.includes('amber') || gradientColor.includes('emerald') || gradientColor.includes('rose') || gradientColor.includes('purple') || gradientColor.includes('indigo') || gradientColor.includes('blue') ? '' : '') }}
                          className={`
                            p-4 cursor-pointer relative overflow-hidden border-l-4 sm:border-l-0
                          `}
                        >
                          {/* Re-ajuste: Usaremos una técnica más robusta para el color del borde en línea */}
                          <div
                            className="absolute inset-y-0 left-0 w-1 sm:hidden transition-colors"
                            style={{ backgroundColor: `var(--tw-gradient-from, ${gradientColor.split('-')[1].split(' ')[0]})`.replace('blue', '#3b82f6').replace('purple', '#a855f7').replace('amber', '#f59e0b').replace('emerald', '#10b981').replace('indigo', '#6366f1').replace('rose', '#f43f5e') }}
                          />
                          <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                              <div className={`hidden sm:flex w-12 h-12 rounded-xl bg-linear-to-br ${gradientColor} items-center justify-center text-white/90 shadow-md shrink-0`}>
                                <Users size={24} strokeWidth={2.5} />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-base text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {p.nombre}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                  <UserCircle size={13} /> {p.miembros_count} integrantes
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {onSelectPlantilla && (
                                <button onClick={(e) => handleSelect(e, p.id)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md shadow-blue-500/20 active:scale-95 transition-transform">
                                  Usar
                                </button>
                              )}
                              {/* Botones SIEMPRE visibles */}
                              <div className="flex items-center gap-0.5 transition-opacity">
                                <button
                                  onClick={(e) => handleEdit(e, p)}
                                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:text-[#9c8e7c] dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                  title="Editar"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  onClick={(e) => handleDelete(e, p.id, p.nombre)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:text-[#9c8e7c] dark:hover:bg-red-900/20 rounded-lg transition-all"
                                  title="Eliminar"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* BODY DEL ACORDEÓN */}
                        <div className={`bg-gray-50/50 dark:bg-black/30 border-t border-gray-100 dark:border-neutral-800 transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-y-auto custom-scrollbar`}>
                          {isLoadingMembers ? (
                            <div className="flex items-center justify-center p-6 text-gray-400 gap-2 text-xs">
                              <Loader2 size={16} className="animate-spin text-blue-500" /> Cargando miembros...
                            </div>
                          ) : (
                            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2"> {/* Grid interno para los miembros se ve mejor */}
                              {members.length > 0 ? members.map((m) => (
                                <div key={m.usuario_id} className="group/member flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800/50 hover:border-blue-200 dark:hover:border-blue-900/30 transition-all shadow-sm">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    {/* ICONO DE USUARIO CON CORONA PARA LÍDERES */}
                                    <div className={`relative w-9 h-9 rounded-full flex items-center justify-center shadow-sm shrink-0 transition-colors ${m.es_encargado ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-500/20' : 'bg-gray-100 text-gray-400 dark:bg-neutral-800 dark:text-gray-500 group-hover/member:bg-blue-50 dark:group-hover/member:bg-blue-900/20 group-hover/member:text-blue-500'}`}>
                                      <UserCircle size={20} />
                                      {m.es_encargado && (
                                        <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 shadow-sm">
                                          <Crown size={8} className="fill-white" />
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex flex-col min-w-0">
                                      <span className={`text-xs font-semibold truncate ${m.es_encargado ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {m.nombre}
                                      </span>
                                      {m.rol && <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate">{m.rol}</span>}
                                    </div>
                                  </div>

                                  {m.es_encargado && (
                                    <span className="text-[9px] px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full border border-amber-100 dark:border-amber-800/50 font-bold uppercase tracking-tight shrink-0">
                                      Líder
                                    </span>
                                  )}
                                </div>
                              )) : (
                                <div className="col-span-full p-4 text-center text-xs text-gray-400 italic">No hay miembros registrados</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6 animate-in slide-in-from-right-4 duration-300 h-full flex flex-col relative z-10">
              <div className="shrink-0">
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Nombre del Equipo</label>
                <input
                  value={nombreEquipo}
                  onChange={e => setNombreEquipo(e.target.value)}
                  placeholder="Ej. Banda Principal..."
                  className="w-full px-4 py-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-neutral-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-sm text-gray-800 dark:text-white"
                  autoFocus
                />
              </div>

              <div className="flex-1">
                <SeccionEquipo
                  integrantes={integrantes}
                  setIntegrantes={setIntegrantes}
                  usuarios={usuarios}
                />
              </div>

              {/* BOTONES DE ACCIÓN - Al final del flujo con margen inferior para que no pegue el borde */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 pb-8 border-t border-gray-100 dark:border-neutral-800 shrink-0 mt-6">
                <button 
                  type="button" 
                  onClick={() => setView('LIST')} 
                  className="flex-1 py-3 text-gray-600 dark:text-gray-400 font-bold bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-neutral-800 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  <ArrowLeft size={18} /> Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={guardar.isPending} 
                  className="flex-1 py-3 text-white font-bold bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-sm active:scale-95"
                >
                  {guardar.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Guardar Plantilla
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}