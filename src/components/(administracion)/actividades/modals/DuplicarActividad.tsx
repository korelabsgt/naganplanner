'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Calendar, User, AlignLeft, CheckSquare, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { useActividadMutations } from '@/components/(administracion)/actividades/lib/hooks';
import { Actividad, Perfil, ActividadForm, actividadFormSchema, ChecklistItem } from '@/components/(administracion)/actividades/lib/zod';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  actividadOriginal: Actividad | null;
  usuarios: Perfil[];
  usuarioActualId: string;
}

export default function DuplicarActividad({ isOpen, onClose, actividadOriginal, usuarios, usuarioActualId }: Props) {
  const { guardar } = useActividadMutations();

  // --- ESTADOS ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  
  // UI Helpers
  const [newItemText, setNewItemText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // --- EFECTO: PRECARGAR DATOS DE LA ORIGINAL ---
  useEffect(() => {
    if (isOpen && actividadOriginal) {
      setTitle(`${actividadOriginal.title} (Copia)`);
      setDescription(actividadOriginal.description || '');
      setAssignedTo(actividadOriginal.assigned_to || usuarioActualId);
      
      // Limpiamos los checks para que la nueva tarea empiece de cero
      const checklistLimpio = (actividadOriginal.checklist || []).map(item => ({
        ...item,
        is_completed: false
      }));
      setChecklist(checklistLimpio);

      const user = usuarios.find(u => u.id === actividadOriginal.assigned_to);
      setSearchTerm(user?.nombre || '');
      setDueDate(''); // Obligamos a elegir una fecha nueva
    }
  }, [isOpen, actividadOriginal, usuarios, usuarioActualId]);

  const handleAddCheckItem = () => {
    if (!newItemText.trim()) return;
    setChecklist([...checklist, { title: newItemText.trim(), is_completed: false }]);
    setNewItemText('');
  };

  const removeCheckItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rawData: ActividadForm = {
      title,
      description,
      due_date: dueDate,
      assigned_to: assignedTo,
      checklist
    };

    const validation = actividadFormSchema.safeParse(rawData);
    if (!validation.success) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: validation.error.issues[0].message });
      return;
    }

    try {
      // Usamos 'guardar' sin ID para que cree una nueva entrada
      await guardar.mutateAsync({ data: rawData });
      
      Swal.fire({
        icon: 'success',
        title: '¡Duplicada!',
        text: 'Se ha creado una nueva copia de la actividad',
        timer: 2000,
        showConfirmButton: false
      });
      onClose();
    } catch (error: any) {
      Swal.fire('Error', error.message, 'error');
    }
  };

  if (!isOpen) return null;

  const filteredUsuarios = usuarios.filter(u => u.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border dark:border-neutral-800">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b dark:border-neutral-800 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/20">
          <h2 className="text-xl font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
            <Copy size={20} /> Duplicar Actividad
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-neutral-700 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nuevo Título</label>
            <input 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-neutral-700 rounded-xl bg-gray-50 dark:bg-neutral-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex gap-2"><Calendar size={14}/> Nueva Fecha</label>
              <input 
                type="datetime-local"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-neutral-700 rounded-xl bg-gray-50 dark:bg-neutral-800 text-gray-800 dark:text-white outline-none color-scheme: dark;"
              />
            </div>

            <div className="relative">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex gap-2"><User size={14}/> Reasignar a</label>
              <input 
                type="text"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-neutral-700 rounded-xl bg-gray-50 dark:bg-neutral-800 text-gray-800 dark:text-white outline-none"
              />
              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                  {filteredUsuarios.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setAssignedTo(u.id); setSearchTerm(u.nombre); setShowDropdown(false); }}
                      className="w-full px-4 py-2 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm dark:text-gray-200 border-b last:border-0 dark:border-neutral-700"
                    >
                      {u.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex gap-2"><AlignLeft size={14}/> Notas Copiadas</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 dark:border-neutral-700 rounded-xl bg-gray-50 dark:bg-neutral-800 text-gray-800 dark:text-white outline-none resize-none"
            />
          </div>

          <div className="bg-indigo-50/30 dark:bg-neutral-800/50 p-4 rounded-xl border border-indigo-100 dark:border-neutral-700">
            <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase flex gap-2 mb-3"><CheckSquare size={14}/> Checklist (Se reiniciará)</label>
            <div className="flex gap-2 mb-3">
              <input 
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCheckItem())}
                placeholder="Añadir paso extra..."
                className="flex-1 px-3 py-2 rounded-lg border dark:bg-neutral-900 dark:border-neutral-700 dark:text-white text-sm outline-none focus:border-indigo-500"
              />
              <button type="button" onClick={handleAddCheckItem} className="bg-indigo-600 text-white p-2 rounded-lg"><Plus size={18}/></button>
            </div>
            <div className="space-y-2">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white dark:bg-neutral-900 p-2 rounded-lg border border-gray-100 dark:border-neutral-800 text-sm">
                  <span className="truncate flex-1 dark:text-gray-200">• {item.title}</span>
                  <button type="button" onClick={() => removeCheckItem(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-xl font-bold text-sm">Cancelar</button>
          <button 
            type="submit" 
            onClick={handleSubmit}
            disabled={guardar.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-70"
          >
            {guardar.isPending ? <Loader2 className="animate-spin" size={18}/> : <Copy size={18}/>}
            Crear Copia
          </button>
        </div>

      </div>
    </div>
  );
}