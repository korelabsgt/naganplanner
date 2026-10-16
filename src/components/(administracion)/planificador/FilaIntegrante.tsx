'use client';

import { useState } from 'react';
import { CheckCircle2, Ban, HelpCircle, MessageSquare, RefreshCw, Briefcase, MapPin, Loader2 } from 'lucide-react';
import { Integrante } from './lib/zod';
import { usePlanificadorMutations } from './lib/hooks';
import Swal from 'sweetalert2';
import ModalUbicacion from './modals/ModalUbicacion';

interface Props {
  integrante: Integrante;
  usuarioActualId: string;
  puedeEditar: boolean;
  onVerJustificacion: (motivo: string, nombre: string) => void;
  onSustituir: (e: React.MouseEvent, usuario_id: string, nombre: string) => void;
  onDarDeBaja: (e: React.MouseEvent, usuario_id: string, nombre: string) => void;
  isJefe?: boolean;
  actividadId: string;
}


export default function FilaIntegrante({
  integrante,
  usuarioActualId,
  puedeEditar,
  onVerJustificacion,
  onSustituir,
  onDarDeBaja,
  isJefe = false,
  actividadId
}: Props) {
  const nombre = integrante.perfil?.nombre || 'Usuario Desconocido';
  const estado = integrante.invitación;
  const esMiUsuario = integrante.usuario_id === usuarioActualId;
  const rol = integrante.rol;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState<'entrada' | 'salida' | null>(null);
  const { marcarAsistencia } = usePlanificadorMutations();

  const entrada = integrante.ubicacion?.entrada;
  const salida = integrante.ubicacion?.salida;

  const handleMarcar = async (tipo: 'entrada' | 'salida') => {
    if (!navigator.geolocation) {
      Swal.fire('Error', 'Tu navegador no soporta geolocalización', 'error');
      return;
    }

    setLoadingGeo(tipo);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          if (!actividadId) throw new Error("Falta actividad_id");
          await marcarAsistencia.mutateAsync({
            actividadId,
            usuarioId: integrante.usuario_id,
            tipo,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            fecha: new Date().toISOString()
          });
          Swal.fire({
            toast: true, position: 'top-end', timer: 2000, showConfirmButton: false,
            icon: 'success', title: `${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada`
          });
        } catch (error: any) {
          Swal.fire('Error', error.message, 'error');
        } finally {
          setLoadingGeo(null);
        }
      },
      (err) => {
        setLoadingGeo(null);
        Swal.fire('Error', 'No se pudo obtener la ubicación. Revisa los permisos del navegador.', 'error');
      },
      { enableHighAccuracy: true }
    );
  };

  const formatearHora = (isoStr: string) => {
    return new Date(isoStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const calcularDuracion = (start: string, end: string) => {
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    if (diffMs <= 0) return "--h --m";
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="flex flex-col bg-white dark:bg-[#111111] p-3 rounded-lg border border-gray-100 dark:border-neutral-800 transition-colors hover:border-blue-500/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 sm:mb-0">

        <div className="flex flex-col">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
              {nombre} {esMiUsuario && "(Tú)"}
            </span>

            {estado === true && (
              <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                <CheckCircle2 size={10} /> Confirmado
              </span>
            )}
            {estado === false && (
              <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                <Ban size={10} /> Rechazado
              </span>
            )}
            {(estado === null || estado === undefined) && (
              <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                <HelpCircle size={10} /> Pendiente
              </span>
            )}

            {/* ÍCONOS DE ACCIÓN */}
            <div className="flex items-center gap-0.5 -ml-1">

              {estado === false && integrante.justificación && (
                <button
                  onClick={(e) => { e.stopPropagation(); onVerJustificacion(integrante.justificación!, nombre); }}
                  className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-900/20 rounded-lg transition-all"
                  title="Leer justificación"
                >
                  <MessageSquare size={15} />
                </button>
              )}

              {/* --- LÓGICA ACTUALIZADA --- 
                    Mostramos si puedeEditar (jefe/creador) O si es el propio usuario (auto-gestión)
                */}
              {(puedeEditar || esMiUsuario) && (
                <>
                  <button
                    onClick={(e) => onSustituir(e, integrante.usuario_id, nombre)}
                    className="group flex items-center justify-center gap-1.5 p-0 sm:px-2.5 sm:py-1 text-[11px] font-bold uppercase tracking-wider text-gray-500 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:bg-white/5 dark:hover:bg-blue-500/10 border border-transparent hover:border-blue-200 dark:hover:border-blue-500/30 rounded-md transition-all active:scale-95"
                    title={esMiUsuario ? "Buscar a alguien que me sustituya" : "Sustituir a este miembro"}
                  >
                    <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" strokeWidth={2.5} />
                    <span className="hidden sm:inline">Sustituir</span>
                  </button>

                  {/* OPCIÓN DAR DE BAJA ELIMINADA POR SOLICITUD */}
                </>
              )}
            </div>
          </div>

          {rol && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
              <Briefcase size={12} className="opacity-70" />
              <span>{rol}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 mt-3 sm:mt-0 items-start sm:justify-end w-full sm:w-auto">

          {/* BOTÓN GENERAL PARA EL USUARIO ACTUAL */}
          {esMiUsuario && (!entrada || !salida) && (
            <button
              disabled={loadingGeo !== null}
              onClick={() => handleMarcar(!entrada ? 'entrada' : 'salida')}
              className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-md transition-all font-bold text-xs sm:text-[10px] uppercase tracking-wider ${!entrada
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 sm:bg-blue-50 sm:text-blue-600 sm:shadow-none sm:hover:bg-blue-100 dark:bg-blue-600/30 dark:text-blue-300 dark:hover:bg-blue-600/50'
                : 'bg-orange-600 text-white hover:bg-orange-700 shadow-md shadow-orange-500/20 sm:bg-orange-50 sm:text-orange-600 sm:shadow-none sm:hover:bg-orange-100 dark:bg-orange-600/30 dark:text-orange-300 dark:hover:bg-orange-600/50'
                }`}
            >
              {loadingGeo ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} className="opacity-80" />}
              <span>Marcar {!entrada ? 'Entrada' : 'Salida'}</span>
            </button>
          )}

          {/* HORAS DE ENTRADA, SALIDA Y DURACIÓN */}
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 text-[10.5px] sm:text-xs font-mono w-full sm:w-auto bg-transparent sm:bg-transparent dark:bg-transparent sm:dark:bg-transparent p-0">
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span className="text-gray-500 dark:text-gray-400">Entrada:</span>
              {entrada ? (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-gray-700 dark:text-gray-300 font-medium hover:text-blue-600 dark:hover:text-blue-400 underline underline-offset-2 decoration-dotted flex items-center gap-1"
                >
                  {formatearHora(entrada.fecha_creacion)}
                </button>
              ) : (
                <span className="text-gray-700 dark:text-gray-300 font-medium">--:--</span>
              )}
            </div>

            <div className="flex items-center gap-1 whitespace-nowrap">
              <span className="text-gray-500 dark:text-gray-400">Salida:</span>
              {salida ? (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-gray-700 dark:text-gray-300 font-medium hover:text-blue-600 dark:hover:text-blue-400 underline underline-offset-2 decoration-dotted flex items-center gap-1"
                >
                  {formatearHora(salida.fecha_creacion)}
                </button>
              ) : (
                <span className="text-gray-700 dark:text-gray-300 font-medium">--:--</span>
              )}
            </div>

            <span className="text-blue-600 dark:text-blue-400 font-bold whitespace-nowrap">
              Duración: {(entrada && salida) ? calcularDuracion(entrada.fecha_creacion, salida.fecha_creacion) : '--h --m'}
            </span>
          </div>
        </div>

      </div>

      <ModalUbicacion
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        datos={integrante.ubicacion}
        nombreIntegrante={nombre}
      />
    </div>
  );
}