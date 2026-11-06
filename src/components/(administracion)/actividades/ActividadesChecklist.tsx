'use client';

import { useState } from 'react';
import { Check, Edit2, Trash2, Plus, Loader2, X, Save } from 'lucide-react';
import Swal from 'sweetalert2';
import { useActividadMutations } from '@/components/(administracion)/actividades/lib/hooks';
import { ChecklistItem } from '@/components/(administracion)/actividades/lib/zod';

interface Props {
  actividadId: string;
  checklist: ChecklistItem[]; 
  readOnly?: boolean;
  onChecklistChange?: (newChecklist: ChecklistItem[]) => void;
}

export default function ActividadesChecklist({ actividadId, checklist = [], readOnly = false, onChecklistChange }: Props) {
  const { updateChecklistMutation } = useActividadMutations();

  const [newItemText, setNewItemText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  const itemsOrdenados = checklist.map((item, index) => ({ ...item, originalIndex: index }))
    .sort((a, b) => Number(a.is_completed) - Number(b.is_completed));

  const isLoading = updateChecklistMutation.isPending;

  // --- MANEJADORES ---

  const handleToggle = async (originalIndex: number) => {
    if (readOnly || isLoading) return;

    const newList = [...checklist];
    newList[originalIndex].is_completed = !newList[originalIndex].is_completed;

    if (onChecklistChange) onChecklistChange(newList);

    try {
      await updateChecklistMutation.mutateAsync({ id: actividadId, items: newList });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar el estado', timer: 1500, showConfirmButton: false });
    }
  };

  const handleAdd = async () => {
    if (!newItemText.trim() || readOnly) return;

    const newList = [...checklist, { title: newItemText.trim(), is_completed: false }];

    if (onChecklistChange) onChecklistChange(newList);

    try {
      setNewItemText(''); 
      await updateChecklistMutation.mutateAsync({ id: actividadId, items: newList });
      
      const Toast = Swal.mixin({
        toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true
      });
      Toast.fire({ icon: 'success', title: 'Item agregado' });

    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo agregar el item' });
    }
  };

  const handleDelete = async (originalIndex: number) => {
    if (readOnly) return;

    const result = await Swal.fire({
      title: '¿Eliminar paso?',
      text: "No podrás revertir esta acción",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#fff',
      customClass: { popup: 'rounded-2xl' }
    });

    if (result.isConfirmed) {
      const newList = checklist.filter((_, i) => i !== originalIndex);
      
      if (onChecklistChange) onChecklistChange(newList);

      try {
        await updateChecklistMutation.mutateAsync({ id: actividadId, items: newList });
        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1000, showConfirmButton: false });
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar' });
      }
    }
  };

  const startEditing = (index: number, currentText: string) => {
    if (readOnly) return;
    setEditingIndex(index);
    setEditingText(currentText);
  };

  const saveEdit = async (originalIndex: number) => {
    if (!editingText.trim() || readOnly) return;

    const newList = [...checklist];
    newList[originalIndex].title = editingText.trim();

    if (onChecklistChange) onChecklistChange(newList);

    try {
      await updateChecklistMutation.mutateAsync({ id: actividadId, items: newList });
      setEditingIndex(null);
      setEditingText('');
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar el texto' });
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative">
      
      {/* LISTA DE ITEMS */}
      <ul className="space-y-2 pb-2">
        {itemsOrdenados.map((item) => (
          <li 
            key={item.originalIndex}
            className={`
              group flex items-start gap-3 p-2 rounded-lg transition-all border
              ${item.is_completed 
                ? 'bg-slate-50/50 dark:bg-neutral-800/30 border-transparent' // Se eliminó opacity-70
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
                    className="flex-1 text-sm bg-slate-50 dark:bg-neutral-800 border-b-2 border-blue-500 outline-none px-1 py-0.5"
                  />
                  <button onClick={() => saveEdit(item.originalIndex)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save size={16}/></button>
                  <button onClick={() => setEditingIndex(null)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={16}/></button>
                </div>
              ) : (
                <span 
                  onDoubleClick={() => !item.is_completed && startEditing(item.originalIndex, item.title)}
                  // Se unificó el color del texto para que no se atenúe
                  className="text-sm overflow-wrap: break-word text-slate-700 dark:text-gray-200"
                >
                  {item.title}
                </span>
              )}
            </div>

            {/* Botones de Acción */}
            {!readOnly && editingIndex !== item.originalIndex && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
      {!readOnly && (
        <div className="sticky bottom-0 z-10 pt-2">
          <div className="flex items-center gap-2">
            <input 
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Nuevo paso..."
              className="flex-1 text-sm px-3 py-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
            />
            <button 
              onClick={handleAdd}
              disabled={!newItemText.trim() || isLoading}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-100 disabled:cursor-not-allowed shadow-sm shadow-blue-200 dark:shadow-none"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}