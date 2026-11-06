'use client';

import { useState } from 'react';
import { Youtube, Check, Play, Trash2, Plus, Loader2 } from 'lucide-react';
import { usePlanificadorMutations } from '@/components/(administracion)/planificador/lib/hooks'; // Importamos el hook
import { VideoAdjunto } from '@/components/(administracion)/planificador/lib/zod';
import Swal from 'sweetalert2';

interface Props {
  actividadId: string;
  videosIniciales: VideoAdjunto[] | null;
  readonly?: boolean;
}

export default function GestorVideo({ actividadId, videosIniciales, readonly = false }: Props) {
  const [url, setUrl] = useState('');
  const [nombre, setNombre] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Extraemos las mutaciones necesarias
  const { agregarVideo, borrarVideo } = usePlanificadorMutations();

  const videos = videosIniciales || [];

  // Función para convertir link normal a embed
  const getEmbedUrl = (link: string | null) => {
    if (!link) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = link.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0` : null;
  };

  const handleAddVideo = async () => {
    if (!url.trim() || !nombre.trim()) {
      Swal.fire({
        title: 'Campos incompletos',
        text: 'Debes ingresar un nombre y una URL para el video',
        icon: 'warning',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    if (!getEmbedUrl(url)) {
      Swal.fire('URL Inválida', 'Por favor, introduce un enlace válido de YouTube', 'error');
      return;
    }

    try {
      const nuevoVideo: VideoAdjunto = {
        id: crypto.randomUUID(),
        nombre: nombre.trim(),
        url: url.trim()
      };

      // --- CAMBIO: Usamos mutateAsync del hook ---
      await agregarVideo.mutateAsync({ id: actividadId, video: nuevoVideo });
      
      setUrl('');
      setNombre('');
      setIsEditing(false);
      
      Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      }).fire({ icon: 'success', title: 'Video añadido correctamente' });
      
    } catch (e: any) {
      Swal.fire('Error al guardar', e.message || 'No se pudo agregar el video', 'error');
    }
  };

  const handleDelete = async (videoId: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar video?',
      text: "El video se quitará de la lista de referencias.",
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
        // --- CAMBIO: Usamos mutateAsync del hook ---
        await borrarVideo.mutateAsync({ id: actividadId, videoId });
      } catch (e: any) {
        Swal.fire('Error', 'No se pudo eliminar el video: ' + e.message, 'error');
      }
    }
  };

  // Estado de carga derivado de las mutaciones de TanStack Query
  const isPending = agregarVideo.isPending || borrarVideo.isPending;

  return (
    <div className="flex flex-col gap-4 mt-4 border-t border-gray-100 dark:border-neutral-800 pt-4">
      {/* CABECERA */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
            <Youtube size={16}/> 
          </div>
          Videos de Referencia ({videos.length})
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
            {isEditing ? 'Cancelar' : <><Plus size={14}/> Agregar Video</>}
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
              placeholder="Título del video (ej: Ensayo de voces)"
              className="w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
            />
            <div className="flex gap-2">
              <input 
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Pegar enlace de YouTube aquí..."
                className="flex-1 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
              />
              <button 
                onClick={handleAddVideo} 
                disabled={isPending}
                className="px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-11"
              >
                {agregarVideo.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18}/>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LISTADO DE VIDEOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {videos.length > 0 ? (
          videos.map((video) => (
            <div key={video.id} className="group flex flex-col gap-2 w-full max-w-full md:max-w-xl mx-auto">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate flex items-center gap-2">
                  <Play size={12} className="text-red-500" /> {video.nombre}
                </span>
                {!readonly && (
                  <button 
                    onClick={() => handleDelete(video.id)}
                    disabled={borrarVideo.isPending}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all disabled:opacity-30"
                    title="Eliminar video"
                  >
                    {borrarVideo.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                )}
              </div>
              
              <div 
                className="relative w-full aspect-video rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-neutral-800 bg-black group-hover:shadow-md transition-shadow"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <iframe
                  src={getEmbedUrl(video.url) || ''}
                  title={video.nombre}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0 pointer-events-auto"
                />
              </div>
            </div>
          ))
        ) : (
          !isEditing && (
            <div className="col-span-full p-8 border border-dashed border-gray-200 dark:border-neutral-800 rounded-xl flex flex-col items-center justify-center text-gray-400 gap-2 bg-gray-50/30 dark:bg-neutral-900/10">
              <Play size={28} className="opacity-10" />
              <span className="text-[11px] font-medium italic">No se han añadido videos para esta actividad</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}