'use client';

import { AlabanzaConNivel, MesUso, NivelFrecuencia } from './lib/zod';

interface Props {
  alabanza: AlabanzaConNivel;
  vistaPeriodo: 'meses' | 'semanas';
  onClick: () => void;
}

// Color de cada bloque del mini-heatmap
function colorBloque(cantidad: number): string {
  if (cantidad === 0) return 'bg-gray-100 dark:bg-neutral-800';
  if (cantidad === 1) return 'bg-indigo-200 dark:bg-indigo-900/70';
  if (cantidad <= 3) return 'bg-indigo-400 dark:bg-indigo-700';
  return 'bg-indigo-600 dark:bg-indigo-500';
}

const nivelConfig: Record<NivelFrecuencia, { dot: string }> = {
  frecuente: { dot: 'bg-orange-400' },
  regular:   { dot: 'bg-blue-400' },
  poco:      { dot: 'bg-cyan-400' },
  nunca:     { dot: 'bg-gray-300 dark:bg-neutral-600' },
};

export default function AlabanItem({ alabanza, vistaPeriodo, onClick }: Props) {
  const config = nivelConfig[alabanza.nivel];
  const datosPeriodo = vistaPeriodo === 'meses' ? alabanza.meses : alabanza.semanas;

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-800/50 hover:shadow-sm transition-all duration-150 group"
    >
      {/* Indicador de nivel */}
      <div className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} />

      {/* Nombre y tipo */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {alabanza.nombre}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{alabanza.tipo}</span>
          {alabanza.tonalidad && (
            <span className="text-xs text-gray-300 dark:text-gray-600">· {alabanza.tonalidad}</span>
          )}
        </div>
      </div>

      {/* Mini-heatmap */}
      <div className="hidden sm:flex items-center gap-0.5 shrink-0">
        {datosPeriodo.map((item: MesUso, i: number) => {
          const detalle = vistaPeriodo === 'meses'
            ? `Mes: ${item.label} — ${item.cantidad} ${item.cantidad === 1 ? 'vez' : 'veces'}`
            : `Semana: ${item.rango ?? item.label} — ${item.cantidad} ${item.cantidad === 1 ? 'vez' : 'veces'}`;

          return (
            <div key={item.mes} className="relative group/bloque">
              {/* Bloque */}
              <div className={`w-4 h-4 rounded-sm transition-colors ${colorBloque(item.cantidad)}`} />
              
              {/* Custom Tooltip Typewriter */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 pointer-events-none opacity-0 group-hover/bloque:opacity-100 transition-opacity duration-200 z-10 flex flex-col items-center">
                <div className="bg-gray-900 dark:bg-neutral-800 text-gray-100 text-xs font-semibold py-1.5 px-3 rounded-lg shadow-xl border border-gray-800 dark:border-neutral-700">
                  <div className="whitespace-nowrap overflow-hidden max-w-0 group-hover/bloque:max-w-[300px] transition-[max-width] duration-[1500ms] ease-out">
                    {detalle}
                  </div>
                </div>
                {/* Flecha */}
                <div className="w-2 h-2 bg-gray-900 dark:bg-neutral-800 border-b border-r border-gray-800 dark:border-neutral-700 rotate-45 -mt-1.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Contador de veces */}
      <div className="shrink-0 text-right">
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
          {alabanza.veces_cantada}
        </span>
        <p className="text-[10px] text-gray-400 dark:text-gray-600 leading-none mt-0.5">
          {alabanza.veces_cantada === 1 ? 'vez' : 'veces'}
        </p>
      </div>
    </button>
  );
}
