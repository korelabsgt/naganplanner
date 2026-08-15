'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

import {
  obtenerConfigPrograma,
  guardarConfigPrograma,
  eliminarConfigPrograma,
  reordenarConfigPrograma,
  generarReporteServicio,
  obtenerAjustesGlobales,
  guardarAjustesGlobales,
} from './actions';

import { ConfigProgramaForm, ConfigProgramaServicio, ReporteItem, AjustesGlobales, AjustesGlobalesForm } from './zod';

// =========================================================================
// QUERY KEYS
// =========================================================================

const CONFIG_KEYS = {
  all: ['config-programa-servicio'],
};

const AJUSTES_KEYS = {
  all: ['ajustes-globales-servicio'],
};

const REPORTE_KEYS = {
  byFecha: (fecha: string) => ['reporte-servicio', fecha],
};

// =========================================================================
// 1. HOOK DE CONFIGURACIÓN (LECTURA)
// =========================================================================

export const useConfigPrograma = (initialData?: ConfigProgramaServicio[]) => {
  return useQuery({
    queryKey: CONFIG_KEYS.all,
    queryFn: obtenerConfigPrograma,
    initialData,
    staleTime: 1000 * 60 * 10, // 10 min
  });
};

export const useAjustesGlobales = () => {
  return useQuery({
    queryKey: AJUSTES_KEYS.all,
    queryFn: obtenerAjustesGlobales,
    staleTime: 1000 * 60 * 10, // 10 min
  });
};

// =========================================================================
// 2. HOOK DE MUTACIONES (CRUD)
// =========================================================================

export const useConfigProgramaMutaciones = () => {
  const queryClient = useQueryClient();
  const invalidar = () => queryClient.invalidateQueries({ queryKey: CONFIG_KEYS.all });

  const guardar = useMutation({
    mutationFn: ({ data, id }: { data: ConfigProgramaForm; id?: string }) =>
      guardarConfigPrograma(data, id),
    onSuccess: invalidar,
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => eliminarConfigPrograma(id),
    onSuccess: invalidar,
  });

  const reordenar = useMutation({
    mutationFn: (items: { id: string; orden: number }[]) => reordenarConfigPrograma(items),
    onSuccess: invalidar,
  });

  return {
    guardar,
    eliminar,
    reordenar,
    isLoading: guardar.isPending || eliminar.isPending || reordenar.isPending,
  };
};

export const useAjustesGlobalesMutaciones = () => {
  const queryClient = useQueryClient();
  const invalidar = () => queryClient.invalidateQueries({ queryKey: AJUSTES_KEYS.all });

  const guardar = useMutation({
    mutationFn: (data: AjustesGlobalesForm) => guardarAjustesGlobales(data),
    onSuccess: invalidar,
  });

  return {
    guardar,
    isLoading: guardar.isPending,
  };
};

// =========================================================================
// 3. HOOK DE GENERACIÓN DEL REPORTE
// =========================================================================

export const useReporteServicio = (fechaHora: string | null) => {
  return useQuery({
    queryKey: REPORTE_KEYS.byFecha(fechaHora ?? ''),
    queryFn: () => generarReporteServicio(fechaHora!),
    enabled: !!fechaHora,
    staleTime: 1000 * 60 * 5,
  });
};

// =========================================================================
// 4. HOOK DE LÓGICA DE UI (Confirmaciones y notificaciones)
// =========================================================================

const swalBaseStyles = {
  popup: 'rounded-3xl shadow-2xl border border-gray-100 dark:border-neutral-800',
  title: 'text-xl font-black pt-4',
  htmlContainer: 'text-sm text-gray-500 dark:text-gray-400',
  actions: 'flex gap-3 justify-center mt-6 pb-4 w-full flex-wrap',
  cancelButton:
    'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700 font-bold rounded-xl px-6 py-2.5 transition-all',
};

export const useConfigProgramaLogic = () => {
  const { eliminar, guardar, reordenar, isLoading } = useConfigProgramaMutaciones();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const check = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const swalBg = isDarkMode ? '#1a1a1a' : '#ffffff';
  const swalText = isDarkMode ? '#f3f4f6' : '#1f2937';

  const notificar = (
    icon: 'success' | 'error' | 'info' | 'warning',
    title: string,
    text?: string
  ) => {
    if (icon === 'error') {
      Swal.fire({
        icon,
        title,
        text,
        background: swalBg,
        color: swalText,
        customClass: swalBaseStyles,
      });
    } else {
      Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        background: swalBg,
        color: swalText,
      }).fire({ icon, title });
    }
  };

  const confirmarEliminar = async (item: ConfigProgramaServicio) => {
    const tieneHijos = item.hijos && item.hijos.length > 0;
    const resultado = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar punto?',
      html: tieneHijos
        ? `<p>Eliminarás <strong>${item.nombre_mostrar}</strong> y todos sus subpuntos. Esta acción no se puede deshacer.</p>`
        : `<p>¿Estás seguro de eliminar <strong>${item.nombre_mostrar}</strong>?</p>`,
      background: swalBg,
      color: swalText,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      customClass: swalBaseStyles,
    });

    if (!resultado.isConfirmed) return;

    const res = await eliminar.mutateAsync(item.id);
    if (res.ok) {
      notificar('success', 'Punto eliminado correctamente');
    } else {
      notificar('error', 'Error al eliminar', res.error);
    }
  };

  const guardarItem = async (data: ConfigProgramaForm, id?: string) => {
    const res = await guardar.mutateAsync({ data, id });
    if (res.ok) {
      notificar('success', id ? 'Punto actualizado' : 'Punto agregado');
      return true;
    } else {
      notificar('error', 'Error al guardar', res.error);
      return false;
    }
  };

  const moverOrden = async (items: ConfigProgramaServicio[], index: number, direccion: 'arriba' | 'abajo') => {
    const copia = [...items];
    const targetIndex = direccion === 'arriba' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= copia.length) return;

    [copia[index], copia[targetIndex]] = [copia[targetIndex], copia[index]];

    const updates = copia.map((item, i) => ({ id: item.id, orden: i + 1 }));
    await reordenar.mutateAsync(updates);
  };

  return {
    isLoading,
    confirmarEliminar,
    guardarItem,
    moverOrden,
    notificar,
  };
};
