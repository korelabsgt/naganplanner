'use client';

import { useState } from 'react';
import { Settings, FileText, Calendar, Clock, Eye, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { ConfigProgramaServicio } from './lib/zod';
import { useReporteServicio } from './lib/hooks';
import ServicioItem from './ServicioItem';
import VistaConfigurarPrograma from './modals/VistaConfigurarPrograma';
import VistaPreviaImpresion from './modals/VistaPreviaImpresion';

interface Props {
  initialConfig: ConfigProgramaServicio[];
}

function formatearFechaLabel(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export default function ServicioList({ initialConfig }: Props) {
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('00');
  const [minuto, setMinuto] = useState('00');
  const [ampm, setAmpm] = useState('PM');
  const [fechaBuscada, setFechaBuscada] = useState<string | null>(null);
  const [vistaActual, setVistaActual] = useState<'reporte' | 'ajustes' | 'impresion'>('reporte');

  const { data: reporte, isLoading, isError } = useReporteServicio(fechaBuscada);

  const handleBuscar = () => {
    if (!fecha) return;
    try {
      let h = parseInt(hora, 10);
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      const hh = h.toString().padStart(2, '0');
      const iso = `${fecha}T${hh}:${minuto}:00`;
      const dateObj = new Date(iso);
      setFechaBuscada(dateObj.toISOString());
    } catch {
      // Fallback si falla el parseo
    }
  };

  const calcularTiempoTotal = () => {
    if (!reporte) return 0;
    return reporte.reduce((acc, item) => acc + item.tiempo_minutos, 0);
  };

  return (
    <>
      {vistaActual === 'reporte' && (
        <div className="w-full max-w-3xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">

          {/* Encabezado */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-[#F8AC32] flex items-center justify-center shadow-sm shadow-[#F8AC32]/30">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Programa general de servicio
                </h1>
              </div>
              <p className="text-sm text-gray-400 dark:text-gray-500 ml-10">
                Selecciona una fecha y hora para generar el programa del servicio
              </p>
            </div>
            <button
              onClick={() => setVistaActual('ajustes')}
              className="flex-shrink-0 flex items-center justify-center p-2.5 text-gray-500 dark:text-gray-400 hover:text-[#F8AC32] dark:hover:text-[#F8AC32]/80 hover:bg-[#F8AC32]/10 dark:hover:bg-[#F8AC32]/10 rounded-xl border border-gray-200 dark:border-neutral-700 hover:border-[#F8AC32]/30 dark:hover:border-[#F8AC32]/30 transition-all"
              title="Configurar estructura del programa"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Selector de fecha/hora */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-[#F8AC32]" />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Fecha y hora del servicio
              </h2>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-3">
              <div className="flex-1 flex flex-wrap sm:flex-nowrap gap-2">
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-950 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-[#F8AC32] transition-all"
                />
                <div className="flex items-center bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 focus-within:ring-2 focus-within:ring-[#F8AC32] transition-all shrink-0">
                  <input
                    type="text"
                    value={hora}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 2) val = val.slice(-2);
                      setHora(val);
                    }}
                    onBlur={() => {
                      let h = parseInt(hora || '0', 10);
                      if (h >= 12 && h < 24) {
                        setAmpm('PM');
                        if (h > 12) h -= 12;
                      } else if (h === 24 || h === 0) {
                        setAmpm('AM');
                        h = 12;
                      }
                      setHora(h.toString().padStart(2, '0'));
                    }}
                    className="w-8 bg-transparent text-sm font-medium text-gray-800 dark:text-gray-100 outline-none text-center"
                    placeholder="12"
                  />
                  <span className="text-gray-400 font-bold mx-1">:</span>
                  <input
                    type="text"
                    value={minuto}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 2) val = val.slice(-2);
                      setMinuto(val);
                    }}
                    onBlur={() => {
                      let m = parseInt(minuto || '0', 10);
                      if (m > 59) m = 59;
                      setMinuto(m.toString().padStart(2, '0'));
                    }}
                    className="w-8 bg-transparent text-sm font-medium text-gray-800 dark:text-gray-100 outline-none text-center"
                    placeholder="00"
                  />
                  <select
                    value={ampm}
                    onChange={(e) => setAmpm(e.target.value)}
                    className="bg-transparent text-sm font-bold text-[#F8AC32] outline-none appearance-none cursor-pointer py-2.5 pl-2 text-center"
                  >
                    <option value="AM" className="bg-white dark:bg-neutral-900 text-gray-900 dark:text-white">AM</option>
                    <option value="PM" className="bg-white dark:bg-neutral-900 text-gray-900 dark:text-white">PM</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleBuscar}
                disabled={!fecha || isLoading}
                className="relative shrink-0 flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold bg-[#F8AC32] hover:bg-[#E09827] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-sm shadow-[#F8AC32]/30 overflow-hidden group w-full sm:w-auto"
              >
                <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                {isLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Sparkles className="w-4 h-4" />
                }
                Generar
              </button>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-[#F8AC32]" />
              <span className="text-sm">Generando programa...</span>
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">No se pudo generar el reporte. Intenta de nuevo.</p>
            </div>
          )}

          {/* Resultado */}
          {!isLoading && reporte && (
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm overflow-hidden">

              {/* Header del reporte */}
              <div className="flex items-center justify-between gap-4 px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-950/30">
                {/* Izquierda: Título y Total */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#F8AC32] shrink-0" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Programa del servicio
                    </span>
                    {fechaBuscada && (
                      <span className="text-xs text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full hidden sm:inline">
                        {formatearFechaLabel(fechaBuscada)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-6 sm:ml-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Total: <strong>{calcularTiempoTotal()} min</strong></span>
                  </div>
                </div>

                {/* Derecha: Botón centrado */}
                <button
                  onClick={() => setVistaActual('impresion')}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#F8AC32] hover:bg-[#E09827] text-white rounded-lg transition-all shadow-sm shadow-[#F8AC32]/30"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver programa
                </button>
              </div>

              {/* Lista de puntos */}
              <div className="p-5 space-y-2">
                {reporte.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                    <p className="text-sm font-medium">No se encontraron actividades para esta fecha y hora</p>
                    <p className="text-xs mt-1 text-gray-300 dark:text-gray-600">
                      Verifica que las actividades estén registradas con exactamente esta fecha y hora.
                    </p>
                  </div>
                ) : (
                  reporte.map((item) => (
                    <ServicioItem key={item.numero} item={item} />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Estado vacío */}
          {!isLoading && !reporte && !fechaBuscada && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-[#F8AC32]/10 dark:bg-[#F8AC32]/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-[#F8AC32]/60 dark:text-[#E09827]" />
              </div>
              <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">
                Selecciona una fecha para comenzar
              </p>
              <p className="text-xs mt-1 text-gray-300 dark:text-gray-600">
                El programa se generará automáticamente al hacer clic en "Generar"
              </p>
            </div>
          )}
        </div>
      )}

      {vistaActual === 'ajustes' && (
        <VistaConfigurarPrograma
          onBack={() => setVistaActual('reporte')}
          initialConfig={initialConfig}
        />
      )}

      {vistaActual === 'impresion' && reporte && fechaBuscada && (
        <VistaPreviaImpresion
          reporte={reporte}
          fechaServicio={fechaBuscada}
          tiempoTotal={calcularTiempoTotal()}
          onClose={() => setVistaActual('reporte')}
        />
      )}
    </>
  );
}
