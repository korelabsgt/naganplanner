'use client';

import { useState, useEffect } from 'react';
import { HardDrive, Check, Trash2, Plus, Loader2, Eye, X, ExternalLink } from 'lucide-react';
import { usePlanificadorMutations } from '@/components/(administracion)/planificador/lib/hooks';
import { ArchivoDrive } from '@/components/(administracion)/planificador/lib/zod';
import Swal from 'sweetalert2';

interface Props {
  actividadId: string;
  archivosIniciales: ArchivoDrive[] | null;
  readonly?: boolean;
}

export default function GestorDrive({ actividadId, archivosIniciales, readonly = false }: Props) {
  const [url, setUrl] = useState('');
  const [nombre, setNombre] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isMobileMode, setIsMobileMode] = useState(false);
  
  const { agregarDrive, borrarDrive } = usePlanificadorMutations();

  const archivos = archivosIniciales || [];

  // === DETECCIÓN DE PANTALLA MÓVIL ===
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileMode(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    if (typeof window !== 'undefined') {
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  // === BLOQUEO DE SCROLL DEL FONDO ===
  useEffect(() => {
    if (previewUrl) {
      document.body.style.overflow = 'hidden';

      const handleZoom = (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
        }
      };

      window.addEventListener('wheel', handleZoom, { passive: false });
      return () => {
        window.removeEventListener('wheel', handleZoom);
        document.body.style.overflow = 'unset';
      };
    }
  }, [previewUrl]);

  // Extrae el ID del archivo de un link de Drive
  const getFileId = (link: string | null) => {
    if (!link) return null;
    const regExp = /\/file\/d\/([a-zA-Z0-9_-]+)/;
    const match = link.match(regExp);
    return match ? match[1] : null;
  };

  // Desktop: usa el visor nativo de Drive
  // Móvil: usa Google Docs Viewer que SÍ tiene controles de zoom (+/-)
  const getEmbedUrl = (link: string | null) => {
    const fileId = getFileId(link);
    if (!fileId) return null;
    if (isMobileMode) {
      const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
      return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(directUrl)}`;
    }
    return `https://drive.google.com/file/d/${fileId}/preview`;
  };

  const handleAddDrive = async () => {
    if (!url.trim() || !nombre.trim()) {
      Swal.fire({
        title: 'Campos incompletos',
        text: 'Debes ingresar un nombre y el enlace de Drive',
        icon: 'warning',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    if (!getEmbedUrl(url)) {
      Swal.fire('URL Inválida', 'Por favor, introduce un enlace válido de archivo de Google Drive (debe contener /file/d/...)', 'error');
      return;
    }

    try {
      const nuevoArchivo: ArchivoDrive = {
        id: crypto.randomUUID(),
        nombre: nombre.trim(),
        url: url.trim()
      };

      await agregarDrive.mutateAsync({ id: actividadId, archivo: nuevoArchivo });
      
      setUrl('');
      setNombre('');
      setIsEditing(false);
      
      Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      }).fire({ icon: 'success', title: 'Archivo de Drive añadido correctamente' });
      
    } catch (e: any) {
      Swal.fire('Error al guardar', e.message || 'No se pudo vincular el archivo', 'error');
    }
  };

  const handleDelete = async (driveId: string) => {
    const result = await Swal.fire({
      title: '¿Desvincular archivo?',
      text: "El enlace de Drive se quitará de la lista de referencias.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#fff',
      color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
    });

    if (result.isConfirmed) {
      try {
        await borrarDrive.mutateAsync({ id: actividadId, driveId });
        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false });
      } catch (e: any) {
        Swal.fire('Error', 'No se pudo eliminar el archivo: ' + e.message, 'error');
      }
    }
  };

  const isPending = agregarDrive.isPending || borrarDrive.isPending;

  return (
    <div className="flex flex-col gap-4 mt-4 border-t border-gray-100 dark:border-neutral-800 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* CABECERA */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
            <HardDrive size={16}/> 
          </div>
          Archivos de Drive ({archivos.length})
        </label>
        
        {!readonly && (
          <button 
            onClick={() => {
              setIsEditing(!isEditing);
              setNombre('');
              setUrl('');
            }}
            className="text-[10px] uppercase tracking-wider text-blue-500 hover:text-blue-600 font-bold flex items-center gap-1 transition-colors"
          >
            {isEditing ? 'Cancelar' : <><Plus size={14}/> Vincular Drive</>}
          </button>
        )}
      </div>

      {/* FORMULARIO */}
      {isEditing && (
        <div className="flex flex-col gap-3 p-4 bg-gray-50 dark:bg-neutral-900/50 rounded-xl border border-gray-100 dark:border-neutral-800 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 gap-2">
            <input 
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Título del documento (ej: Programa de Actividades)"
              className="w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 transition-all font-medium"
            />
            <div className="flex gap-2">
              <input 
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Pegar enlace de Drive (cualquiera con el vínculo puede ver)..."
                className="flex-1 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
              />
              <button 
                onClick={handleAddDrive} 
                disabled={isPending}
                className="px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-11"
              >
                {agregarDrive.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18}/>}
              </button>
            </div>
            <span className="text-[10px] text-gray-500 italic ml-1 mt-1">Importante: El archivo de Drive debe tener permiso para que cualquier persona con el vínculo pueda verlo.</span>
          </div>
        </div>
      )}

      {/* LISTA DE ARCHIVOS */}
      <div className="grid grid-cols-1 gap-2">
        {archivos.length === 0 ? (
          !isEditing && (
            <div className="p-4 border border-dashed border-gray-200 dark:border-neutral-800 rounded-xl flex flex-col items-center justify-center text-gray-400 gap-2 bg-gray-50/50 dark:bg-neutral-900/20">
              <HardDrive size={20} className="opacity-30" />
              <span className="text-[11px] font-medium italic">No se han vinculado archivos de Drive para esta actividad</span>
            </div>
          )
        ) : (
          archivos.map((archivo) => (
            <div 
              key={archivo.id} 
              className="group flex items-center justify-between p-3 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl hover:border-green-200 dark:hover:border-green-900/50 transition-all shadow-sm"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500 shrink-0">
                  <HardDrive size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate pr-2" title={archivo.nombre}>
                    {archivo.nombre}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase">GOOGLE DRIVE LINK</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPreviewUrl(archivo.url)}
                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                  title="Ver archivo"
                >
                  <Eye size={16} />
                </button>

                {!readonly && (
                  <button
                    onClick={() => handleDelete(archivo.id)}
                    disabled={borrarDrive.isPending}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30"
                    title="Desvincular archivo"
                  >
                    {borrarDrive.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL PREVISUALIZACIÓN */}
      {previewUrl && (
        <div className="fixed inset-0 z-60 flex flex-col bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-white/10">
            <h3 className="text-white font-medium text-sm flex items-center gap-2">
              <HardDrive size={16} className="text-green-400"/>
              <span className="hidden sm:inline">Previsualización de Documento de Drive</span>
              <span className="sm:hidden">Drive</span>
            </h3>
            
            <div className="flex items-center gap-3">
              <a 
                href={previewUrl} 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20 active:scale-95 text-center"
              >
                <ExternalLink size={14} />
                <span className="hidden sm:inline">Abrir en otra pestaña</span>
                <span className="sm:hidden">Abrir</span>
              </a>
              
              <button 
                onClick={() => setPreviewUrl(null)}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 w-full h-full p-2 sm:p-4 md:p-8 relative">
            <div className="w-full h-full bg-[#323639] rounded-lg overflow-hidden shadow-2xl relative">
              <iframe 
                src={getEmbedUrl(previewUrl) || ''} 
                className="w-full h-full absolute inset-0 border-0 bg-white" 
                title="Visor Nativo de Drive"
                allow="autoplay"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
