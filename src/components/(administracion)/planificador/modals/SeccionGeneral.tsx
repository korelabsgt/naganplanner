'use client';

import { useMemo } from 'react';
import { Calendar, AlignLeft, Clock, Lock, Info } from 'lucide-react';

interface Props {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  disabled: boolean;
  isMultiService?: boolean;
  onToggleMultiService?: (active: boolean) => void;
  canDisableMultiService?: boolean;
  showMultiServiceSwitch?: boolean;
  isSubsequentService?: boolean;
  sharedDate?: string;
  isEditing?: boolean;
}

export function SeccionGeneral({
  title,
  setTitle,
  description,
  setDescription,
  dueDate,
  setDueDate,
  disabled,
  isMultiService = false,
  onToggleMultiService,
  canDisableMultiService = true,
  showMultiServiceSwitch = false,
  isSubsequentService = false,
  sharedDate = '',
  isEditing = false,
}: Props) {
  // Fecha base limpia en formato YYYY-MM-DD
  const cleanSharedDate = useMemo(() => {
    if (!sharedDate) return '';
    return sharedDate.split('T')[0];
  }, [sharedDate]);

  // Formato legible para la fecha compartida (ej. "dom, 18 oct 2026")
  const sharedDateFormatted = useMemo(() => {
    if (!cleanSharedDate) return '';
    const parts = cleanSharedDate.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(y, m, d);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString('es-ES', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
    }
    return cleanSharedDate;
  }, [cleanSharedDate]);

  // Extraer la hora actual del dueDate (HH:mm)
  const timePart = useMemo(() => {
    if (!dueDate) return '';
    if (dueDate.includes('T')) {
      const time = dueDate.split('T')[1];
      return time ? time.slice(0, 5) : '';
    }
    return '';
  }, [dueDate]);

  // Manejador de cambio de hora para servicios posteriores
  const handleTimeChange = (newTime: string) => {
    const baseDate = cleanSharedDate || (dueDate.includes('T') ? dueDate.split('T')[0] : '');
    if (!baseDate) {
      setDueDate(newTime ? `T${newTime}` : '');
      return;
    }
    setDueDate(newTime ? `${baseDate}T${newTime}` : `${baseDate}T`);
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
            {isMultiService ? 'Nombre de este Servicio' : 'Nombre del Evento'}
          </label>

          {/* Switch toggle discreto en móvil */}
          {showMultiServiceSwitch && onToggleMultiService && (
            <div className="sm:hidden flex items-center gap-2">
              <span className="text-[11px] font-medium text-gray-500 dark:text-neutral-400 select-none">
                Múltiples servicios
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isMultiService}
                  disabled={disabled || (isMultiService && !canDisableMultiService)}
                  onChange={(e) => {
                    if (isMultiService && !canDisableMultiService) return;
                    onToggleMultiService(e.target.checked);
                  }}
                />
                <div
                  className={`w-8 h-4.5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-neutral-600 peer-checked:bg-emerald-500 dark:peer-checked:bg-emerald-500 ${
                    isMultiService && !canDisableMultiService ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                />
              </label>
            </div>
          )}
        </div>
        <input 
          value={title} 
          onChange={e => setTitle(e.target.value)}
          disabled={disabled}
          className={`w-full px-4 py-3.5 bg-gray-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-800 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          placeholder={isMultiService ? "Ej. 1er Culto de la Noche..." : "Ej. Concierto de Primavera..."}
          autoFocus={!disabled}
        />
      </div>

      {isSubsequentService ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Fecha fijada automáticamente por el Servicio 1 */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-blue-500" /> Fecha del Servicio
              </span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/60 flex items-center gap-1">
                <Lock size={10} /> Servicio 1
              </span>
            </label>
            <div className="w-full px-4 py-3 bg-gray-100/80 dark:bg-neutral-900/80 border border-gray-200 dark:border-neutral-800 rounded-2xl text-gray-700 dark:text-gray-300 font-medium flex items-center select-none">
              <span className="capitalize text-sm font-semibold text-gray-800 dark:text-gray-200">
                {sharedDateFormatted || 'Sin fecha en Servicio 1'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-neutral-500 mt-1.5 flex items-center gap-1">
              <Info size={12} className="text-blue-500 shrink-0" />
              {isEditing
                ? 'Fecha fija del 1er servicio (bloqueada para este servicio).'
                : 'Fecha compartida para todos los servicios de la jornada.'}
            </p>
          </div>

          {/* Hora editable para este servicio */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1.5">
              <Clock size={14} className="text-blue-500" /> Hora del Servicio
            </label>
            <input 
              type="time"
              value={timePart}
              onChange={e => handleTimeChange(e.target.value)}
              disabled={disabled || !cleanSharedDate}
              className={`w-full px-4 py-3 bg-gray-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-800 rounded-2xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-base transition-all ${
                disabled || !cleanSharedDate ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
            {!cleanSharedDate ? (
              <p className="text-[11px] text-amber-500 mt-1.5 flex items-center gap-1">
                <Info size={12} /> Asigna primero la fecha en la pestaña de Servicio 1.
              </p>
            ) : (
              <p className="text-[11px] text-gray-400 dark:text-neutral-500 mt-1.5">
                {isEditing ? 'Solo puedes modificar la hora de este servicio.' : 'Modifica solo la hora para este servicio.'}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase mb-2 flex gap-2">
              <Calendar size={14}/> Fecha y Hora
            </label>
            <input 
              type="datetime-local"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              disabled={disabled}
              className={`w-full px-4 py-3 bg-gray-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-800 rounded-2xl text-gray-900 dark:text-white outline-none color-scheme: dark; ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-gray-400 uppercase mb-2 flex gap-2">
          <AlignLeft size={14}/> Descripción (Opcional)
        </label>
        <textarea 
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-800 rounded-2xl text-gray-900 dark:text-white outline-none resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          placeholder="Detalles del repertorio o logística..."
        />
      </div>
    </div>
  );
}