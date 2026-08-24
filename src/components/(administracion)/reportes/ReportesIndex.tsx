import { ChevronRight } from "lucide-react";
import Link from "next/link";

export default function ReportesIndex() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Reportes y Documentos
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Selecciona el tipo de reporte o programa que deseas generar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tarjeta de Reporte de Servicio */}
        <Link href="/kore/reportes/servicio" className="block group">
          <div className="flex flex-col justify-center h-full p-8 rounded-2xl border border-gray-200/60 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 hover:bg-white dark:hover:bg-neutral-900 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white text-xl mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Programa General
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Genera e imprime el programa general de un servicio específico.
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 dark:text-neutral-700 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors shrink-0 mt-1" />
            </div>
          </div>
        </Link>

        {/* Tarjeta de Estadísticas de Alabanzas */}
        <Link href="/kore/reportes/alabanzas" className="block group">
          <div className="flex flex-col justify-center h-full p-8 rounded-2xl border border-gray-200/60 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 hover:bg-white dark:hover:bg-neutral-900 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white text-xl mb-2 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors">
                  Estadísticas de Alabanzas
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Visualiza qué cantos se usan más, cuáles están en el olvido y su historial de uso.
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 dark:text-neutral-700 group-hover:text-orange-400 dark:group-hover:text-orange-500 transition-colors shrink-0 mt-1" />
            </div>
          </div>
        </Link>

        {/* Tarjeta de Reporte de Dones Espirituales */}
        <Link href="/kore/reportes/dones" className="block group">
          <div className="flex flex-col justify-center h-full p-8 rounded-2xl border border-gray-200/60 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 hover:bg-white dark:hover:bg-neutral-900 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white text-xl mb-2 group-hover:text-[#d6a738] transition-colors">
                  Dones Espirituales
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Consulta el historial de palabras, profecías y citas bíblicas compartidas en los servicios.
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 dark:text-neutral-700 group-hover:text-[#d6a738] transition-colors shrink-0 mt-1" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
