'use client';

import { useState } from 'react';

import { AlabanzaConNivel, MesUso, NivelFrecuencia } from '../lib/zod';
import { useDetalleStat } from '../lib/hooks';
import { X, Music, TrendingUp, Calendar, User, Loader2, Flame, Activity, Clock, Archive } from 'lucide-react';

interface Props {
  alabanza: AlabanzaConNivel;
  onClose: () => void;
}

// Colores de la gráfica de barras por intensidad
function colorBarra(cantidad: number, max: number): string {
  if (cantidad === 0) return 'bg-gray-100 dark:bg-neutral-800';
  const ratio = cantidad / Math.max(max, 1);
  if (ratio <= 0.33) return 'bg-indigo-200 dark:bg-indigo-900/60';
  if (ratio <= 0.66) return 'bg-indigo-400 dark:bg-indigo-700';
  return 'bg-indigo-600 dark:bg-indigo-500';
}

// Badge del nivel de frecuencia
const nivelConfig: Record<NivelFrecuencia, { label: string; clases: string; icon: any }> = {
  frecuente: { label: 'Frecuente', clases: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300', icon: Flame },
  regular:   { label: 'Regular',   clases: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', icon: Activity },
  poco:      { label: 'Poco uso',  clases: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300', icon: Clock },
  nunca:     { label: 'Nunca',     clases: 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400', icon: Archive },
};

export default function ModalEstadisticas({ alabanza, onClose }: Props) {
  const { data: detalle, isLoading } = useDetalleStat(alabanza.id);
  const [vistaPeriodo, setVistaPeriodo] = useState<'meses' | 'semanas'>('meses');
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Años disponibles en el historial
  const aniosDisponibles = detalle ? Array.from(new Set(detalle.historial.map(h => new Date(h.fecha).getFullYear()))).sort((a, b) => b - a) : [new Date().getFullYear()];
  if (!aniosDisponibles.includes(new Date().getFullYear())) aniosDisponibles.unshift(new Date().getFullYear()); // Asegurar el año actual al inicio si no hay historial

  // Calcular meses dinámicamente para el año seleccionado
  const MESES_ABREV = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mesesAnio: MesUso[] = MESES_ABREV.map((label, i) => {
    const mesKey = `${anioSeleccionado}-${String(i + 1).padStart(2, '0')}`;
    const cantidad = detalle?.historial.filter(h => h.fecha.startsWith(mesKey)).length ?? 0;
    return { mes: mesKey, label, cantidad };
  });

  // Calcular las semanas dinámicamente para el mes/año seleccionado
  const semanasMes: MesUso[] = [];
  if (detalle) {
    const firstDay = new Date(anioSeleccionado, mesSeleccionado, 1);
    let dayOfWeek = firstDay.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7; // Domingo -> 7
    
    const startOfWeek = new Date(firstDay);
    startOfWeek.setDate(firstDay.getDate() - dayOfWeek + 1); // Empezar el primer lunes (puede ser del mes anterior)
    
    let i = 0;
    while (true) {
      const start = new Date(startOfWeek);
      start.setDate(startOfWeek.getDate() + (i * 7));
      
      // Si el lunes de esta semana ya pertenece al MES SIGUIENTE (o posterior), terminamos.
      // (Comprobamos start > firstDay para asegurarnos de no romper si el primer lunes cayó en el mes anterior)
      if (start.getMonth() !== mesSeleccionado && start > firstDay) {
        break;
      }
      
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      
      const cantidad = detalle.historial.filter(h => {
        const d = new Date(h.fecha);
        return d >= start && d <= end;
      }).length;

      const rango = `Lun ${start.getDate()} ${MESES_ABREV[start.getMonth()].toLowerCase()} - Dom ${end.getDate()} ${MESES_ABREV[end.getMonth()].toLowerCase()}`;
      
      semanasMes.push({
        mes: `sem-${i}`,
        label: `Sem ${i + 1}`,
        rango,
        cantidad
      });
      
      i++;
      if (i > 6) break; // Límite de seguridad (un mes calendario nunca abarca más de 6 semanas)
    }
  }

  const datosPeriodo = detalle ? (vistaPeriodo === 'meses' ? mesesAnio : semanasMes) : [];
  const maxCantidad = datosPeriodo.length > 0 ? Math.max(...datosPeriodo.map(m => m.cantidad), 1) : 1;
  const nivel = nivelConfig[alabanza.nivel];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full h-[100dvh] sm:h-auto sm:max-w-xl bg-white dark:bg-neutral-900 rounded-none sm:rounded-2xl shadow-2xl sm:border border-gray-100 dark:border-neutral-800 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 overflow-hidden flex flex-col">

        {/* Header del modal */}
        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
              <Music className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight truncate">
                {alabanza.nombre}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${nivel.clases}`}>
                  <nivel.icon className="w-3.5 h-3.5" />
                  {nivel.label}
                </span>
                {alabanza.tipo && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{alabanza.tipo}</span>
                )}
                {alabanza.tonalidad && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">· {alabanza.tonalidad}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 px-6 py-5 space-y-6 overflow-y-auto">

          {/* Métricas rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
            <div className="bg-gray-50 dark:bg-neutral-950/50 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total cantada</span>
              </div>
              <div className="flex items-baseline gap-1 text-indigo-600 dark:text-indigo-400">
                <span className="text-xl font-black">{alabanza.veces_cantada}</span>
                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {alabanza.veces_cantada === 1 ? 'vez' : 'veces'}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-neutral-950/50 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Última vez</span>
              </div>
              <div className="text-right">
                {alabanza.ultima_vez ? (
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {new Date(alabanza.ultima_vez).toLocaleDateString('es-ES', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Nunca</p>
                )}
              </div>
            </div>
          </div>

          {/* Estado de carga */}
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              <span className="text-sm">Cargando estadísticas...</span>
            </div>
          )}

          {/* Gráfica de barras — Tailwind puro */}
          {detalle && (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Uso por {vistaPeriodo === 'meses' ? 'mes' : 'semana'}
                    </h3>
                    
                    <select
                      value={anioSeleccionado}
                      onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
                      className="bg-gray-100 dark:bg-neutral-800 border-none text-xs font-semibold text-gray-600 dark:text-gray-300 rounded-md py-1 pl-2 pr-7 cursor-pointer focus:ring-0 focus:outline-none appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.25rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.25em 1.25em'
                      }}
                    >
                      {Array.from(new Set(aniosDisponibles)).map(anio => (
                        <option key={anio} value={anio}>{anio}</option>
                      ))}
                    </select>

                    {vistaPeriodo === 'semanas' && (
                      <select
                        value={mesSeleccionado}
                        onChange={(e) => setMesSeleccionado(Number(e.target.value))}
                        className="bg-gray-100 dark:bg-neutral-800 border-none text-xs font-semibold text-gray-600 dark:text-gray-300 rounded-md py-1 pl-2 pr-7 cursor-pointer focus:ring-0 focus:outline-none appearance-none"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.25rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1.25em 1.25em'
                        }}
                      >
                        {MESES_ABREV.map((mes, i) => (
                          <option key={i} value={i}>{mes}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  {/* Toggle */}
                  <div className="flex bg-gray-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-gray-200/50 dark:border-neutral-700/50 text-xs">
                    <button
                      onClick={() => setVistaPeriodo('meses')}
                      className={`px-2 py-1 rounded-md transition-all font-medium ${vistaPeriodo === 'meses' ? 'bg-white dark:bg-neutral-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                      Meses
                    </button>
                    <button
                      onClick={() => setVistaPeriodo('semanas')}
                      className={`px-2 py-1 rounded-md transition-all font-medium ${vistaPeriodo === 'semanas' ? 'bg-white dark:bg-neutral-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                      Semanas
                    </button>
                  </div>
                </div>

                {/* Contenedor Principal de la Gráfica */}
                <div className="flex mt-8 mb-4">
                  {/* Eje Y (Cantidades) */}
                  <div className="flex flex-col justify-between items-end pr-3 border-r border-gray-200 dark:border-neutral-800 text-[10px] text-gray-400 h-24">
                    <span>{maxCantidad}</span>
                    <span>{Math.floor(maxCantidad / 2)}</span>
                    <span>0</span>
                  </div>

                  {/* Barras */}
                  <div className="flex-1 flex items-end gap-1.5 h-24 pl-3">
                    {datosPeriodo.map((item: MesUso) => (
                      <div 
                        key={item.mes} 
                        className="flex-1 h-full flex flex-col items-center gap-1 group relative cursor-pointer sm:cursor-default"
                        onClick={() => setActiveTooltip(activeTooltip === item.mes ? null : item.mes)}
                      >
                        {/* Tooltip con Typewriter */}
                        {item.cantidad > 0 && (
                          <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none transition-opacity duration-200 z-10 flex flex-col items-center ${activeTooltip === item.mes ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100'}`}>
                            <div className="bg-gray-900 dark:bg-neutral-800 text-gray-100 text-[10px] font-bold py-1 px-2 rounded shadow-xl border border-gray-800 dark:border-neutral-700">
                              <div className={`whitespace-nowrap overflow-hidden transition-[max-width] duration-1000 ease-out ${activeTooltip === item.mes ? 'max-w-[300px]' : 'max-w-0 sm:group-hover:max-w-[300px]'}`}>
                                {vistaPeriodo === 'meses' ? `Mes: ${item.label} — ` : `Semana: ${item.rango ?? item.label} — `}
                                {item.cantidad} {item.cantidad === 1 ? 'vez' : 'veces'}
                              </div>
                            </div>
                            {/* Flecha */}
                            <div className="w-1.5 h-1.5 bg-gray-900 dark:bg-neutral-800 border-b border-r border-gray-800 dark:border-neutral-700 rotate-45 -mt-1" />
                          </div>
                        )}
                        {/* Barra */}
                        <div className="w-full relative flex-1 flex items-end">
                          <div
                            className={`w-full absolute bottom-0 rounded-t-md transition-all duration-500 ${colorBarra(item.cantidad, maxCantidad)}`}
                            style={{
                              height: item.cantidad === 0
                                ? '4px'
                                : `${Math.max((item.cantidad / maxCantidad) * 100, 12)}%`
                            }}
                          />
                        </div>
                        {/* Etiqueta X (Mes/Semana) */}
                        <div className="w-full h-4 relative">
                          <div className="absolute top-0 w-full h-[1px] bg-gray-200 dark:bg-neutral-800" />
                          <p className="text-[9px] sm:text-[10px] font-semibold text-gray-400 dark:text-gray-500 pt-1 text-center truncate">
                            {item.label}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tabla de historial */}
              {detalle.historial.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Historial de uso
                  </h3>
                  <div className="rounded-xl border border-gray-100 dark:border-neutral-800 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-neutral-950/60">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Fecha
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Director
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {detalle.historial.map((h, i) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-neutral-800/40 transition-colors">
                            <td className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
                              {h.fecha_label}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                              {h.director_nombre ? (
                                <div className="flex items-center gap-1.5">
                                  <User className="w-3 h-3 text-indigo-400 shrink-0" />
                                  {h.director_nombre}
                                </div>
                              ) : (
                                <span className="italic text-gray-300 dark:text-gray-600">Sin director</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sin historial */}
              {detalle.historial.length === 0 && (
                <div className="text-center py-6 text-gray-400">
                  <Music className="w-8 h-8 mx-auto mb-2 text-gray-200 dark:text-gray-700" />
                  <p className="text-sm">Este canto aún no se ha cantado</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
