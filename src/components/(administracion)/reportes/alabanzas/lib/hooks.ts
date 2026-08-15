'use client';

import { useQuery } from '@tanstack/react-query';
import { obtenerEstadisticasAlabanzas, obtenerDetalleStat } from './actions';

const KEYS = {
  todas: ['estadisticas-alabanzas'],
  detalle: (id: string) => ['detalle-alabanza', id],
};

export const useEstadisticasAlabanzas = () => {
  return useQuery({
    queryKey: KEYS.todas,
    queryFn: obtenerEstadisticasAlabanzas,
    staleTime: 1000 * 60 * 10, // 10 min
  });
};

export const useDetalleStat = (id: string | null) => {
  return useQuery({
    queryKey: KEYS.detalle(id ?? ''),
    queryFn: () => obtenerDetalleStat(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};
