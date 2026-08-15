'use client';

import { ReporteItem, IntegranteReporte } from './lib/zod';
import { Clock, Users, ChevronRight } from 'lucide-react';

interface Props {
  item: ReporteItem;
  isSubItem?: boolean;
}

export default function ServicioItem({ item, isSubItem = false }: Props) {
  const esAgrupador = item.tipo === 'agrupador';
  const tieneHijos = item.hijos && item.hijos.length > 0;
  const esRol = item.tipo === 'rol';

  return (
    <div className={`w-full ${isSubItem ? 'ml-2 sm:ml-4' : ''}`}>
      <div
        className={`
          flex flex-col px-3 py-3 sm:px-4 rounded-2xl transition-all duration-200
          ${esAgrupador
            ? 'bg-[#F8AC32]/10 dark:bg-[#F8AC32]/15 border border-[#F8AC32]/30 dark:border-[#F8AC32]/20'
            : isSubItem
              ? 'bg-white/60 dark:bg-neutral-800/60 border border-gray-100 dark:border-neutral-700/50'
              : 'bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 hover:border-[#F8AC32]/30 dark:hover:border-[#F8AC32]/30 hover:shadow-sm'
          }
        `}
      >
        {/* Top Row: Badge + Content + Desktop Right Block */}
        <div className="flex items-start sm:items-center gap-3 w-full">
          {/* Número de punto */}
          <div
            className={`
              flex-shrink-0 w-8 h-8 mt-0.5 sm:mt-0 rounded-xl flex items-center justify-center text-xs font-bold tracking-tight
              ${esAgrupador
                ? 'bg-[#F8AC32] text-white shadow-sm shadow-[#F8AC32]/30'
                : esRol
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                  : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
              }
            `}
          >
            {item.numero}
          </div>

          {/* Contenido central: nombre + info */}
          <div className="flex-1 min-w-0">
            {/* Nombre — siempre en su propia línea, sin truncar */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`font-semibold leading-snug ${
                  esAgrupador
                    ? 'text-[#E09827] dark:text-[#F8AC32]/60 text-sm'
                    : 'text-gray-800 dark:text-gray-100 text-sm'
                }`}
              >
                {item.nombre}
              </span>
              {esAgrupador && <ChevronRight className="w-3.5 h-3.5 text-[#F8AC32]/80 shrink-0" />}
            </div>

            {/* Responsables — debajo del nombre para todos los tamaños */}
            {!esAgrupador && (
              <div className="mt-1 flex flex-col gap-1">
                {item.integrantes.length > 0 ? (
                  item.integrantes.map((p: IntegranteReporte, i: number) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {p.nombre}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                    <span className="text-xs text-gray-400 dark:text-gray-600 italic">Sin asignar</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop: Tiempo y Duración a la derecha */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {/* Hora */}
            {!esAgrupador && item.hora_inicio && item.tiempo_minutos > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {item.hora_inicio}
                </span>
              </div>
            )}

            {/* Duración */}
            {item.tiempo_minutos > 0 ? (
              <span
                className={`
                  whitespace-nowrap text-xs font-bold px-2.5 py-1 rounded-full
                  ${esAgrupador
                    ? 'bg-[#F8AC32]/20 dark:bg-[#F8AC32]/20 text-[#E09827] dark:text-[#F8AC32]/60'
                    : 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400'
                  }
                `}
              >
                {item.tiempo_minutos} min
              </span>
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-600">-</span>
            )}
          </div>
        </div>

        {/* Mobile: Tiempo y Duración debajo a ancho completo */}
        <div className="flex sm:hidden justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-neutral-800/60 w-full">
          {/* Hora */}
          <div className="flex items-center gap-1.5">
            {!esAgrupador && item.hora_inicio && item.tiempo_minutos > 0 && (
              <>
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {item.hora_inicio}
                </span>
              </>
            )}
          </div>

          {/* Duración */}
          {item.tiempo_minutos > 0 ? (
            <span
              className={`
                whitespace-nowrap text-xs font-bold px-2.5 py-1 rounded-full
                ${esAgrupador
                  ? 'bg-[#F8AC32]/20 dark:bg-[#F8AC32]/20 text-[#E09827] dark:text-[#F8AC32]/60'
                  : 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400'
                }
              `}
            >
              {item.tiempo_minutos} min
            </span>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-600">-</span>
          )}
        </div>
      </div>

      {/* Sub-items */}
      {tieneHijos && (
        <div className="mt-2 space-y-2 pl-3 sm:pl-4 border-l-2 border-dashed border-[#F8AC32]/30 dark:border-[#F8AC32]/30 ml-3 sm:ml-4">
          {item.hijos!.map((hijo: ReporteItem) => (
            <ServicioItem key={hijo.numero} item={hijo} isSubItem />
          ))}
        </div>
      )}
    </div>
  );
}
