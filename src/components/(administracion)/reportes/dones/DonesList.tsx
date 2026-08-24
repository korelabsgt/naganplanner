'use client';

import { useState } from 'react';
import { Search, Sparkles, Calendar, Quote, MessageSquare, BookOpen, Printer, ChevronLeft, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { DonReporte } from './Lib/zod';
import { useReporteDones } from './Lib/hooks';
import VistaPreviaImpresion from './modals/VistaPreviaImpresion';

interface Props {
  initialData: DonReporte[];
}

export default function DonesList({ initialData }: Props) {
  const { data: dones } = useReporteDones(initialData);
  const [busqueda, setBusqueda] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const [vistaActual, setVistaActual] = useState<'reporte' | 'impresion'>('reporte');

  const filtrados = (dones ?? []).filter(d => {
    const matchText = d.nombre_persona.toLowerCase().includes(busqueda.toLowerCase()) ||
                      d.palabras.toLowerCase().includes(busqueda.toLowerCase());
                      
    let matchMonth = true;
    if (selectedMonth !== null && d.fecha) {
      const parts = d.fecha.split('T')[0].split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        matchMonth = (year === selectedYear && month === selectedMonth);
      }
    }
    
    return matchText && matchMonth;
  });

  const MESES_ABREV = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const MESES_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const textoPeriodo = selectedMonth !== null ? `${MESES_FULL[selectedMonth]} ${selectedYear}` : `Año ${selectedYear}`;

  const formatFecha = (iso: string | null) => {
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

  if (vistaActual === 'impresion') {
    return (
      <VistaPreviaImpresion 
        dones={filtrados} 
        mesFiltro={textoPeriodo} 
        onClose={() => setVistaActual('reporte')} 
      />
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Encabezado y Buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1a1a1a] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-[#3e3630]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#d6a738]/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-[#d6a738]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dones Espirituales</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Historial y registro de palabras</p>
          </div>
        </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setVistaActual('impresion')}
              className="flex items-center justify-center w-11 h-11 bg-[#F8AC32]/10 hover:bg-[#F8AC32]/20 text-[#F8AC32] rounded-xl transition-colors shrink-0 print:hidden"
              title="Previsualizar e Imprimir"
            >
              <Printer size={18} />
            </button>
            <div className="relative print:hidden shrink-0">
              <div 
                className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-neutral-700 rounded-xl cursor-pointer"
                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedYear(y => y - 1); }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-md transition-colors text-gray-500 dark:text-gray-400"
                >
                  <ChevronLeft size={16} />
                </button>
                
                <div className="flex items-center gap-2 font-bold text-sm text-gray-900 dark:text-gray-100 min-w-[100px] justify-center">
                  {selectedMonth !== null ? `${MESES_FULL[selectedMonth]} ${selectedYear}` : `Año ${selectedYear}`}
                  <ChevronDown size={14} className="text-gray-400" />
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedYear(y => y + 1); }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-md transition-colors text-gray-500 dark:text-gray-400"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Popover */}
              {isMonthPickerOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMonthPickerOpen(false)}></div>
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-[#1f1f22] border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-xl z-50 p-4 w-[260px] animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4 px-2">
                      <button 
                        onClick={() => setSelectedYear(y => y - 1)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md text-gray-400 hover:text-white transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="font-bold text-gray-900 dark:text-white">{selectedYear}</span>
                      <button 
                        onClick={() => setSelectedYear(y => y + 1)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md text-gray-400 hover:text-white transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {MESES_ABREV.map((mes, idx) => (
                        <button
                          key={mes}
                          onClick={() => {
                            setSelectedMonth(selectedMonth === idx ? null : idx);
                            setIsMonthPickerOpen(false);
                          }}
                          className={`py-2 text-sm font-medium rounded-xl transition-colors ${
                            selectedMonth === idx 
                              ? 'bg-[#2a3040] text-[#6090e0]' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
                          }`}
                        >
                          {mes}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="relative w-full sm:w-64 print:hidden">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o palabra..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-neutral-800/50 border border-transparent focus:border-[#d6a738]/30 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#d6a738]/20 transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

      {/* Tabla */}
      <div className="printable-area bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-sm border border-gray-100 dark:border-[#3e3630] overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8AC32] text-white border-b-0">
                <th className="py-4 px-6 text-xs font-bold text-white uppercase tracking-wider text-center whitespace-nowrap w-16">No.</th>
                <th className="py-4 px-6 text-xs font-bold text-white uppercase tracking-wider text-center whitespace-nowrap w-32"><div className="flex items-center justify-center gap-2"><Calendar size={14}/> Fecha</div></th>
                <th className="py-4 px-6 text-xs font-bold text-white uppercase tracking-wider text-center whitespace-nowrap w-48"><div className="flex items-center justify-center gap-2"><Quote size={14}/> Nombre</div></th>
                <th className="py-4 px-6 text-xs font-bold text-white uppercase tracking-wider text-center min-w-[200px] w-[35%]"><div className="flex items-center justify-center gap-2"><MessageSquare size={14}/> Palabras</div></th>
                <th className="py-4 px-6 text-xs font-bold text-white uppercase tracking-wider text-center min-w-[200px] w-[25%]"><div className="flex items-center justify-center gap-2"><BookOpen size={14}/> Citas</div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    No se encontraron registros de dones espirituales.
                  </td>
                </tr>
              ) : (
                filtrados.map((don, idx) => {
                  const palabrasNombre = don.nombre_persona ? don.nombre_persona.split(' ') : [];
                  const lineasNombre = [];
                  for (let i = 0; i < palabrasNombre.length; i += 2) {
                    lineasNombre.push(palabrasNombre.slice(i, i + 2).join(' '));
                  }

                  return (
                    <tr key={don.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/30 transition-colors group">
                      <td className="py-4 px-6 text-sm text-gray-400 font-medium align-middle text-center">
                        {idx + 1}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap align-middle text-center">
                        <div className="text-xs font-medium text-gray-900 dark:text-gray-200">{formatFecha(don.fecha)}</div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap align-middle text-center">
                        <div className="inline-flex flex-col items-center px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-gray-200 mx-auto">
                          {lineasNombre.map((linea, i) => (
                            <span key={i}>{linea}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-6 align-middle text-justify">
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 group-hover:line-clamp-none transition-all">
                          {don.palabras}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500 dark:text-gray-400 align-middle text-center">
                        {don.citas_biblicas || <span className="opacity-50 italic">Sin citas</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
