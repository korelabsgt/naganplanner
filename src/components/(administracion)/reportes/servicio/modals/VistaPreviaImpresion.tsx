'use client';

import { useState } from 'react';
import { ArrowLeft, Printer, Calendar, Download, Loader2 } from 'lucide-react';
import { ReporteItem } from '../lib/zod';
import { useAjustesGlobales } from '../lib/hooks';

interface Props {
  reporte: ReporteItem[];
  fechaServicio: string;
  tiempoTotal: number;
  onClose: () => void;
}

function formatearFechaCompleta(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

function formatearHora(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
            .toUpperCase()
            .replace(/\./g, '')
            .replace(/ P M/g, ' PM')
            .replace(/ A M/g, ' AM')
            .trim();
  } catch {
    return '';
  }
}

function FilaItem({ item, nivel = 0 }: { item: ReporteItem; nivel?: number }) {
  const esAgrupador = item.tipo === 'agrupador';
  const tieneHijos = item.hijos && item.hijos.length > 0;

  return (
    <>
      <tr
        className={`
          ${esAgrupador
            ? 'bg-[#F8AC32]/10'
            : nivel > 0
              ? 'bg-gray-50'
              : 'bg-white'
          }
          border-b border-gray-200
        `}
      >
        {/* N° */}
        <td className="px-4 py-3 text-center w-12 align-middle">
          <span
            className={`
              inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-bold
              ${esAgrupador
                ? 'bg-[#F8AC32] text-white'
                : nivel > 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-100 text-blue-700'
              }
            `}
          >
            {item.numero}
          </span>
        </td>

        {/* Punto del programa */}
        <td className="px-4 py-3 align-middle" style={{ paddingLeft: nivel > 0 ? `${1 + nivel * 1.5}rem` : undefined }}>
          <span
            className={`
              text-xs font-semibold
              ${esAgrupador
                ? 'text-[#E09827]'
                : 'text-gray-900'
              }
            `}
          >
            {item.nombre}
          </span>
        </td>

        {/* Responsable(s) */}
        <td className="px-4 py-3 align-middle">
          {!esAgrupador && (
            item.integrantes.length > 0 ? (
              <div className="flex flex-col gap-1 items-start">
                {item.integrantes.map((p, i) => (
                  <span
                    key={i}
                    className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full whitespace-nowrap"
                  >
                    {p.nombre}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-gray-400 italic">Sin asignar</span>
            )
          )}
        </td>

        {/* Hora */}
        <td className="px-4 py-3 align-middle text-center w-28">
          {!esAgrupador && item.hora_inicio && item.tiempo_minutos > 0 ? (
            <span className="text-[11px] font-medium text-gray-700 tabular-nums">
              {item.hora_inicio}
            </span>
          ) : (
            <span className="text-[11px] text-gray-300">-</span>
          )}
        </td>

        {/* Duración */}
        <td className="px-4 py-3 align-middle text-center w-28">
          {item.tiempo_minutos > 0 ? (
            <span
              className={`
                inline-block whitespace-nowrap text-[11px] font-bold px-2 py-1 rounded-full
                ${esAgrupador
                  ? 'bg-[#F8AC32]/20 text-[#E09827]'
                  : 'bg-gray-100 text-gray-600'
                }
              `}
            >
              {item.tiempo_minutos} min
            </span>
          ) : (
            <span className="text-[11px] text-gray-300">-</span>
          )}
        </td>
      </tr>

      {/* Sub-filas */}
      {tieneHijos && item.hijos!.map((hijo) => (
        <FilaItem key={hijo.numero} item={hijo} nivel={nivel + 1} />
      ))}
    </>
  );
}

export default function VistaPreviaImpresion({ reporte, fechaServicio, tiempoTotal, onClose }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { data: ajustes } = useAjustesGlobales();
  
  const dateObj = new Date(fechaServicio);
  const fechaFormateada = dateObj.toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const horaServicio = reporte.length > 0 && reporte[0].hora_inicio 
    ? reporte[0].hora_inicio 
    : dateObj.toLocaleTimeString('es-ES', {
        hour: '2-digit', minute: '2-digit', hour12: true
      }).toUpperCase().replace(/\./g, '').replace(/ P M/g, ' PM').replace(/ A M/g, ' AM').trim();

  const handleImprimir = () => {
    window.print();
  };

  const handleDescargar = async () => {
    setIsDownloading(true);
    try {
      // Importamos dinámicamente para no engordar el bundle inicial de la página
      const { pdf } = await import('@react-pdf/renderer');
      const { saveAs } = await import('file-saver');
      const ReporteServicioPDF = (await import('../pdf/ReporteServicioPDF')).default;
      
      const blob = await pdf(
        <ReporteServicioPDF 
          reporte={reporte}
          fechaFormateada={fechaFormateada}
          horaServicio={horaServicio}
          tiempoTotal={tiempoTotal}
          nombreIglesia={ajustes?.nombre_iglesia}
        />
      ).toBlob();
      
      const filename = `programa_servicio_${fechaServicio.split('T')[0]}.pdf`;
      saveAs(blob, filename);
    } catch (error) {
      console.error("Error al generar el PDF:", error);
      // Fallback a impresión nativa si falla
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body { 
            visibility: hidden; 
            background: white !important;
          }
          #print-root {
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          #print-overlay-controls { display: none !important; }
          #print-sheet {
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
            width: 100% !important;
            min-height: 0 !important;
          }
          /* Ajustar tabla para impresión */
          table { width: 100% !important; min-width: 100% !important; }
          .overflow-x-auto { overflow: visible !important; }
        }
      `}</style>

      <div id="print-root" className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto bg-gray-100 dark:bg-neutral-900 flex flex-col items-center">
        
        {/* Controles superiores */}
        <div className="w-full max-w-[816px] flex justify-between items-center mb-6 print:hidden">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium hidden sm:inline">Volver</span>
          </button>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={handleDescargar}
              disabled={isDownloading}
              className="relative flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden w-[140px] sm:w-[170px]"
              title="Guardar como PDF"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Generando...</span>
                  <span className="sm:hidden">Generando...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Descargar PDF</span>
                  <span className="sm:hidden">Descargar</span>
                </>
              )}
            </button>
            <button
              onClick={handleImprimir}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-[#F8AC32] hover:bg-[#E09827] text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>

        {/* Wrapper scrollable para móvil */}
        <div className="w-full overflow-x-auto pb-8">
          {/* Hoja carta simulada con ancho fijo */}
          <div
            id="print-sheet"
            className="w-[816px] shrink-0 min-h-[1056px] mx-auto bg-white text-gray-900 shadow-2xl rounded-lg p-8 sm:p-12"
          >
            {/* Encabezado del documento */}
            <div className="border-b-2 border-[#F8AC32] pb-5 mb-6">
              <div className="flex flex-row items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-1">
                    Sistema de Gestión Ministerial Modular
                  </div>
                  <h1 className="text-2xl font-bold text-[#E09827] uppercase tracking-wide">
                    Programa General de Servicio
                  </h1>
                <div className="flex flex-wrap items-center gap-1.5 mt-2 text-gray-500">
                  <span className="text-sm capitalize">{fechaFormateada}</span>
                  {horaServicio && (
                    <>
                      <span className="text-gray-300 inline">•</span>
                      <span className="text-sm text-[#F8AC32] font-bold">
                        {horaServicio}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <img src="/icon.png" alt="Nagan Planner Logo" className="h-10 w-auto object-contain bg-gray-900 rounded-full" />
                <div className="text-2xl font-black tracking-tight flex items-center leading-none select-none">
                  <span className="text-[#F8AC32]">Nagan</span>
                  <span className="ml-1 font-bold text-gray-900">Planner</span>
                </div>
              </div>
            </div>
          </div>

          {/* Nombre de la iglesia centrado */}
          {ajustes?.nombre_iglesia && (
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold text-gray-800 uppercase tracking-widest">
                {ajustes.nombre_iglesia}
              </h2>
            </div>
          )}

          {/* Tabla del programa */}
          <div className="overflow-visible">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#F8AC32] text-white">
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider w-12">N°</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider">Punto del Programa</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider">Responsable(s)</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider w-28">Hora</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider w-28">Duración</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.map((item) => (
                      <FilaItem key={item.numero} item={item} nivel={0} />
                    ))}
                  </tbody>
                  {/* Fila de totales */}
                  <tfoot>
                    <tr className="bg-[#F8AC32]/10 border-t-2 border-[#F8AC32]/30">
                      <td colSpan={4} className="px-4 py-3 text-right text-xs font-bold text-[#E09827]">
                        TIEMPO TOTAL DEL SERVICIO
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block whitespace-nowrap text-xs font-bold text-[#E09827] bg-[#F8AC32]/20 px-3 py-1 rounded-full print:bg-gray-100 print:text-gray-700">
                          {tiempoTotal} min
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Pie de página */}
          <div className="mt-8 pt-4 border-t border-gray-200 flex justify-between items-center">
            <span className="text-xs text-gray-400">Generado por Nagán Planner</span>
            <span className="text-xs text-gray-400">
              {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}
