import { useState } from 'react';
import { Plus, CheckSquare, MinusCircle } from 'lucide-react';
import { ChecklistItem } from '@/components/(administracion)/planificador/lib/zod';

interface Props {
  checklist: ChecklistItem[];
  setChecklist: (items: ChecklistItem[]) => void;
  disabled?: boolean; // <--- NUEVA PROP
}

export function SeccionChecklist({ checklist, setChecklist, disabled = false }: Props) {
  const [newItemText, setNewItemText] = useState('');

  const handleAdd = () => {
    if (!newItemText.trim()) return;
    setChecklist([...checklist, { title: newItemText.trim(), is_completed: false }]);
    setNewItemText('');
  };

  const handleRemove = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <label className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
        <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
          <CheckSquare size={16}/> 
        </div>
        Lista de Verificación (Opcional)
      </label>

      <div className={`bg-gray-50/50 dark:bg-neutral-900/30 rounded-2xl border border-gray-100 dark:border-neutral-800 p-4 space-y-3 ${disabled ? 'opacity-70' : ''}`}>
        
        {/* INPUT DE AGREGAR (Se oculta o bloquea si está disabled) */}
        <div className="flex gap-2">
          <input 
            type="text" 
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !disabled && (e.preventDefault(), handleAdd())}
            placeholder={disabled ? "Edición bloqueada" : "Escribe una tarea y presiona Enter..."}
            disabled={disabled}
            className="flex-1 px-4 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:border-blue-500 transition-all text-gray-800 dark:text-gray-200 disabled:bg-gray-100 disabled:dark:bg-neutral-900 disabled:cursor-not-allowed"
          />
          <button 
            type="button"
            onClick={handleAdd}
            disabled={!newItemText.trim() || disabled}
            className="p-2 bg-gray-200 dark:bg-neutral-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-green-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18}/>
          </button>
        </div>

        {/* LISTA DE ITEMS */}
        <div className="space-y-2 max-h-37.5 overflow-y-auto pr-1 custom-scrollbar">
          {checklist.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2 italic">No hay tareas agregadas</p>
          ) : (
            checklist.map((item, index) => (
              <div key={index} className="flex items-center justify-between group p-2 bg-white dark:bg-neutral-800/50 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-neutral-700 transition-all">
                <span className="text-sm text-gray-700 dark:text-gray-300 pl-1">{item.title}</span>
                
                {/* Botón eliminar: Solo visible si NO está deshabilitado */}
                {!disabled && (
                  <button 
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                  >
                    <MinusCircle size={16}/>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}