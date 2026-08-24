'use client';

import { useState } from 'react';
import { Check, Plus, Trash2, BookOpen, Edit2, Loader2, X } from 'lucide-react';
import { usePlanificadorMutations } from '../lib/hooks';
import { DonEspiritual } from '../lib/zod';
import Swal from 'sweetalert2';

interface Props {
  actividadId: string;
  donesIniciales: DonEspiritual[] | null;
  readonly?: boolean;
}

export default function GestorDones({ actividadId, donesIniciales, readonly = false }: Props) {
  const [nombrePersona, setNombrePersona] = useState('');
  const [palabras, setPalabras] = useState('');
  const [citasBiblicas, setCitasBiblicas] = useState('');
  const [editingDonId, setEditingDonId] = useState<string | null>(null);
  const [isEditingForm, setIsEditingForm] = useState(false);
  
  const { agregarDon, borrarDon } = usePlanificadorMutations();

  const dones = donesIniciales || [];

  const resetForm = () => {
    setNombrePersona('');
    setPalabras('');
    setCitasBiblicas('');
    setEditingDonId(null);
    setIsEditingForm(false);
  };

  const openEdit = (don?: DonEspiritual) => {
    if (don) {
      setNombrePersona(don.nombre_persona);
      setPalabras(don.palabras);
      setCitasBiblicas(don.citas_biblicas || '');
      setEditingDonId(don.id);
    } else {
      setNombrePersona('');
      setPalabras('');
      setCitasBiblicas('');
      setEditingDonId(null);
    }
    setIsEditingForm(true);
  };

  const handleSave = async () => {
    if (!nombrePersona.trim() || !palabras.trim()) {
      Swal.fire({
        title: 'Campos incompletos',
        text: 'Debes ingresar el nombre de la persona y las palabras que dijo.',
        icon: 'warning',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    try {
      const nuevoDon: Partial<DonEspiritual> = {
        id: editingDonId || '',
        actividad_id: actividadId,
        nombre_persona: nombrePersona.trim(),
        palabras: palabras.trim(),
        citas_biblicas: citasBiblicas.trim()
      };

      await agregarDon.mutateAsync({ id: actividadId, don: nuevoDon });
      
      resetForm();
      
      Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
      }).fire({ icon: 'success', title: 'Registro guardado' });
      
    } catch (e: any) {
      Swal.fire('Error al guardar', e.message || 'No se pudo guardar el registro', 'error');
    }
  };

  const handleDelete = async (donId: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar registro?',
      text: "Se borrará permanentemente.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#fff',
      color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
    });

    if (result.isConfirmed) {
      try {
        await borrarDon.mutateAsync({ donId });
      } catch (e: any) {
        Swal.fire('Error', 'No se pudo eliminar: ' + e.message, 'error');
      }
    }
  };

  const isPending = agregarDon.isPending || borrarDon.isPending;

  return (
    <div className="flex flex-col gap-4 mt-4 border-t border-gray-100 dark:border-neutral-800 pt-4">
      {/* CABECERA */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <div className="p-1.5 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-lg text-fuchsia-600 dark:text-fuchsia-400">
            <BookOpen size={16}/> 
          </div>
          Dones Espirituales
        </label>
        
        {!readonly && (
          <button 
            onClick={() => {
              if (isEditingForm) {
                resetForm();
              } else {
                openEdit();
              }
            }}
            className="text-[10px] uppercase tracking-wider text-fuchsia-500 hover:text-fuchsia-600 font-bold flex items-center gap-1 transition-colors"
          >
            {isEditingForm ? 'Cancelar' : <><Plus size={14}/> Agregar Don</>}
          </button>
        )}
      </div>

      {/* FORMULARIO */}
      {isEditingForm && (
        <div className="flex flex-col gap-3 p-4 bg-gray-50 dark:bg-neutral-900/50 rounded-xl border border-gray-100 dark:border-neutral-800 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 gap-3">
            <input 
              type="text"
              value={nombrePersona}
              onChange={(e) => setNombrePersona(e.target.value)}
              placeholder="Nombre de la persona"
              className="w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fuchsia-500/20 transition-all"
            />
            <textarea
              value={palabras}
              onChange={(e) => setPalabras(e.target.value)}
              placeholder="Palabras o mensaje..."
              rows={3}
              className="w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fuchsia-500/20 transition-all resize-none"
            />
            <input 
              type="text"
              value={citasBiblicas}
              onChange={(e) => setCitasBiblicas(e.target.value)}
              placeholder="Citas bíblicas (opcional)"
              className="w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fuchsia-500/20 transition-all"
            />
            
            <div className="flex justify-end gap-2 mt-1">
              <button 
                onClick={resetForm} 
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave} 
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-11 gap-1"
              >
                {agregarDon.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14}/>}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LISTADO DE DONES */}
      <div className="flex flex-col gap-3">
        {dones.length > 0 ? (
          <>
            {/* Cabecera para versión PC */}
            <div className="hidden md:grid grid-cols-[200px_1fr_150px_60px] gap-4 px-4 py-3 mt-2 text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-900/50 rounded-t-xl">
              <span>Nombre de persona</span>
              <span>Palabras</span>
              <span>Citas</span>
              {!readonly && <span className="text-center">Acciones</span>}
            </div>

            <div className="flex flex-col gap-3 md:gap-0 md:bg-white md:dark:bg-neutral-900 md:border md:border-t-0 md:border-gray-200 md:dark:border-neutral-700 md:rounded-b-xl md:overflow-hidden md:-mt-3">
              {dones.map((don, idx) => (
                <div 
                  key={don.id} 
                  className={`group relative flex flex-col gap-1.5 py-3 px-1.5 rounded-[1.25rem] border border-gray-100 dark:border-neutral-800 bg-white dark:bg-[#151515] shadow-sm hover:shadow-md transition-all 
                              md:grid md:grid-cols-[200px_1fr_150px_60px] md:gap-4 md:px-4 md:py-3 md:items-start md:border-0 md:border-b md:border-gray-100 md:dark:border-neutral-800 md:rounded-none md:shadow-none md:hover:shadow-none md:hover:bg-gray-50 md:dark:hover:bg-neutral-800/50 md:dark:bg-transparent
                              ${idx === dones.length - 1 ? 'md:border-b-0' : ''}`}
                >
                  {/* Celda: Nombre (En móvil es la cabecera) */}
                  <div className="flex justify-between items-center md:h-full">
                    <span className="text-[14px] font-bold text-gray-900 dark:text-gray-100 flex items-center md:font-medium md:text-[13px] px-1">
                      {don.nombre_persona}
                    </span>
                  </div>
                  
                  {/* Celda: Palabras */}
                  <div className="mt-1 md:mt-0 text-sm text-gray-700 dark:text-[#b3b3b3] italic bg-gray-50 dark:bg-[#1e1e1e] py-2.5 px-1.5 rounded-xl border-l-[3px] border-fuchsia-600 dark:border-fuchsia-600 md:bg-transparent md:p-0 md:border-0 md:not-italic md:text-gray-600 md:dark:text-gray-400">
                    "{don.palabras}"
                  </div>

                  {/* Celda: Citas PC */}
                  <div className="hidden md:flex mt-1 md:mt-0 text-[13px] font-bold text-fuchsia-600 dark:text-fuchsia-500 items-center h-full">
                    {don.citas_biblicas || <span className="text-gray-400 font-normal italic">Sin citas</span>}
                  </div>

                  {/* Fila Inferior Móvil: Citas + Acciones */}
                  <div className="flex items-center justify-between mt-1 md:hidden px-1">
                    <div className="text-[13px] font-bold text-fuchsia-600 dark:text-fuchsia-500">
                      {don.citas_biblicas}
                    </div>
                    
                    {!readonly && (
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEdit(don)} className="text-gray-400 hover:text-white transition-colors p-1">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(don.id)} disabled={borrarDon.isPending} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                          {borrarDon.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Botones PC */}
                  {!readonly && (
                    <div className="hidden md:flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity h-full">
                      <button onClick={() => openEdit(don)} className="p-1 text-gray-400 hover:text-blue-500 rounded-md" title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(don.id)} disabled={borrarDon.isPending} className="p-1 text-gray-400 hover:text-red-500 rounded-md" title="Eliminar">
                        {borrarDon.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          !isEditingForm && (
            <div className="p-8 border border-dashed border-gray-200 dark:border-neutral-800 rounded-xl flex flex-col items-center justify-center text-gray-400 gap-2 bg-gray-50/30 dark:bg-neutral-900/10">
              <BookOpen size={28} className="opacity-20" />
              <span className="text-[11px] font-medium italic">No se han registrado dones para esta actividad</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

const BookIcon = ({ size, className }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v2H6.5a.5.5 0 0 0 0 1H20v14H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
  </svg>
);
