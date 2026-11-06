'use client';

import { useState, useEffect } from 'react';
import { FileText, Trash2, Eye, UploadCloud, X, Loader2, Paperclip, Download } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Swal from 'sweetalert2';
import { usePlanificadorMutations } from '@/components/(administracion)/planificador/lib/hooks'; // Importamos el hook
import { Adjunto } from '@/components/(administracion)/planificador/lib/zod'; // Usamos el tipo centralizado de zod

interface Props {
  actividadId: string;
  adjuntosIniciales: Adjunto[];
  readonly?: boolean; 
}

export default function GestorArchivos({ actividadId, adjuntosIniciales, readonly = false }: Props) {
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>(adjuntosIniciales || []);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isMobileMode, setIsMobileMode] = useState(false);

  const supabase = createClient();
  
  // Extraemos las mutaciones necesarias del hook
  const { agregarAdjunto, borrarAdjunto } = usePlanificadorMutations();

  // === DETECCIÓN DE PANTALLA MÓVIL ===
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileMode(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    // Solo se ejecuta en el cliente
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

  // Sincronizar estado local si los props cambian (importante para TanStack Query)
  useEffect(() => {
    setAdjuntos(adjuntosIniciales || []);
  }, [adjuntosIniciales]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      Swal.fire('Formato incorrecto', 'Solo se permiten archivos PDF.', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Archivo muy pesado', 'El tamaño máximo es de 5MB.', 'warning');
      return;
    }

    try {
      setIsUploading(true);
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const { data, error } = await supabase.storage
        .from('planificador') 
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('planificador')
        .getPublicUrl(fileName);

      const nuevoAdjunto: Adjunto = {
        nombre: file.name,
        url: publicUrl,
        tipo: file.type
      };

      // --- CAMBIO: Usamos la mutación del hook ---
      await agregarAdjunto.mutateAsync({ id: actividadId, adjunto: nuevoAdjunto });
      
      // Actualizamos localmente para feedback inmediato
      setAdjuntos((prev) => [...prev, nuevoAdjunto]);
      
      Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 })
        .fire({ icon: 'success', title: 'Archivo subido correctamente' });

    } catch (error: any) {
      console.error(error);
      Swal.fire('Error al subir', error.message || 'No se pudo cargar el archivo.', 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (archivo: Adjunto) => {
    if (readonly) return;

    const result = await Swal.fire({
      title: '¿Eliminar archivo?',
      text: "No podrás deshacer esta acción.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#fff',
      color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
    });

    if (result.isConfirmed) {
      try {
        // --- CAMBIO: Usamos la mutación del hook ---
        await borrarAdjunto.mutateAsync({ id: actividadId, url: archivo.url });
        
        setAdjuntos((prev) => prev.filter(a => a.url !== archivo.url));
        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false });
      } catch (error: any) {
        Swal.fire('Error', error.message, 'error');
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* CABECERA */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
            <Paperclip size={16}/> 
          </div>
          Archivos Adjuntos
        </label>
        
        {!readonly && (
          <div className="relative">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isUploading || agregarAdjunto.isPending}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <button 
              type="button"
              className={`flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold transition-all ${(isUploading || agregarAdjunto.isPending) ? 'opacity-50' : ''}`}
            >
              {(isUploading || agregarAdjunto.isPending) ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14}/>}
              {(isUploading || agregarAdjunto.isPending) ? 'Subiendo...' : 'Subir PDF'}
            </button>
          </div>
        )}
      </div>

      {/* LISTA DE ARCHIVOS */}
      <div className="grid grid-cols-1 gap-2">
        {adjuntos.length === 0 ? (
          <div className="p-4 border border-dashed border-gray-200 dark:border-neutral-800 rounded-xl flex flex-col items-center justify-center text-gray-400 gap-2 bg-gray-50/50 dark:bg-neutral-900/20">
            <FileText size={20} className="opacity-30" />
            <span className="text-xs">No hay archivos adjuntos</span>
          </div>
        ) : (
          adjuntos.map((file, idx) => (
            <div 
              key={idx} 
              className="group flex items-center justify-between p-3 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl hover:border-purple-200 dark:hover:border-purple-900/50 transition-all shadow-sm"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 shrink-0">
                  <FileText size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate pr-2" title={file.nombre}>
                    {file.nombre}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase">PDF DOCUMENT</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPreviewUrl(file.url)}
                  className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                  title="Ver archivo"
                >
                  <Eye size={16} />
                </button>

                {!readonly && (
                  <button
                    onClick={() => handleDelete(file)}
                    disabled={borrarAdjunto.isPending}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30"
                    title="Eliminar archivo"
                  >
                    {borrarAdjunto.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
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
              <FileText size={16} className="text-red-400"/>
              <span className="hidden sm:inline">Previsualización de Documento</span>
              <span className="sm:hidden">Documento</span>
            </h3>
            
            <div className="flex items-center gap-3">
              <a 
                href={`${previewUrl}?download=`} 
                download
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20 active:scale-95 text-center"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Guardar o Imprimir</span>
                <span className="sm:hidden">Descargar</span>
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
            <div className="w-full h-full bg-white rounded-lg overflow-hidden shadow-2xl relative">
              {isMobileMode ? (
                 <iframe 
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewUrl)}&embedded=true`} 
                    className="w-full h-full" 
                    title="Visor PDF Móvil"
                 />
              ) : (
                 <object
                    data={previewUrl}
                    type="application/pdf"
                    className="w-full h-full absolute inset-0"
                 >
                   {/* Fallback si el navegador de PC no soporta plugins PDF, es raro pero posible */}
                   <iframe 
                      src={previewUrl} 
                      className="w-full h-full shadow-inner" 
                      title="Visor PDF Nativo"
                   />
                 </object>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}