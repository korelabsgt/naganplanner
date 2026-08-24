'use client';

import React, { useState } from 'react';
import { ArrowLeft, Printer, Download, Loader2 } from 'lucide-react';
import { DonReporte } from '../Lib/zod';

interface Props {
  dones: DonReporte[];
  mesFiltro: string;
  onClose: () => void;
}

const formatFechaPdf = (iso: string | null) => {
  if (!iso) return 'Sin fecha';
  try {
    const parts = iso.split('T')[0].split('-');
    if (parts.length !== 3) return iso;
    const [year, month, day] = parts;
    const fechaObj = new Date(Number(year), Number(month) - 1, Number(day));
    if (isNaN(fechaObj.getTime())) return iso;

    const wd = fechaObj.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
    const wdCap = wd.charAt(0).toUpperCase() + wd.slice(1);
    const dd = String(fechaObj.getDate()).padStart(2, '0');
    const mm = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const yy = String(fechaObj.getFullYear()).slice(-2);

    return `${wdCap} ${dd}/${mm}/${yy}`;
  } catch {
    return iso;
  }
};

export default function VistaPreviaImpresion({ dones, mesFiltro, onClose }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleImprimir = () => {
    window.print();
  };

  const handleDescargar = async () => {
    setIsDownloading(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { saveAs } = await import('file-saver');
      const ReporteDonesPDF = (await import('../pdf/ReporteDonesPDF')).default;

      const blob = await pdf(
        <ReporteDonesPDF
          dones={dones}
          mesFiltro={mesFiltro}
        />
      ).toBlob();

      const filename = `dones_espirituales_${mesFiltro.replace(' ', '_').toLowerCase()}.pdf`;
      saveAs(blob, filename);
    } catch (error) {
      console.error("Error al generar el PDF:", error);
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
          table { width: 100% !important; min-width: 100% !important; }
        }
      `}</style>

      <div id="print-root" className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto bg-gray-100 dark:bg-neutral-900 flex flex-col items-center min-h-screen">

        {/* Controles superiores */}
        <div id="print-overlay-controls" className="w-full max-w-[816px] flex justify-between items-center mb-6 print:hidden">
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
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-neutral-700 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors shadow-sm text-sm font-medium"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">{isDownloading ? 'Generando...' : 'Descargar PDF'}</span>
            </button>
            <button
              onClick={handleImprimir}
              className="flex items-center gap-2 px-5 py-2 bg-[#F8AC32] text-white rounded-xl hover:bg-[#E09827] transition-all shadow-sm shadow-[#F8AC32]/20 font-medium text-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Hoja de papel visual (A4) */}
        <div
          id="print-sheet"
          className="bg-white w-full max-w-[816px] min-h-[1056px] shadow-xl rounded-xl p-8 sm:p-12 text-black mx-auto overflow-hidden relative"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {/* Header */}
          <div className="flex flex-row items-start justify-between gap-4 border-b-2 border-[#F8AC32] pb-5 mb-6">
            <div>
              <div className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-1">
                Sistema de Gestión Ministerial Modular
              </div>
              <h1 className="text-2xl font-bold text-[#E09827] uppercase tracking-wide">
                Reporte de Dones Espirituales
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 mt-2 text-gray-500">
                <span className="text-sm capitalize">Periodo: {mesFiltro}</span>
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

          {/* Tabla de contenido */}
          <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full table-fixed text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#F8AC32] text-white">
                  <th className="py-2 px-3 text-[10px] font-bold text-white uppercase tracking-wider text-center w-[5%]">No.</th>
                  <th className="py-2 px-3 text-[10px] font-bold text-white uppercase tracking-wider text-center w-[12%]">Fecha</th>
                  <th className="py-2 px-3 text-[10px] font-bold text-white uppercase tracking-wider text-center w-[28%]">Nombre</th>
                  <th className="py-2 px-3 text-[10px] font-bold text-white uppercase tracking-wider text-center w-[40%]">Palabras</th>
                  <th className="py-2 px-3 text-[10px] font-bold text-white uppercase tracking-wider text-center w-[15%]">Citas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {dones.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No hay registros para este periodo.
                    </td>
                  </tr>
                ) : (
                  dones.map((don, idx) => {
                    // Helper para 2 palabras por línea
                    const palabrasNombre = don.nombre_persona ? don.nombre_persona.split(' ') : [];
                    const lineasNombre = [];
                    for (let i = 0; i < palabrasNombre.length; i += 2) {
                      lineasNombre.push(palabrasNombre.slice(i, i + 2).join(' '));
                    }

                    return (
                      <tr key={don.id}>
                        <td className="py-3 px-3 text-gray-500 align-middle text-center">{idx + 1}</td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap text-xs text-center">{formatFechaPdf(don.fecha)}</td>
                        <td className="py-3 px-3 font-semibold text-gray-900 align-middle text-center">
                        {lineasNombre.map((linea, i) => (
                          <React.Fragment key={i}>
                            {linea}
                            {i < lineasNombre.length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </td>
                      <td className="py-3 px-3 text-gray-700 align-middle leading-relaxed whitespace-pre-wrap text-justify">{don.palabras}</td>
                      <td className="py-3 px-3 text-gray-500 align-middle text-xs text-center">{don.citas_biblicas || <span className="italic opacity-50">Sin citas</span>}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>

          {/* Footer de página (opcional, para cuando se imprime físicamente) */}
          <div className="absolute bottom-8 left-12 right-12 text-center text-[10px] text-gray-400 border-t border-gray-100 pt-4">
            Generado por Nagan Planner
          </div>
        </div>
      </div>
    </>
  );
}
