import { obtenerDatosGestor } from './lib/actions';
import ActividadList from './ActividadList';
import { Perfil } from '@/components/(administracion)/actividades/lib/zod';

interface Props {
  tipoVista: 'mis_actividades' | 'mi_equipo' |'todas';
}

export default async function GestorActividades({ tipoVista }: Props) {
  const datos = await obtenerDatosGestor(tipoVista);

  if (!datos) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-2xl border border-red-100 dark:border-red-800 shadow-sm max-w-md">
          <h3 className="font-bold text-lg mb-2">Acceso Restringido</h3>
          <p className="text-sm">
            No se pudo cargar la información o no tienes permisos para ver esta sección.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1750px] mx-auto px-1 sm:px-6 lg:px-8 py-2 sm:py-6">
      <ActividadList 
        initialData={{
          actividades: datos.actividades,
          usuarios: datos.usuarios,
          perfil: datos.perfil,
          departamentosEquipo: datos.departamentosEquipo, 
          isJefe: datos.isJefe
        }} 
        tipoVista={tipoVista}
      />
    </div>
  );
}