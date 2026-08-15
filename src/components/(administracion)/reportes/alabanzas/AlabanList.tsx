'use client';

import { useState } from 'react';
import { Flame, Activity, Clock, Archive, Search, Loader2, AlertCircle, Music2 } from 'lucide-react';
import { AlabanzaConNivel, NivelFrecuencia } from './lib/zod';
import { useEstadisticasAlabanzas } from './lib/hooks';
import AlabanItem from './AlabanItem';
import ModalEstadisticas from './modals/ModalEstadisticas';

const CATEGORIAS: { nivel: NivelFrecuencia; label: string; icon: React.ReactNode; desc: string }[] = [
  { nivel: 'frecuente', label: 'Frecuentes', icon: <Flame className="w-4 h-4 text-orange-500" />, desc: 'Más de 6 veces' },
  { nivel: 'regular',   label: 'Regulares',  icon: <Activity className="w-4 h-4 text-blue-500" />,   desc: '3 a 6 veces' },
  { nivel: 'poco',      label: 'Poco uso',   icon: <Clock className="w-4 h-4 text-amber-500" />, desc: '1 a 2 veces' },
  { nivel: 'nunca',     label: 'Nunca',      icon: <Archive className="w-4 h-4 text-gray-400 dark:text-gray-500" />, desc: 'Sin historial' },
];

export default function AlabanList() {
  const { data: alabanzas, isLoading, isError } = useEstadisticasAlabanzas();
  const [busqueda, setBusqueda] = useState('');
  const [seleccionada, setSeleccionada] = useState<AlabanzaConNivel | null>(null);
  const [filtroActivo, setFiltroActivo] = useState<NivelFrecuencia | 'todas'>('todas');
  const [vistaPeriodo, setVistaPeriodo] = useState<'meses' | 'semanas'>('meses');

  const filtradas = (alabanzas ?? []).filter(a => {
    const coincideBusqueda = a.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideFiltro = filtroActivo === 'todas' || a.nivel === filtroActivo;
    return coincideBusqueda && coincideFiltro;
  });

  const porNivel = (nivel: NivelFrecuencia) => filtradas.filter(a => a.nivel === nivel);

  return (
    <>
      <div className="w-full max-w-3xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">

        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-500/40">
            <Music2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Estadísticas de Alabanzas
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Mapa de calor de uso del repertorio
            </p>
          </div>
        </div>

        {/* Resumen de categorías */}
        {!isLoading && alabanzas && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIAS.map(cat => {
              const total = alabanzas.filter(a => a.nivel === cat.nivel).length;
              const activo = filtroActivo === cat.nivel;
              return (
                <button
                  key={cat.nivel}
                  onClick={() => setFiltroActivo(activo ? 'todas' : cat.nivel)}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left transition-all duration-150
                    ${activo
                      ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 shadow-sm'
                      : 'border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-indigo-200 dark:hover:border-indigo-800/60'
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="shrink-0">{cat.icon}</div>
                    <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider truncate">{cat.label}</p>
                  </div>
                  <p className="text-lg font-black text-gray-900 dark:text-white shrink-0">{total}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar canto..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Leyenda del mini-heatmap y Toggle Periodo */}
        <div className="hidden sm:flex items-center justify-between text-xs text-gray-400 dark:text-gray-600 mt-2">
          
          {/* Leyenda */}
          <div className="flex items-center gap-2">
            <span>Menos</span>
            <div className="flex gap-0.5">
              {['bg-gray-100 dark:bg-neutral-800', 'bg-indigo-200 dark:bg-indigo-900/70', 'bg-indigo-400 dark:bg-indigo-700', 'bg-indigo-600 dark:bg-indigo-500'].map((c, i) => (
                <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
              ))}
            </div>
            <span>Más</span>
            <span className="ml-2 text-gray-300 dark:text-gray-700">últimas 6 {vistaPeriodo} →</span>
          </div>

          {/* Toggle */}
          <div className="flex bg-gray-100 dark:bg-neutral-800/80 p-0.5 rounded-lg border border-gray-200/50 dark:border-neutral-700/50">
            <button
              onClick={() => setVistaPeriodo('meses')}
              className={`px-3 py-1 rounded-md transition-all font-medium ${vistaPeriodo === 'meses' ? 'bg-white dark:bg-neutral-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              Meses
            </button>
            <button
              onClick={() => setVistaPeriodo('semanas')}
              className={`px-3 py-1 rounded-md transition-all font-medium ${vistaPeriodo === 'semanas' ? 'bg-white dark:bg-neutral-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              Semanas
            </button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            <span className="text-sm">Cargando estadísticas...</span>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">No se pudieron cargar las estadísticas.</p>
          </div>
        )}

        {/* Listas por categoría */}
        {!isLoading && alabanzas && (
          <div className="space-y-6">
            {CATEGORIAS.map(cat => {
              const items = porNivel(cat.nivel);
              if (items.length === 0) return null;

              return (
                <div key={cat.nivel}>
                  {/* Header de sección */}
                  <div className="flex items-center gap-2 mb-2">
                    {cat.icon}
                    <h2 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      {cat.label}
                    </h2>
                    <span className="text-xs text-gray-300 dark:text-gray-600">({items.length})</span>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-neutral-800 ml-2" />
                  </div>

                  {/* Ítems */}
                  <div className="space-y-1.5">
                    {items.map(alabanza => (
                      <AlabanItem
                        key={alabanza.id}
                        alabanza={alabanza}
                        vistaPeriodo={vistaPeriodo}
                        onClick={() => setSeleccionada(alabanza)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Sin resultados de búsqueda */}
            {filtradas.length === 0 && busqueda && (
              <div className="text-center py-14 text-gray-400">
                <Music2 className="w-8 h-8 mx-auto mb-2 text-gray-200 dark:text-gray-700" />
                <p className="text-sm font-medium">No se encontraron cantos con ese nombre</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de estadísticas */}
      {seleccionada && (
        <ModalEstadisticas
          alabanza={seleccionada}
          onClose={() => setSeleccionada(null)}
        />
      )}
    </>
  );
}
