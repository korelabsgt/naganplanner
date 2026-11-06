'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, User, AlignLeft, CheckSquare, Save, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { useActividadMutations } from '@/components/(administracion)/actividades/lib/hooks';
import { ActividadForm, actividadFormSchema, Perfil, Actividad, ChecklistItem } from '@/components/(administracion)/actividades/lib/zod';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  usuarios: Perfil[];
  usuarioActualId: string;
  actividadEditar?: Actividad | null; // Si viene, activamos MODO EDICIÓN
  isJefe: boolean; // <-- Recibimos el rol para la seguridad visual
}

export default function NuevaActividad({ isOpen, onClose, usuarios, usuarioActualId, actividadEditar, isJefe }: Props) {
  const { guardar, eliminar } = useActividadMutations();
  
  const isEditing = !!actividadEditar;
  
  // LOGICA DE BLOQUEO GENERAL (Edición restringida por estado)
  const isRestrictedEdit = isEditing && !isJefe && (actividadEditar?.status === 'Completado' || actividadEditar?.status === 'Vencido');

  // LOGICA DE ASIGNACIÓN: Solo los jefes pueden cambiar el responsable.
  // Si no eres jefe, el input de "Asignado a" estará bloqueado siempre.
  const canAssignOthers = isJefe;

  // --- ESTADOS DEL FORMULARIO ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState(usuarioActualId);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  
  // UI Helpers
  const [newItemText, setNewItemText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // --- EFECTO: BLOQUEAR SCROLL DEL FONDO ---
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // --- EFECTO: CARGAR DATOS ---
  useEffect(() => {
    if (isOpen) {
      if (actividadEditar) {
        setTitle(actividadEditar.title);
        setDescription(actividadEditar.description || '');
        setAssignedTo(actividadEditar.assigned_to || usuarioActualId);
        setChecklist(actividadEditar.checklist || []);
        
        if (actividadEditar.due_date) {
          const d = new Date(actividadEditar.due_date);
          const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setDueDate(localISO);
        }

        const user = usuarios.find(u => u.id === actividadEditar.assigned_to);
        setSearchTerm(user?.nombre || '');
      } else {
        // Reset para Nueva Actividad
        setTitle('');
        setDescription('');
        setDueDate('');
        setAssignedTo(usuarioActualId);
        setChecklist([]);
        
        // LÓGICA IMPORTANTE: Si NO puede asignar a otros, pre-llenamos con su propio nombre visualmente
        if (!canAssignOthers) {
            const me = usuarios.find(u => u.id === usuarioActualId);
            setSearchTerm(me?.nombre || 'Yo');
        } else {
            setSearchTerm('');
        }
      }
    }
  }, [isOpen, actividadEditar, usuarios, usuarioActualId, canAssignOthers]); // Agregamos canAssignOthers a dependencias

  // --- MANEJADORES ---

  const handleAddCheckItem = () => {
    if (!newItemText.trim()) return;
    setChecklist([...checklist, { title: newItemText.trim(), is_completed: false }]);
    setNewItemText('');
  };

  const removeCheckItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const handleDeleteActividad = async () => {
    if (!actividadEditar) return;

    const result = await Swal.fire({
      title: '¿Eliminar actividad?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await eliminar.mutateAsync(actividadEditar.id);
        Swal.fire({ icon: 'success', title: 'Eliminada', timer: 1500, showConfirmButton: false });
        onClose();
      } catch (e: any) {
        Swal.fire('Error', e.message, 'error');
      }
    }
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
      Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: validation.error.issues[0].message });
      return;
    }

    try {
      await guardar.mutateAsync({ data: rawData, id: actividadEditar?.id });
      
      const Toast = Swal.mixin({
        toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
      });
      Toast.fire({ icon: 'success', title: isEditing ? 'Actividad actualizada' : 'Actividad creada' });
      
      onClose();
    } catch (error: any) {
      Swal.fire('Error', error.message, 'error');
    }
  };

  if (!isOpen) return null;

  const filteredUsuarios = usuarios.filter(u => u.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

  // Regla para botón eliminar
  const canDelete = isJefe || actividadEditar?.status === 'Asignado';

  // Regla para deshabilitar el input de asignación
  // Está deshabilitado si hay restricción de edición general O si el usuario no tiene permiso de asignar a otros
  const isAssignDisabled = isRestrictedEdit || !canAssignOthers;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b dark:border-neutral-800 flex justify-between items-center bg-gray-50 dark:bg-neutral-800/50">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            {isEditing ? <Save className="text-blue-500" size={20}/> : <Plus className="text-green-500" size={20}/>}
            {isEditing ? 'Editar Actividad' : 'Nueva Actividad'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* FORMULARIO */}
        <form 
          id="form-actividad"
          onSubmit={handleSubmit} 
          className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar"
        >
          
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Título</label>
            <input 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              disabled={isRestrictedEdit}
              className={`w-full px-4 py-3 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isRestrictedEdit ? 'bg-gray-100 dark:bg-neutral-800 opacity-60 cursor-not-allowed' : 'bg-gray-50 dark:bg-neutral-800'}`}
              placeholder="¿Qué hay que hacer?"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex gap-2"><Calendar size={14}/> Fecha Límite</label>
              <input 
                type="datetime-local"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                disabled={isRestrictedEdit}
                className={`w-full px-4 py-2.5 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-800 dark:text-white outline-none color-scheme: dark; ${isRestrictedEdit ? 'bg-gray-100 dark:bg-neutral-800 opacity-60 cursor-not-allowed' : 'bg-gray-50 dark:bg-neutral-800'}`}
              />
            </div>

            <div className="relative">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex gap-2"><User size={14}/> Asignado a</label>
              <input 
                type="text"
                value={searchTerm}
                // Si está deshabilitado, no permitimos cambiar el texto ni abrir el dropdown
                onChange={e => { 
                    if (!isAssignDisabled) {
                        setSearchTerm(e.target.value); 
                        setShowDropdown(true); 
                    }
                }}
                onFocus={() => { 
                    if (!isAssignDisabled) setShowDropdown(true); 
                }}
                disabled={isAssignDisabled} 
                placeholder="Buscar responsable..."
                className={`w-full px-4 py-2.5 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-800 dark:text-white outline-none ${isAssignDisabled ? 'bg-gray-100 dark:bg-neutral-800 opacity-60 cursor-not-allowed' : 'bg-gray-50 dark:bg-neutral-800'}`}
              />
              
              {/* Solo mostramos el dropdown si NO está deshabilitada la asignación */}
              {showDropdown && !isAssignDisabled && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                  {filteredUsuarios.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setAssignedTo(u.id); setSearchTerm(u.nombre); setShowDropdown(false); }}
                      className="w-full px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm dark:text-gray-200 border-b last:border-0 dark:border-neutral-700"
                    >
                      {u.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex gap-2"><AlignLeft size={14}/> Descripción</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 dark:border-neutral-700 rounded-xl bg-gray-50 dark:bg-neutral-800 text-gray-800 dark:text-white outline-none resize-none"
              placeholder="Detalles adicionales..."
            />
          </div>

          {/* CHECKLIST INICIAL */}
          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
            <label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase flex gap-2 mb-3"><CheckSquare size={14}/> Lista de Pendientes</label>
            <div className="flex gap-2 mb-3">
              <input 
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCheckItem())}
                placeholder="Añadir paso..."
                className="flex-1 px-3 py-2 rounded-lg border dark:bg-neutral-900 dark:border-neutral-700 dark:text-white text-sm outline-none focus:border-blue-500"
              />
              <button type="button" onClick={handleAddCheckItem} className="bg-blue-600 text-white p-2 rounded-lg"><Plus size={18}/></button>
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
        <div className="px-6 py-4 border-t dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800 flex justify-between gap-3">
          {isEditing && canDelete && (
            <button type="button" onClick={handleDeleteActividad} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold text-sm transition-colors">
              <Trash2 size={18}/> Eliminar
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button type="button" onClick={onClose} className="px-5 py-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-xl font-bold text-sm">Cancelar</button>
            
            <button 
              type="submit"
              form="form-actividad" 
              disabled={guardar.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-70"
            >
              {guardar.isPending ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
              {isEditing ? 'Guardar Cambios' : 'Crear Actividad'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}