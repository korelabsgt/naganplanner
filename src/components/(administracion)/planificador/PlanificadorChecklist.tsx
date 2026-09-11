'use client';

import { useState } from 'react';
import { Check, Edit2, Trash2, Plus, Loader2, X, Save, CheckSquare } from 'lucide-react';
import Swal from 'sweetalert2';
import { usePlanificadorMutations } from './lib/hooks';
import { ChecklistItem } from './lib/zod';

interface Props {
  planificadorId: string;
  checklist: ChecklistItem[]; 
  readOnly?: boolean;
  puedeEditarEstructura?: boolean;
  onChecklistChange?: (newChecklist: ChecklistItem[]) => void;
}

export default function PlanificadorChecklist({ 
  planificadorId, 
  checklist = [], 
  readOnly = false,
  puedeEditarEstructura = false, 
  onChecklistChange 
}: Props) {
  const { updateChecklist } = usePlanificadorMutations();

  const [newItemText, setNewItemText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // Ordenamos: Pendientes primero, Completados después.
  // Guardamos 'originalIndex' para saber qué borrar/editar en el array real.
  const itemsOrdenados = (checklist || []).map((item, index) => ({ ...item, originalIndex: index }))
    .sort((a, b) => Number(a.is_completed) - Number(b.is_completed));

  const isLoading = updateChecklist.isPending;

  // --- MANEJADORES ---

  const handleToggle = async (originalIndex: number) => {
    if (readOnly || isLoading) return;

    const newList = [...checklist];
    newList[originalIndex] = { 
      ...newList[originalIndex], 
      is_completed: !newList[originalIndex].is_completed 
    };

    if (onChecklistChange) onChecklistChange(newList);

    try {
      await updateChecklist.mutateAsync({ id: planificadorId, items: newList });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar el estado', timer: 1500, showConfirmButton: false });
    }
  };

  const handleAdd = async () => {
    if (!newItemText.trim() || !puedeEditarEstructura || readOnly) return;

    const newList = [...(checklist || []), { title: newItemText.trim(), is_completed: false }];

    if (onChecklistChange) onChecklistChange(newList);

    try {
      setNewItemText(''); 
      await updateChecklist.mutateAsync({ id: planificadorId, items: newList });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo agregar el item' });
    }
  };

  const handleDelete = async (originalIndex: number) => {
    if (!puedeEditarEstructura || readOnly) return;

    const result = await Swal.fire({
      title: '¿Eliminar tarea?',
      text: "No podrás revertir esta acción",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      // Soporte Dark Mode en el modal
      background: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#fff',
      color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
      customClass: { popup: 'rounded-2xl' }
    });

    if (result.isConfirmed) {
      const newList = checklist.filter((_, i) => i !== originalIndex);
      
      if (onChecklistChange) onChecklistChange(newList);

      try {
        await updateChecklist.mutateAsync({ id: planificadorId, items: newList });
        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1000, showConfirmButton: false });
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar' });
      }
    }
  };

  const startEditing = (index: number, currentText: string) => {
    if (!puedeEditarEstructura || readOnly) return;
    setEditingIndex(index);
    setEditingText(currentText);
  };

  const saveEdit = async (originalIndex: number) => {
    if (!editingText.trim() || !puedeEditarEstructura || readOnly) return;

    const newList = [...checklist];
    newList[originalIndex] = { ...newList[originalIndex], title: editingText.trim() };

    if (onChecklistChange) onChecklistChange(newList);

    try {
      await updateChecklist.mutateAsync({ id: planificadorId, items: newList });
      setEditingIndex(null);
      setEditingText('');
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar el texto' });
    }
  };

  if (!checklist.length && !puedeEditarEstructura) return null;

  return (
    <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800">
      <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
        <CheckSquare size={16} className="text-blue-500" /> 
        Lista de Verificación
      </div>
      
      {/* LISTA DE ITEMS CON SCROLL */}
      {/* CORRECCIÓN: 'max-height: 300px;' no es válido en Tailwind, se usa 'max-h-[300px]' */}
      <ul className="space-y-2 max-h-75 overflow-y-auto pr-2 custom-scrollbar">
        {itemsOrdenados.map((item) => (
          <li 
            key={item.originalIndex}
            className={`
              group flex items-start gap-3 p-2 rounded-lg transition-all border
              ${item.is_completed 
                ? 'bg-slate-50/50 dark:bg-neutral-800/30 border-transparent' 
                : 'bg-white dark:bg-neutral-900 border-slate-100 dark:border-neutral-800 hover:border-blue-200 dark:hover:border-blue-900'}
            `}
          >
            {/* Checkbox Custom */}
            <button
              onClick={() => handleToggle(item.originalIndex)}
              disabled={readOnly}
              className={`
                mt-0.5 shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all
                ${item.is_completed 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : 'bg-white dark:bg-neutral-800 border-slate-300 dark:border-neutral-600 hover:border-blue-400'}
                ${readOnly ? 'cursor-default' : 'cursor-pointer active:scale-90'}
              `}
            >
              {item.is_completed && <Check size={14} strokeWidth={3} />}
            </button>

            {/* Contenido (Texto o Input Edición) */}
            <div className="flex-1 min-w-0">
              {editingIndex === item.originalIndex ? (
                <div className="flex items-center gap-2 animate-in fade-in">
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(item.originalIndex)}
                    autoFocus
                    className="flex-1 text-sm bg-slate-50 dark:bg-neutral-800 border-b-2 border-blue-500 outline-none px-1 py-0.5 text-gray-800 dark:text-gray-200"
                  />
                  <button onClick={() => saveEdit(item.originalIndex)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save size={16}/></button>
                  <button onClick={() => setEditingIndex(null)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={16}/></button>
                </div>
              ) : (
                <span 
                  onDoubleClick={() => !item.is_completed && startEditing(item.originalIndex, item.title)}
                  className="text-sm wrap-break-word block text-slate-700 dark:text-gray-200"
                >
                  {item.title}
                </span>
              )}
            </div>

            {/* Botones de Acción */}
            {puedeEditarEstructura && !readOnly && editingIndex !== item.originalIndex && (
              <div className="flex items-center gap-1 transition-opacity">
                <button 
                  onClick={() => startEditing(item.originalIndex, item.title)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => handleDelete(item.originalIndex)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* INPUT PARA AGREGAR NUEVO */}
      {puedeEditarEstructura && !readOnly && (
        <div className="pt-2 mt-2 border-t border-dashed border-gray-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <input 
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Añadir nueva tarea..."
              className="flex-1 text-sm px-3 py-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-gray-800 dark:text-gray-200"
            />
            <button 
              onClick={handleAdd}
              disabled={!newItemText.trim() || isLoading}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-200 dark:shadow-none"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}