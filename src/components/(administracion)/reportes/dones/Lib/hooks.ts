import { useQuery } from '@tanstack/react-query';
import { obtenerReporteDones } from './actions';
import { DonReporte } from './zod';

export function useReporteDones(initialData?: DonReporte[]) {
  return useQuery({
    queryKey: ['reporte-dones'],
    queryFn: async () => {
      const data = await obtenerReporteDones();
      if (data === null) throw new Error("Acceso denegado");
      return data;
    },
    initialData,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
