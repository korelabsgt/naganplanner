'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Pencil, ChevronUp, ChevronDown, Save, Loader2, Settings } from 'lucide-react';
import { ConfigProgramaServicio, ConfigProgramaForm, AjustesGlobalesForm } from '../lib/zod';
import { useConfigPrograma, useConfigProgramaLogic, useAjustesGlobales, useAjustesGlobalesMutaciones } from '../lib/hooks';
import { useRolesSugeridos } from '../../../planificador/lib/hooks';

interface Props {
  onBack: () => void;
  initialConfig: ConfigProgramaServicio[];
}

const MODULOS_DISPONIBLES = [
  { value: 'alabanza', label: 'Alabanza' },
  { value: 'danza-damas', label: 'Danza Damas' },
  { value: 'danza-caballeros', label: 'Danza Caballeros' },
  { value: 'multimedia', label: 'Multimedia' },
  { value: 'reunion', label: 'Reunión' },
];

const TIPO_OPCIONES = [
  { value: 'agrupador', label: 'Agrupador (Título con subpuntos)', color: '#F8AC32' },
  { value: 'rol', label: 'Rol (persona por rol)', color: 'blue' },
  { value: 'dependencia', label: 'Dependencia (módulo/departamento)', color: 'emerald' },
] as const;

const FORM_VACIO: ConfigProgramaForm = {
  parent_id: null,
  orden: 1,
  tipo_elemento: 'rol',
  nombre_mostrar: '',
  tiempo_minutos: 10,
};

