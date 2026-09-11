'use client';
import { createPortal } from 'react-dom';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, User, Loader2, Edit2, X, Save, MoreVertical } from 'lucide-react';
import Swal from 'sweetalert2';
import { NotaReunion, Perfil } from '../lib/zod';
import { usePlanificadorMutations } from '../lib/hooks';

interface Props {
  actividadId: string;
  notasIniciales: NotaReunion[];
  usuarios: Perfil[];
  readonly: boolean;
  usuarioActualId: string;
}

function BuscadorUsuarios({ 
  value, 
  onChange, 
  usuarios,
  placeholder = "Sin asignar",
  isPillMode = false,
  disabled = false
}: { 
  value: string; 
  onChange: (val: string) => void; 
  usuarios: Perfil[];
  placeholder?: string;
  isPillMode?: boolean;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const openDropdown = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      // Un ancho de 320px es perfecto para mostrar dos nombres y dos apellidos
      const dropdownWidth = isPillMode ? 320 : rect.width;
      let left = rect.left + window.scrollX;
      
      if (isPillMode) {
        // Centrar respecto al pill
        left = left + (rect.width / 2) - (dropdownWidth / 2);
      }

      setCoords({
        top: rect.bottom + window.scrollY,
        left,
        width: dropdownWidth
      });
    }
    setIsOpen(!isOpen);
    setSearch('');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true); // true para capturar scroll de la tabla
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const selectedUser = usuarios.find(u => u.id === value);
  const filtered = usuarios.filter(u => u.nombre.toLowerCase().includes(search.toLowerCase()));

  const dropdownContent = (
    <div 
      ref={dropdownRef}
      style={{ position: 'absolute', top: coords.top, left: coords.left, width: coords.width }}
      className="z-[9999] mt-1 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-xl overflow-hidden"
    >
      <div className="p-2 border-b border-gray-200 dark:border-neutral-700">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 text-sm rounded px-2 py-1 outline-none focus:border-blue-500 dark:text-white"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="max-h-48 overflow-y-auto py-1">
        <button
          type="button"
          onClick={() => { onChange(''); setIsOpen(false); }}
          className="w-full text-left px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
        >
          {placeholder}
        </button>
        {filtered.map(u => (
          <button
            key={u.id}
            type="button"
            onClick={() => { onChange(u.id); setIsOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 truncate"
          >
            {u.nombre}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-2 text-sm text-gray-500 text-center">No hay resultados</div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`relative ${isPillMode ? 'inline-block' : 'w-full'}`} ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={disabled}
        onClick={openDropdown}
        className={isPillMode 
          ? "flex items-center gap-2 text-gray-700 dark:text-gray-300 bg-gray-200/50 dark:bg-neutral-800/50 hover:bg-gray-300/50 dark:hover:bg-neutral-700/50 px-2.5 py-1.5 rounded-md text-xs transition-colors outline-none max-w-[200px] sm:max-w-[300px] disabled:opacity-50 disabled:cursor-not-allowed"
          : "w-full bg-white dark:bg-neutral-950 border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-white text-sm rounded-lg pl-8 pr-3 py-1.5 text-left outline-none focus:border-blue-500 transition-colors flex items-center justify-between disabled:opacity-50"
        }
      >
        {isPillMode ? (
          <>
            <User size={14} className="shrink-0" />
            <span className="truncate">{selectedUser ? selectedUser.nombre : placeholder}</span>
          </>
        ) : (
          <>
            <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <span className="truncate">{selectedUser ? selectedUser.nombre : placeholder}</span>
          </>
        )}
      </button>
      
      {isOpen && typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </div>
  );
}

export default function GestorNotas({ actividadId, notasIniciales, usuarios, readonly, usuarioActualId }: Props) {
  const { agregarNota, borrarNota, toggleNota } = usePlanificadorMutations();

  const [nuevaNota, setNuevaNota] = useState('');
  const [nuevoResponsable, setNuevoResponsable] = useState<string>('');

  // Estado unificado: título + responsable + descripción en un solo modo edición
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotaText, setEditNotaText] = useState('');
  const [editResponsable, setEditResponsable] = useState<string>('');
  const [editDescText, setEditDescText] = useState('');

  const [expandedNotaId, setExpandedNotaId] = useState<string | null>(null);
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<'titulo' | 'descripcion'>('titulo');

  const isLoading = agregarNota.isPending || borrarNota.isPending || toggleNota.isPending;

  const handleGuardarNueva = async () => {
    if (!nuevaNota.trim() || readonly || isLoading) return;
    try {
      await agregarNota.mutateAsync({
        id: actividadId,
        nota: { nota: nuevaNota.trim(), responsable_id: nuevoResponsable || null, estado: 'pendiente' }
      });
      setNuevaNota('');
      setNuevoResponsable('');
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo guardar la nota', customClass: { popup: 'rounded-2xl' } });
    }
  };

  // Abre edición completa: título + responsable + descripción, y expande el acordeón
  const handleStartEdit = (nota: NotaReunion, target: 'titulo' | 'descripcion' = 'titulo') => {
    setEditingId(nota.id);
    setEditNotaText(nota.nota);
    setEditResponsable(nota.responsable_id || '');
    setEditDescText(nota.descripcion || '');
    setExpandedNotaId(nota.id);
    setFocusTarget(target);
  };

  const handleGuardarEdit = async (notaOriginal: NotaReunion) => {
    if (!editNotaText.trim() || readonly || isLoading || !editingId) return;
    try {
      await agregarNota.mutateAsync({
        id: actividadId,
        nota: {
          id: editingId,
          nota: editNotaText.trim(),
          responsable_id: editResponsable || null,
          estado: notaOriginal.estado,
          descripcion: editDescText.trim() || null
        }
      });
      setEditingId(null);
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo actualizar la nota', customClass: { popup: 'rounded-2xl' } });
    }
  };

  const handleCancelarEdit = () => {
    setEditingId(null);
    setEditNotaText('');
    setEditResponsable('');
    setEditDescText('');
  };

  const handleBorrar = async (notaId: string) => {
    if (readonly || isLoading) return;
    const result = await Swal.fire({
      title: '¿Eliminar nota?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      customClass: { popup: 'rounded-2xl', confirmButton: 'bg-red-500 text-white rounded-lg px-4 py-2 mx-2' }
    });
    if (result.isConfirmed) {
      try {
        await borrarNota.mutateAsync({ notaId });
      } catch (error: any) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo eliminar la nota' });
      }
    }
  };

  const handleToggleEstado = async (notaId: string, estadoActual: string | null | undefined) => {
    if (readonly || isLoading) return;
    try {
      await toggleNota.mutateAsync({ notaId, estadoActual });
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo cambiar el estado' });
    }
  };

  const getNombreUsuario = (id: string | null | undefined) => {
    if (!id) return 'Sin asignar';
    const user = usuarios.find(u => u.id === id);
    return user ? user.nombre : 'Usuario desconocido';
  };

  return (
    <div className="flex flex-col gap-4 px-0 py-4 sm:px-2 sm:py-5 bg-white dark:bg-neutral-900 rounded-2xl sm:border border-gray-200 dark:border-neutral-800 sm:shadow-sm mt-4">

      {/* HEADER */}
      <div className="flex items-center justify-between px-4 sm:px-2">
        <h4 className="font-bold text-gray-800 dark:text-white text-base flex items-center gap-2 tracking-wide uppercase text-sm">
          <Edit2 size={16} className="text-gray-500 dark:text-gray-400" />
          Notas
        </h4>
      </div>

      {/* TABLA DE NOTAS */}
      <div className="overflow-x-auto overflow-y-visible border border-gray-200 dark:border-neutral-800 rounded-xl bg-gray-50 dark:bg-neutral-950">
        <table className="w-full min-w-[800px] text-left text-sm text-gray-600 dark:text-gray-400">
          <thead className="bg-gray-100/50 dark:bg-neutral-900/50 text-xs uppercase text-gray-500 border-b border-gray-200 dark:border-neutral-800">
            <tr>
              <th className="px-4 py-3 font-bold w-10 text-center">✓</th>
              <th className="px-3 py-3 font-bold w-12 text-center border-l border-gray-200 dark:border-neutral-800">No.</th>
              <th className="px-4 py-3 font-bold border-l border-gray-200 dark:border-neutral-800">Notas</th>
              <th className="px-4 py-3 font-bold border-l border-gray-200 dark:border-neutral-800 w-[250px] sm:w-[350px] text-center">Responsable</th>
              {!readonly && <th className="px-4 py-3 font-bold border-l border-gray-200 dark:border-neutral-800 w-16 text-center">Acción</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
            {notasIniciales.length === 0 ? (
              <tr>
                <td colSpan={readonly ? 4 : 5} className="px-4 py-6 text-center text-gray-500 italic">
                  No hay notas registradas.
                </td>
              </tr>
            ) : (
              notasIniciales.map((nota, index) => {
                const isEditingThis = editingId === nota.id;
                const isExpandedThis = expandedNotaId === nota.id;

                return (
                  <React.Fragment key={nota.id}>
                    {/* FILA PRINCIPAL */}
                    <tr className={`transition-colors ${isExpandedThis ? 'bg-gray-100/50 dark:bg-neutral-900/50' : 'hover:bg-gray-100/50 dark:hover:bg-neutral-900/50'}`}>
                      
                      {/* Check */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleEstado(nota.id, nota.estado)}
                          disabled={isEditingThis || (readonly && nota.responsable_id !== usuarioActualId)}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors mx-auto ${nota.estado === 'completado'
                              ? 'bg-green-500/20 border-green-500 text-green-600 dark:text-green-500'
                              : 'border-gray-300 dark:border-neutral-600 hover:border-gray-400 text-transparent'
                            }`}
                        >✓</button>
                      </td>

                      {/* No. */}
                      <td
                        className="px-3 py-3 border-l border-gray-200 dark:border-neutral-800 text-center text-gray-500 font-mono text-xs cursor-pointer"
                        onClick={() => !isEditingThis && setExpandedNotaId(isExpandedThis ? null : nota.id)}
                      >{index + 1}</td>

                      {/* Nota / input */}
                      <td
                        className="px-4 py-3 border-l border-gray-200 dark:border-neutral-800 cursor-pointer"
                        onClick={() => !isEditingThis && setExpandedNotaId(isExpandedThis ? null : nota.id)}
                      >
                        {isEditingThis ? (
                          <input
                            type="text"
                            value={editNotaText}
                            onChange={(e) => setEditNotaText(e.target.value)}
                            placeholder="Título de la nota..."
                            className="w-full bg-white dark:bg-neutral-950 border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 transition-colors"
                            autoFocus={focusTarget === 'titulo'}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-gray-800 dark:text-gray-200">{nota.nota}</span>
                        )}
                      </td>

                      {/* Responsable / select */}
                      <td className="px-4 py-3 border-l border-gray-200 dark:border-neutral-800 text-center" onClick={(e) => e.stopPropagation()}>
                        {isEditingThis ? (
                          <BuscadorUsuarios 
                            value={editResponsable} 
                            onChange={setEditResponsable} 
                            usuarios={usuarios} 
                          />
                        ) : (
                          <BuscadorUsuarios 
                            value={nota.responsable_id || ''} 
                            onChange={(val) => {
                              if (readonly || isLoading) return;
                              agregarNota.mutate({
                                id: actividadId,
                                nota: {
                                  id: nota.id,
                                  nota: nota.nota,
                                  descripcion: nota.descripcion,
                                  estado: nota.estado,
                                  responsable_id: val || null
                                }
                              });
                            }} 
                            usuarios={usuarios} 
                            isPillMode={true}
                            disabled={readonly || isLoading}
                          />
                        )}
                      </td>

                      {/* Acción — rowSpan=2 cuando el acordeón está abierto */}
                      {!readonly && (
                        <td
                          rowSpan={isExpandedThis ? 2 : 1}
                          className="px-4 border-l border-gray-200 dark:border-neutral-800 text-center relative align-middle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isEditingThis ? (
                            <div className="flex flex-col items-center justify-center gap-1 py-2">
                              <button
                                onClick={() => handleGuardarEdit(nota)}
                                disabled={!editNotaText.trim() || isLoading}
                                className="p-1.5 text-green-600 dark:text-green-500 hover:bg-green-100 dark:hover:bg-green-500/10 rounded transition-colors disabled:opacity-50"
                                title="Guardar"
                              >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                              </button>
                              <button
                                onClick={handleCancelarEdit}
                                disabled={isLoading}
                                className="p-1.5 text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-700 rounded transition-colors"
                                title="Cancelar"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuAbiertoId(menuAbiertoId === nota.id ? null : nota.id);
                                }}
                                className="p-1.5 text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {menuAbiertoId === nota.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuAbiertoId(null); }} />
                                  <div className="absolute right-8 top-10 z-50 w-36 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-xl overflow-hidden flex flex-col py-1 animate-in fade-in zoom-in-95">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setMenuAbiertoId(null); handleStartEdit(nota); }}
                                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-white transition-colors text-left"
                                    >
                                      <Edit2 size={14} /> Editar
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setMenuAbiertoId(null); handleBorrar(nota.id); }}
                                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-neutral-800 hover:text-red-600 dark:hover:text-red-300 transition-colors text-left"
                                    >
                                      <Trash2 size={14} /> Eliminar
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>

                    {/* FILA ACORDEÓN DESCRIPCIÓN */}
                    {isExpandedThis && (
                      <tr className="bg-gray-50 dark:bg-neutral-950">
                        <td colSpan={4} className="p-0 border-b border-gray-200 dark:border-neutral-800">
                          <div className="p-4 border-l-2 border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/5 animate-in slide-in-from-top-2">
                            {isEditingThis ? (
                              <div className="flex flex-col gap-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wide">Descripción</p>
                                <textarea
                                  value={editDescText}
                                  onChange={(e) => setEditDescText(e.target.value)}
                                  placeholder="Escribe los detalles aquí..."
                                  autoFocus={focusTarget === 'descripcion'}
                                  className="w-full bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors min-h-[90px] resize-y"
                                />
                              </div>
                            ) : (
                              nota.descripcion ? (
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                                  {nota.descripcion}
                                </p>
                              ) : (
                                !readonly ? (
                                  <div 
                                    className="cursor-pointer group"
                                    onClick={() => handleStartEdit(nota, 'descripcion')}
                                  >
                                    <textarea
                                      readOnly
                                      value=""
                                      placeholder="Escribe una descripción aquí..."
                                      className="w-full bg-transparent border border-dashed border-gray-300 dark:border-neutral-700 text-gray-500 dark:text-gray-400 text-sm rounded-lg px-3 py-2 outline-none cursor-pointer group-hover:border-blue-500 transition-colors min-h-[50px] resize-none"
                                    />
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-400 italic">Sin descripción</p>
                                )
                              )
                            )}
                          </div>
                        </td>
                        {/* NO se agrega td de Acción — ya está cubierta por rowspan */}
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}

            {/* FILA PARA AGREGAR NUEVA NOTA */}
            {!readonly && (
              <tr className="bg-gray-100/50 dark:bg-neutral-900/40">
                <td className="px-4 py-3 text-center text-gray-400 dark:text-neutral-600">-</td>
                <td className="px-3 py-3 border-l border-gray-200 dark:border-neutral-800 text-center text-gray-500 font-mono text-xs">{notasIniciales.length + 1}</td>
                <td className="px-4 py-3 border-l border-gray-200 dark:border-neutral-800">
                  <input
                    type="text"
                    value={nuevaNota}
                    onChange={(e) => setNuevaNota(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleGuardarNueva(); }}
                    placeholder="Añadir nueva nota..."
                    className="w-full bg-white dark:bg-neutral-950 border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors"
                  />
                </td>
                <td className="px-4 py-3 border-l border-gray-200 dark:border-neutral-800 text-center">
                  <BuscadorUsuarios 
                    value={nuevoResponsable} 
                    onChange={setNuevoResponsable} 
                    usuarios={usuarios} 
                  />
                </td>
                <td className="px-4 py-3 border-l border-gray-200 dark:border-neutral-800 text-center">
                  <button
                    onClick={handleGuardarNueva}
                    disabled={!nuevaNota.trim() || isLoading}
                    className="w-full p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                    title="Añadir nota"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
