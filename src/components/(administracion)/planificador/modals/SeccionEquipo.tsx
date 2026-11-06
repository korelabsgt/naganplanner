'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Users, Plus, Crown, Trash2, Briefcase, UserCircle } from 'lucide-react';
import { Perfil } from '@/components/(administracion)/planificador/lib/zod';
import { useRolesSugeridos } from '@/components/(administracion)/planificador/lib/hooks';
import Swal from 'sweetalert2';

export type IntegranteUI = {
  usuario_id: string;
  nombre: string;
  avatar_url?: string | null;
  es_encargado: boolean;
  rol?: string;
  is_new?: boolean;
};

interface Props {
  integrantes: IntegranteUI[];
  setIntegrantes: (items: IntegranteUI[]) => void;
  usuarios: Perfil[];
  disabled?: boolean;
  hideSearch?: boolean;
}

export function SeccionEquipo({ integrantes, setIntegrantes, usuarios, disabled = false, hideSearch = false }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeRolInput, setActiveRolInput] = useState<string | null>(null);

  // USANDO TANSTACK QUERY PARA ROLES (Caché optimizada)
  const { data: rolesSugeridosDB = [] } = useRolesSugeridos();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const rolDropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (rolDropdownRef.current && !rolDropdownRef.current.contains(event.target as Node)) {
        setActiveRolInput(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUsuarios = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !integrantes.some(i => i.usuario_id === u.id)
  );

  const handleAddUser = (user: Perfil) => {
    if (disabled) return;
    const esPrimero = integrantes.length === 0;
    const nuevo: IntegranteUI = {
      usuario_id: user.id,
      nombre: user.nombre,
      avatar_url: user.avatar_url,
      es_encargado: esPrimero,
      rol: '',
      is_new: true
    };
    setIntegrantes([...integrantes, nuevo]);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleRemoveUser = (userId: string, nombre: string) => {
    if (disabled) return;
    const nuevos = integrantes.filter(i => i.usuario_id !== userId);
    if (nuevos.length > 0 && !nuevos.some(i => i.es_encargado)) {
      nuevos[0].es_encargado = true;
    }
    setIntegrantes(nuevos);

    // NOTIFICACIÓN PERSONALIZADA SLIDE-DOWN
    Swal.fire({
      toast: true,
      position: 'top',
      showConfirmButton: false,
      timer: 5000,
      timerProgressBar: true,
      icon: 'success',
      title: `Has removido a ${nombre} del equipo`,
      showClass: {
        popup: 'animate__animated animate__slideInDown'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutUp'
      },
      background: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#fff',
      color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
    });
  };

  const handleSetEncargado = (userId: string) => {
    if (disabled) return;
    const actualizados = integrantes.map(i => ({
      ...i,
      es_encargado: i.usuario_id === userId ? !i.es_encargado : i.es_encargado
    }));
    setIntegrantes(actualizados);
  };

  const handleUpdateRol = (userId: string, rol: string) => {
    if (disabled) return;
    setIntegrantes(integrantes.map(i =>
      i.usuario_id === userId ? { ...i, rol } : i
    ));
  };

  return (
    <div className="space-y-4">

      {/* BUSCADOR DE INTEGRANTES - Solo visible si no está deshabilitado y hideSearch es falso */}
      {!disabled && !hideSearch && (
        <div className="relative" ref={dropdownRef}>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 border border-gray-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-neutral-900 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Buscar integrante por nombre..."
                className="w-full bg-transparent outline-none text-sm text-gray-800 dark:text-white placeholder:text-gray-400"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                const esPrimero = integrantes.length === 0;
                const nuevos = filteredUsuarios.map((u, i) => ({
                  usuario_id: u.id,
                  nombre: u.nombre,
                  avatar_url: u.avatar_url,
                  es_encargado: esPrimero && i === 0,
                  rol: '',
                  is_new: true
                }));
                if (nuevos.length > 0) {
                  setIntegrantes([...integrantes, ...nuevos]);
                  setSearchTerm('');
                  setShowDropdown(false);
                }
              }}
              disabled={filteredUsuarios.length === 0}
              className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              title="Añadir a todos los integrantes disponibles"
            >
              <Users size={18} />
              <span className="inline">Añadir Todos</span>
            </button>
          </div>

          {showDropdown && (
            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-neutral-800 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1">
              {filteredUsuarios.length > 0 ? filteredUsuarios.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleAddUser(u)}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-white/5 text-sm dark:text-gray-200 border-b border-gray-50 dark:border-white/5 last:border-0 flex items-center gap-3 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-full bg-linear-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white shadow-sm shrink-0">
                    <UserCircle size={16} />
                  </div>
                  <span className="flex-1 font-medium truncate">{u.nombre}</span>
                  <Plus size={14} className="text-blue-500 opacity-0 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                </button>
              )) : (
                <div className="px-4 py-6 text-[11px] text-gray-400 text-center flex flex-col items-center gap-1">
                  <Users size={16} className="opacity-20" />
                  <span>No hay resultados</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* LISTA DE INTEGRANTES SELECCIONADOS */}
      <div className="space-y-2" ref={rolDropdownRef}>
        {integrantes.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-gray-200 dark:border-neutral-800 rounded-2xl flex flex-col items-center justify-center text-gray-400 gap-3 bg-gray-50/30 dark:bg-neutral-900/20">
            <div className="p-3 bg-white dark:bg-neutral-800 rounded-full shadow-sm">
              <Users size={24} className="opacity-40" />
            </div>
            <span className="text-sm font-medium italic">Añade usuarios para comenzar</span>
          </div>
        ) : (
          integrantes.map((miembro) => {
            const sugerencias = rolesSugeridosDB.filter(r =>
              r.toLowerCase().includes((miembro.rol || '').toLowerCase()) &&
              r.toLowerCase() !== (miembro.rol || '').toLowerCase()
            );
            const mostrarSugerencias = !disabled && activeRolInput === miembro.usuario_id && sugerencias.length > 0;

            return (
              <div
                key={miembro.usuario_id}
                className={`
                  relative group flex flex-col gap-2.5 p-3 rounded-xl border transition-all duration-300 animate-in slide-in-from-bottom-2 fade-in
                  ${miembro.es_encargado
                    ? 'bg-blue-50/60 border-blue-200 dark:bg-blue-900/10 dark:border-blue-900/30'
                    : 'bg-white border-gray-100 dark:bg-neutral-900 dark:border-neutral-800'
                  }
                `}
              >
                {/* CABECERA: NOMBRE + ACCIONES */}
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center shadow-sm shrink-0 
                      ${miembro.es_encargado ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-400'}
                    `}>
                      <UserCircle size={16} />
                    </div>
                    <span className={`text-sm truncate ${miembro.es_encargado ? 'font-bold text-blue-900 dark:text-blue-100' : 'font-medium text-gray-700 dark:text-gray-200'}`}>
                      {miembro.nombre}
                    </span>
                  </div>

                  {!disabled && (
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSetEncargado(miembro.usuario_id)}
                        className={`
                          p-1.5 rounded-lg transition-all
                          ${miembro.es_encargado
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-300 hover:text-gray-500'}
                        `}
                        title={miembro.es_encargado ? "Quitar como encargado" : "Marcar como encargado"}
                      >
                        <Crown size={16} className={miembro.es_encargado ? 'fill-current' : ''} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveUser(miembro.usuario_id, miembro.nombre)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                        title="Eliminar integrante"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* FILA INFERIOR: INPUT DE ROL */}
                <div className="relative w-full">
                  <div className={`relative group/input ${disabled ? 'opacity-70' : ''}`}>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <Briefcase size={14} />
                    </div>
                    <input
                      type="text"
                      placeholder={disabled ? "Rol asignado" : "Asignar rol (ej: Guitarra)"}
                      value={miembro.rol || ''}
                      onChange={(e) => {
                        handleUpdateRol(miembro.usuario_id, e.target.value);
                        setActiveRolInput(miembro.usuario_id);
                      }}
                      onFocus={() => !disabled && setActiveRolInput(miembro.usuario_id)}
                      disabled={disabled}
                      className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 dark:bg-neutral-950 border border-gray-100 dark:border-neutral-800 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-700 dark:text-gray-200"
                    />
                  </div>

                  {mostrarSugerencias && (
                    <div className="absolute bottom-full left-0 mb-1 w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-neutral-700 rounded-xl shadow-xl z-30 max-h-40 overflow-y-auto">
                      {sugerencias.slice(0, 5).map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            handleUpdateRol(miembro.usuario_id, sug);
                            setActiveRolInput(null);
                          }}
                          className="w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 transition-colors border-b border-gray-50 dark:border-neutral-800 last:border-0"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}