export default function VistaConfigurarPrograma({ onBack, initialConfig }: Props) {
  const { data: config } = useConfigPrograma(initialConfig);
  const { confirmarEliminar, guardarItem, moverOrden, isLoading } = useConfigProgramaLogic();
  const { data: rolesSugeridos = [] } = useRolesSugeridos();

  const [modoForm, setModoForm] = useState<'nuevo' | 'editar' | null>(null);
  const [itemEditando, setItemEditando] = useState<ConfigProgramaServicio | null>(null);
  const [form, setForm] = useState<ConfigProgramaForm>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  // Ajustes Globales
  const { data: ajustes, isLoading: cargandoAjustes } = useAjustesGlobales();
  const { guardar: guardarAjustes, isLoading: guardandoAjustes } = useAjustesGlobalesMutaciones();
  const [editandoAjustes, setEditandoAjustes] = useState(false);
  const [formAjustes, setFormAjustes] = useState<AjustesGlobalesForm>({ nombre_iglesia: '', minutos_preparacion_previa: 60 });

  // Sincronizar estado de ajustes cuando carguen
  useEffect(() => {
    if (ajustes && !editandoAjustes) {
      setFormAjustes({
        nombre_iglesia: ajustes.nombre_iglesia,
        minutos_preparacion_previa: ajustes.minutos_preparacion_previa
      });
    }
  }, [ajustes, editandoAjustes]);

  const submitAjustes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAjustes.nombre_iglesia.trim()) return;
    await guardarAjustes.mutateAsync(formAjustes);
    setEditandoAjustes(false);
  };

  // Aplanar árbol para mostrar en lista con indentación
  const aplanarItems = (items: ConfigProgramaServicio[], nivel = 0): (ConfigProgramaServicio & { nivel: number })[] => {
    return items.flatMap((item) => [
      { ...item, nivel },
      ...aplanarItems(item.hijos ?? [], nivel + 1),
    ]);
  };

  const itemsPlanos = aplanarItems(config ?? []);
  const itemsRaiz = (config ?? []).filter((i) => !i.parent_id);

  const abrirNuevo = (parentId?: string) => {
    const hermanos = parentId
      ? (config ?? []).flatMap((i) => i.hijos ?? []).filter((i) => i.parent_id === parentId)
      : itemsRaiz;
    setForm({
      ...FORM_VACIO,
      parent_id: parentId ?? null,
      orden: hermanos.length + 1,
    });
    setItemEditando(null);
    setModoForm('nuevo');
  };

  const abrirEditar = (item: ConfigProgramaServicio) => {
    setForm({
      parent_id: item.parent_id ?? null,
      orden: item.orden,
      tipo_elemento: item.tipo_elemento,
      nombre_mostrar: item.nombre_mostrar,
      tiempo_minutos: item.tiempo_minutos ?? null,
    });
    setItemEditando(item);
    setModoForm('editar');
  };

  const cancelarForm = () => {
    setModoForm(null);
    setItemEditando(null);
    setForm(FORM_VACIO);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre_mostrar.trim()) return;
    setGuardando(true);

    const ok = await guardarItem(form, itemEditando?.id);
    setGuardando(false);
    if (ok) cancelarForm();
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Header con botón regresar */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all"
          title="Volver al reporte"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Configuración de la plantilla
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Define el orden y los tiempos de cada bloque del programa
          </p>
        </div>
      </div>

      {/* Ajustes Globales */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-50 dark:border-neutral-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#F8AC32] dark:text-[#F8AC32]/80">
            <Settings className="w-5 h-5" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Ajustes Generales</h2>
          </div>
          {!editandoAjustes && (
            <button
              onClick={() => setEditandoAjustes(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#E09827] dark:text-[#F8AC32]/60 bg-[#F8AC32]/10 hover:bg-[#F8AC32]/20 dark:bg-[#F8AC32]/20 dark:hover:bg-[#F8AC32]/30 rounded-lg transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar Ajustes
            </button>
          )}
        </div>
        <div className="p-4 sm:p-5">
          {cargandoAjustes ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : editandoAjustes ? (
            <form onSubmit={submitAjustes} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Nombre de Iglesia
                </label>
                <input
                  type="text"
                  required
                  value={formAjustes.nombre_iglesia}
                  onChange={e => setFormAjustes({ ...formAjustes, nombre_iglesia: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-[#F8AC32] outline-none"
                  placeholder="Ej. KORE Church"
                />
              </div>
              <div className="w-full sm:w-48">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Retraso inicio (min)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formAjustes.minutos_preparacion_previa}
                  onChange={e => setFormAjustes({ ...formAjustes, minutos_preparacion_previa: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-[#F8AC32] outline-none"
                  placeholder="Ej. 60"
                />
              </div>
              <div className="flex items-end gap-2 mt-4 sm:mt-0">
                <button
                  type="button"
                  onClick={() => setEditandoAjustes(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoAjustes}
                  className="px-4 py-2 text-sm font-semibold bg-[#F8AC32] hover:bg-[#E09827] text-white rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {guardandoAjustes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-neutral-950/50 p-4 rounded-xl border border-gray-100 dark:border-neutral-800/60 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Nombre de Iglesia</p>
                <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
                  {ajustes?.nombre_iglesia || 'No configurado'}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-neutral-950/50 p-4 rounded-xl border border-gray-100 dark:border-neutral-800/60 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Retraso de Inicio</p>
                <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
                  {ajustes?.minutos_preparacion_previa} minutos después
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="p-5 space-y-4">
          
          {/* Botón agregar principal */}
          {!modoForm && (
            <div className="flex justify-end">
              <button
                onClick={() => abrirNuevo()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#F8AC32] hover:bg-[#E09827] text-white rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" />
                Agregar punto principal
              </button>
            </div>
          )}

          {/* Lista de ítems */}
          {itemsPlanos.length === 0 && !modoForm && (
            <div className="text-center py-12 text-gray-400 dark:text-gray-600">
              <p className="text-sm">No hay puntos configurados.</p>
              <p className="text-xs mt-1">Agrega el primer punto para comenzar.</p>
            </div>
          )}

          {itemsPlanos.length > 0 && (
            <div className="space-y-2">
              {itemsPlanos.map((item) => {
                const esRaiz = !item.parent_id;
                const hermanosDelNivel = esRaiz
                  ? itemsRaiz
                  : itemsPlanos.filter(
                      (i) => i.parent_id === item.parent_id && i.nivel === item.nivel
                    );
                const indexEnNivel = hermanosDelNivel.findIndex((i) => i.id === item.id);

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-neutral-950/50 rounded-xl border border-gray-100 dark:border-neutral-800/80 transition-all ${item.nivel > 0 ? 'ml-8' : ''}`}
                  >
                    {/* Flechas */}
                    <div className="flex flex-col bg-white dark:bg-neutral-900 rounded-md border border-gray-200 dark:border-neutral-700 overflow-hidden flex-shrink-0">
                      <button
                        onClick={() => moverOrden(hermanosDelNivel, indexEnNivel, 'arriba')}
                        disabled={indexEnNivel === 0 || isLoading}
                        className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-all border-b border-gray-200 dark:border-neutral-700"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moverOrden(hermanosDelNivel, indexEnNivel, 'abajo')}
                        disabled={indexEnNivel === hermanosDelNivel.length - 1 || isLoading}
                        className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-all"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Badge número */}
                    <span
                      className={`
                        flex-shrink-0 w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center
                        ${item.tipo_elemento === 'agrupador'
                          ? 'bg-[#F8AC32]/20 dark:bg-[#F8AC32]/20 text-[#E09827] dark:text-[#F8AC32]/60'
                          : item.tipo_elemento === 'rol'
                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                            : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                        }
                      `}
                    >
                      {item.orden}
                    </span>

                    {/* Nombre */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium text-gray-800 dark:text-gray-200 truncate ${item.nivel > 0 ? 'text-xs' : ''}`}>
                        {item.nombre_mostrar}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                        {item.tipo_elemento === 'agrupador'
                          ? 'Agrupador (Contenedor)'
                          : `${item.tipo_elemento === 'rol' ? 'Rol' : 'Dependencia'} · ${item.tiempo_minutos ?? 0} min`}
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">

                      {item.tipo_elemento === 'agrupador' && (
                        <button
                          onClick={() => abrirNuevo(item.id)}
                          className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30 transition-all"
                          title="Agregar subpunto"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => abrirEditar(item)}
                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-all"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmarEliminar(item)}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Formulario Modal */}
          {modoForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <form
                onSubmit={submitForm}
                className="w-full max-w-lg p-6 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-gray-100 dark:border-neutral-800 space-y-5 animate-in zoom-in-95 duration-200"
              >
                <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-neutral-800 pb-3">
                  {modoForm === 'nuevo' ? 'Agregar nuevo punto' : 'Editar punto'}
                </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Nombre a mostrar *
                  </label>

                  {form.tipo_elemento === 'agrupador' && (
                    <input
                      type="text"
                      value={form.nombre_mostrar}
                      onChange={(e) => setForm({ ...form, nombre_mostrar: e.target.value })}
                      placeholder="Ej: Coordinación / Bienvenida"
                      required
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#F8AC32] transition-all"
                    />
                  )}

                  {form.tipo_elemento === 'rol' && (
                    <select
                      value={form.nombre_mostrar}
                      onChange={(e) => setForm({ ...form, nombre_mostrar: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#F8AC32] transition-all"
                    >
                      <option value="">Selecciona un rol...</option>
                      {rolesSugeridos.map(rol => (
                        <option key={rol} value={rol}>{rol}</option>
                      ))}
                    </select>
                  )}

                  {form.tipo_elemento === 'dependencia' && (
                    <select
                      value={form.nombre_mostrar}
                      onChange={(e) => setForm({ ...form, nombre_mostrar: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#F8AC32] transition-all"
                    >
                      <option value="">Selecciona una dependencia...</option>
                      {MODULOS_DISPONIBLES.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Tipo de elemento */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Tipo de elemento *
                  </label>
                  <select
                    value={form.tipo_elemento}
                    onChange={(e) =>
                      setForm({ 
                        ...form, 
                        tipo_elemento: e.target.value as ConfigProgramaForm['tipo_elemento'],
                        nombre_mostrar: ''
                      })
                    }
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#F8AC32] transition-all"
                  >
                    {TIPO_OPCIONES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tiempo (no para agrupador) */}
                {form.tipo_elemento !== 'agrupador' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Duración (minutos)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.tiempo_minutos ?? ''}
                      onChange={(e) =>
                        setForm({ ...form, tiempo_minutos: e.target.value ? Number(e.target.value) : null })
                      }
                      placeholder="Ej: 15"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#F8AC32] transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Acciones del formulario */}
              <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={cancelarForm}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-800 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#F8AC32] hover:bg-[#E09827] text-white rounded-xl transition-all disabled:opacity-70"
                >
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {modoForm === 'nuevo' ? 'Agregar punto' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
          )}

        </div>
      </div>
    </div>
  );
}
