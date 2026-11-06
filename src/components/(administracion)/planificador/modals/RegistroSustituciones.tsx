'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, ClipboardList, Search, ArrowLeft, Loader2, Calendar } from 'lucide-react';
import { useRegistroSustituciones } from '@/components/(administracion)/planificador/lib/hooks';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function RegistroSustituciones({ isOpen, onClose }: Props) {
  const { data: registros, isLoading } = useRegistroSustituciones();
  const [busqueda, setBusqueda] = useState('');
  const [mesSeleccionado, setMesSeleccionado] = useState<number | ''>('');
  const [anioSeleccionado, setAnioSeleccionado] = useState<number | ''>('');
  const [semanaSeleccionada, setSemanaSeleccionada] = useState<number | ''>('');

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const aniosDisponibles = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i);

  const anioActual = new Date().getFullYear();
  const mesActual = new Date().getMonth();

  const semanasDelMes = useMemo(() => {
    const mes = mesSeleccionado === '' ? mesActual : mesSeleccionado;
    const anio = anioSeleccionado === '' ? anioActual : anioSeleccionado;

    const semanas = [];
    let fechaActual = new Date(anio, mes, 1);
    const ultimoDiaMes = new Date(anio, mes + 1, 0);

    const mesesNombres = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    let index = 0;
    while (fechaActual <= ultimoDiaMes) {
      const inicioSemana = new Date(fechaActual);
      const diaSemana = inicioSemana.getDay();

      const domingo = new Date(inicioSemana);
      domingo.setDate(domingo.getDate() - diaSemana);

      const sabado = new Date(domingo);
      sabado.setDate(sabado.getDate() + 6);

      semanas.push({
        id: index,
        inicio: new Date(domingo.setHours(0, 0, 0, 0)),
        fin: new Date(sabado.setHours(23, 59, 59, 999)),
        label: `DO ${domingo.getDate()} ${mesesNombres[domingo.getMonth()]} - SA ${sabado.getDate()}`
      });

      fechaActual.setDate(fechaActual.getDate() + (7 - diaSemana));
      index++;
    }
    return semanas;
  }, [mesSeleccionado, anioSeleccionado, mesActual, anioActual]);

  // BLOQUEO DE SCROLL
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  const registrosFiltrados = useMemo(() => {
    if (!registros) return [];

    let resultado = registros;

    if (mesSeleccionado !== '' || anioSeleccionado !== '' || semanaSeleccionada !== '') {
      resultado = resultado.filter((r: any) => {
        const d = new Date(r.created_at);
        const coincideMes = mesSeleccionado === '' || d.getMonth() === mesSeleccionado;
        const coincideAnio = anioSeleccionado === '' || d.getFullYear() === anioSeleccionado;

        let coincideSemana = true;
        if (semanaSeleccionada !== '') {
          const sem = semanasDelMes.find(s => s.id === semanaSeleccionada);
          if (sem) {
            coincideSemana = d >= sem.inicio && d <= sem.fin;
          } else {
            coincideSemana = false;
          }
        }

        return coincideMes && coincideAnio && coincideSemana;
      });
    }

    if (busqueda) {
      const term = busqueda.toLowerCase();
      resultado = resultado.filter((r: any) =>
        r.actividad_titulo.toLowerCase().includes(term) ||
        r.saliente.nombre.toLowerCase().includes(term) ||
        r.entrante.nombre.toLowerCase().includes(term) ||
        (r.justificacion && r.justificacion.toLowerCase().includes(term))
      );
    }

    return resultado;
  }, [registros, busqueda, mesSeleccionado, anioSeleccionado, semanaSeleccionada, semanasDelMes]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-1.5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1a1a1a] w-[99vw] max-w-[99vw] rounded-3xl shadow-2xl flex flex-col h-[95vh] max-h-[96vh] overflow-hidden border border-gray-100 dark:border-neutral-800">

        {/* HEADER */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-neutral-800 flex flex-col sm:flex-row justify-between sm:items-center bg-white dark:bg-[#1a1a1a] shrink-0 relative gap-3 sm:gap-0">
          <div className="flex flex-col gap-1 w-full sm:pr-0">
            <div className="flex flex-col sm:flex-row xl:items-center gap-3 w-full">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 whitespace-nowrap">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                  <ClipboardList size={18} />
                </div>
                Registro de Sustituciones
              </h2>

              <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 sm:ml-auto w-full sm:w-auto mt-2 sm:mt-0">
                <div className="flex flex-wrap sm:flex-nowrap justify-center sm:justify-start items-center gap-2 w-full sm:w-auto">
                  <select
                    value={mesSeleccionado}
                    onChange={(e) => {
                      setMesSeleccionado(e.target.value ? Number(e.target.value) : '');
                      setSemanaSeleccionada('');
                    }}
                    className="flex-1 sm:flex-none h-10 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 dark:text-gray-200 px-3 cursor-pointer appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem top 50%', backgroundSize: '0.65rem auto', paddingRight: '2rem' }}
                  >
                    <option value="">Mes</option>
                    {meses.map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={anioSeleccionado}
                    onChange={(e) => {
                      setAnioSeleccionado(e.target.value ? Number(e.target.value) : '');
                      setSemanaSeleccionada('');
                    }}
                    className="flex-1 sm:flex-none h-10 w-24 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 dark:text-gray-200 px-3 cursor-pointer appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem top 50%', backgroundSize: '0.65rem auto', paddingRight: '2rem' }}
                  >
                    <option value="">Año</option>
                    {aniosDisponibles.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>

                  <select
                    value={semanaSeleccionada}
                    onChange={(e) => setSemanaSeleccionada(e.target.value ? Number(e.target.value) : '')}
                    className="flex-1 sm:flex-none h-10 w-[180px] bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 dark:text-gray-200 px-3 cursor-pointer appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem top 50%', backgroundSize: '0.65rem auto', paddingRight: '2rem' }}
                  >
                    <option value="">Semana</option>
                    {semanasDelMes.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>

                  {(mesSeleccionado !== '' || anioSeleccionado !== '' || semanaSeleccionada !== '') && (
                    <button
                      onClick={() => { setMesSeleccionado(''); setAnioSeleccionado(''); setSemanaSeleccionada(''); }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-xl transition-colors shrink-0"
                      title="Limpiar fecha"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="relative group w-full xl:w-auto">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar (nombre, justificación)..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="w-full sm:w-64 h-10 pl-9 pr-4 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 dark:text-gray-200 placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0 p-2 sm:ml-3 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-400 shrink-0">
            <X size={22} />
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar bg-gray-50/50 dark:bg-[#1a1a1a] flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-3">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <p className="font-medium text-sm">Cargando historial...</p>
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-gray-200 dark:border-neutral-800 h-full">
              <ClipboardList size={48} className="text-gray-300 dark:text-neutral-700 mb-4" />
              <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1">Sin Registros</h3>
              <p className="text-sm text-gray-500 text-center max-w-sm">No se han encontrado sustituciones registradas o la búsqueda no coincide con ningún resultado.</p>
            </div>
          ) : (
            <div className="overflow-x-hidden sm:overflow-x-auto sm:rounded-2xl sm:border border-gray-200 dark:border-neutral-800 bg-transparent sm:bg-white sm:dark:bg-[#1a1a1a] shadow-none sm:shadow-sm">
              <table className="w-full text-left border-collapse sm:min-w-[800px] block sm:table">
                <thead className="hidden sm:table-header-group">
                  <tr className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha / Actividad</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sustitución</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/3">Justificación</th>
                  </tr>
                </thead>
                <tbody className="flex flex-col gap-4 sm:table-row-group sm:gap-0 sm:divide-y divide-gray-100 dark:divide-neutral-800 font-sans">
                  {registrosFiltrados.map((row: any) => {
                    const d = new Date(row.created_at);
                    const fechaFormat = d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
                    const horaFormat = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

                    const smWidthHack = typeof window !== 'undefined' && window.innerWidth < 640 ? 2 : 1;
                    
                    return (
                      <tr key={row.id} className="flex flex-col sm:table-row bg-white dark:bg-[#1a1a1a] sm:bg-transparent sm:dark:bg-transparent rounded-2xl border border-gray-200 dark:border-neutral-800 sm:border-0 sm:border-b border-gray-100 dark:border-neutral-800 p-3 sm:p-0 hover:border-blue-500/30 sm:hover:bg-gray-50/80 sm:dark:hover:bg-neutral-900/50 transition-colors shadow-sm sm:shadow-none relative last:border-b-0">
                        {/* VISTA MÓVIL (Grid de 2 columnas) */}
                        <td className="sm:hidden w-full pb-3 border-b border-gray-100 dark:border-neutral-800 space-y-3">
                          <div className="grid grid-cols-2 gap-4 w-full h-full">
                            {/* COLUMNA IZQUIERDA: FECHA Y ACTIVIDAD */}
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Actividad</span>
                              <div className="flex flex-col gap-1">
                                <span className="text-[13px] font-bold text-gray-900 dark:text-white line-clamp-2" title={row.actividad_titulo}>
                                  {row.actividad_titulo}
                                </span>
                                <div className="flex flex-col gap-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                                  <span className="flex items-center gap-1 shrink-0"><Calendar size={10} /> {fechaFormat}</span>
                                  <span>{horaFormat}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* COLUMNA DERECHA: USUARIOS */}
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Sustitución</span>
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] w-10 font-bold uppercase text-red-500 bg-red-50 dark:bg-red-500/10 px-1 py-0.5 rounded text-center shrink-0 border border-red-200 dark:border-red-500/20">Salió</span>
                                  <span className="text-xs font-medium text-gray-800 dark:text-gray-300 line-clamp-2 leading-tight break-words">{row.saliente?.nombre}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] w-10 font-bold uppercase text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-1 py-0.5 rounded text-center shrink-0 border border-emerald-200 dark:border-emerald-500/20">Entró</span>
                                  <span className="text-xs font-medium text-gray-800 dark:text-white line-clamp-2 leading-tight break-words">{row.entrante?.nombre}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 dark:text-neutral-500 mt-0.5">
                                  Realizado por: <span className="line-clamp-2 leading-tight inline-block align-bottom">{row.autor?.nombre}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* VISTA ESCRITORIO */}
                        {/* FECHA Y ACTIVIDAD */}
                        <td className="hidden sm:table-cell px-0 sm:px-4 py-0 sm:py-6 align-middle border-b border-gray-100 dark:border-neutral-800 sm:border-0 pb-3 sm:pb-0">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 sm:hidden block">Fecha / Actividad</span>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2" title={row.actividad_titulo}>
                              {row.actividad_titulo}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                              <Calendar size={12} />
                              <span>{fechaFormat} &bull; {horaFormat}</span>
                            </div>
                          </div>
                        </td>

                        {/* USUARIOS */}
                        <td className="hidden sm:table-cell px-0 sm:px-4 py-0 sm:py-6 align-middle border-b border-gray-100 dark:border-neutral-800 sm:border-0 py-3 sm:py-0">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 sm:hidden block">Sustitución</span>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] w-12 font-bold uppercase text-red-500 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded text-center shrink-0 border border-red-200 dark:border-red-500/20">Salió</span>
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-300 line-clamp-2 leading-tight break-words">{row.saliente?.nombre}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] w-12 font-bold uppercase text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded text-center shrink-0 border border-emerald-200 dark:border-emerald-500/20">Entró</span>
                              <span className="text-sm font-medium text-gray-800 dark:text-white line-clamp-2 leading-tight break-words">{row.entrante?.nombre}</span>
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-neutral-500 mt-1">
                              Realizado por: <span className="line-clamp-2 leading-tight inline-block align-bottom">{row.autor?.nombre}</span>
                            </div>
                          </div>
                        </td>

                        {/* JUSTIFICACION */}
                        <td className="block sm:table-cell px-0 sm:px-4 py-0 sm:py-6 align-middle pt-3 sm:pt-0 shrink-0 w-full sm:w-1/3">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 sm:hidden block">Justificación</span>
                          <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-neutral-900/50 p-3 rounded-xl min-h-[50px] border border-gray-100 dark:border-neutral-800 flex items-center w-full">
                            <span className="break-words">{row.justificacion ? row.justificacion : <span className="italic opacity-60">Sin justificación proporcionada</span>}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
