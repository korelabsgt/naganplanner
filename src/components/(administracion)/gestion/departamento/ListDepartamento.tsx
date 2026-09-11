"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import {
  ChevronRight, ChevronDown, Plus, Pencil, Trash2, Crown, X, Briefcase, UserPlus, User, UserX, UserCheck, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown
} from "lucide-react";

import {
  useDepartamentos,
  useCreateDepartamento,
  useUpdateDepartamento,
  useDeleteDepartamento,
  useSwapDepartamento,
  useShiftDepartamento
} from "./lib/hooks";

import {
  useDeletePuesto,
  useDesvincularUsuario
} from "../puesto/lib/hooks";

import { DepartamentoNode, DepartamentoRow, Puesto } from "./lib/schemas";

import ModalPuesto from "../puesto/ModalPuesto";
import ModalAsignarUsuario from "../puesto/ModalAsignarUsuario";

const Toast = Swal.mixin({
  toast: true, position: "top-end", showConfirmButton: false, timer: 3000, timerProgressBar: true,
  didOpen: (toast) => { toast.onmouseenter = Swal.stopTimer; toast.onmouseleave = Swal.resumeTimer; }
});

const getLevelStyles = (depth: number) => {
  switch (depth) {
    case 0: return { badge: "bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border-blue-600/30 dark:border-blue-600/50", color: "#2563eb" };
    case 1: return { badge: "bg-red-600/10 dark:bg-red-600/20 text-red-600 dark:text-red-400 border-red-600/30 dark:border-red-600/50", color: "#dc2626" };
    default: return { badge: "bg-purple-600/10 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 border-purple-600/30 dark:border-purple-600/50", color: "#9333ea" };
  }
};

const PuestoItem = ({ puesto, onEdit, onDelete, onAssignUser, parentColor }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: desvincular } = useDesvincularUsuario();

  const usuarioAsignado = puesto.usuario || null;

  const handleDesvincular = (e: React.MouseEvent, puestoId: string) => {
    e.stopPropagation();
    Swal.fire({
      title: "¿Quitar usuario?",
      text: `Se liberará la plaza de ${puesto.nombre}`,
      icon: "warning",
      background: document.documentElement.classList.contains('dark') ? '#18181b' : '#fff',
      color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
      showCancelButton: true,
      confirmButtonText: "Remover",
      confirmButtonColor: '#ef4444'
    }).then((result) => {
      if (result.isConfirmed) {
        desvincular(puestoId, {
          onSuccess: () => Toast.fire({ icon: 'success', title: 'Usuario removido' })
        });
      }
    });
  };

  return (
    <div className="flex flex-col w-full relative">
      <div
        className="absolute left-0 top-6 w-4 border-t-2 opacity-30 dark:opacity-40"
        style={{ borderColor: parentColor }}
      />

      <div
        className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors ml-4 border-l-2 border-l-amber-500/40 group cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="text-zinc-400 dark:text-zinc-600 group-hover:text-amber-500 transition-colors">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
          <div className="p-1.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 shrink-0">
            {puesto.es_jefatura ? <Crown size={14} strokeWidth={2.5} /> : <Briefcase size={14} />}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">{puesto.nombre}</span>
            <span className={`text-[9px] uppercase font-bold ${usuarioAsignado ? "text-green-600 dark:text-green-500/70" : "text-zinc-400 dark:text-zinc-600"}`}>
              {usuarioAsignado ? "Ocupado" : "Vacante"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 ml-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onAssignUser(puesto)} className="p-2 text-green-600 dark:text-green-500 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-lg">
            <UserPlus size={16} />
          </button>
          <button onClick={() => onEdit(puesto)} className="p-2 text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg">
            <Pencil size={16} />
          </button>
          {!usuarioAsignado && (
            <button onClick={() => onDelete(puesto.id)} className="p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="ml-12 border-l-2 border-zinc-200 dark:border-zinc-800/50 pl-4 py-2 bg-zinc-100/30 dark:bg-black/20 animate-in fade-in slide-in-from-top-2 duration-200">
          {usuarioAsignado ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50 w-full max-w-sm group/user shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
                    <User size={16} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-white dark:border-zinc-900">
                    <UserCheck size={8} className="text-white dark:text-black" strokeWidth={3} />
                  </div>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">{usuarioAsignado.nombre}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 uppercase font-bold w-fit">
                    {usuarioAsignado.rol || "COLABORADOR"}
                  </span>
                </div>
              </div>
              <button onClick={(e) => handleDesvincular(e, puesto.id)} className="p-2 text-zinc-400 hover:text-red-500">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 text-zinc-500 italic text-xs">
              <UserX size={14} />
              <span>Plaza vacante.</span>
              <button onClick={(e) => { e.stopPropagation(); onAssignUser(puesto); }} className="text-amber-600 dark:text-amber-500 font-bold ml-1">Asignar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DepartmentItem = ({ node, prefix, depth, totalSiblings, onMove, onAdd, onEdit, onDelete, onAsignarPuesto, onEditPuesto, onDeletePuesto, onAssignUserToPuesto }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const hasChildren = (node.children && node.children.length > 0);
  const hasPuestos = (node.puestos && node.puestos.length > 0);
  const hasContent = hasChildren || hasPuestos;
  const styles = getLevelStyles(depth);

  return (
    <div className={`flex flex-col w-full relative ${menuOpen ? 'z-50' : 'z-0'}`}>
      <div
        className="flex items-center justify-between p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer"
        onClick={() => hasContent && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="w-6 flex justify-center shrink-0">
            {hasContent ? (
              <div className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white p-1">
                {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
            ) : <span className="w-4" />}
          </div>
          <div className="relative" onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}>
            <span className={`px-1.5 py-0.5 text-[10px] font-bold border rounded shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${styles.badge}`}>{prefix}</span>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                <div className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 py-1 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <button
                    disabled={node.orden === 1}
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onMove(node, 'up'); }}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-full text-left"
                  >
                    <ArrowUp size={14} className="text-zinc-400" /> Mover arriba
                  </button>
                  <button
                    disabled={node.orden === totalSiblings}
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onMove(node, 'down'); }}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-full text-left"
                  >
                    <ArrowDown size={14} className="text-zinc-400" /> Mover abajo
                  </button>
                  <div className="h-px w-full bg-zinc-200 dark:bg-zinc-800 my-1" />
                  <button
                    disabled={node.orden === 1}
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onMove(node, 'start'); }}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-full text-left"
                  >
                    <ChevronsUp size={14} className="text-zinc-400" /> Mover al inicio
                  </button>
                  <button
                    disabled={node.orden === totalSiblings}
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onMove(node, 'end'); }}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-full text-left"
                  >
                    <ChevronsDown size={14} className="text-zinc-400" /> Mover al final
                  </button>
                </div>
              </>
            )}
          </div>
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase truncate">{node.nombre}</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onAsignarPuesto(node)} className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-500 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/20" title="Nuevo Puesto">
            + PUESTO
          </button>
          <button onClick={() => onAsignarPuesto(node)} className="sm:hidden p-2 text-amber-600 dark:text-amber-500"><Briefcase size={16} /></button>
          <button onClick={() => onAdd(node)} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-green-600 dark:hover:text-green-400"><Plus size={18} /></button>
          <button onClick={() => onEdit(node)} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400"><Pencil size={16} /></button>
          <button
            disabled={hasContent}
            onClick={() => onDelete(node.id)}
            className={`p-2 transition-colors ${hasContent
                ? "text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
                : "text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
              }`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {hasContent && isOpen && (
        <div
          className="ml-6 border-l-2 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-300"
          style={{ borderColor: `${styles.color}44` }}
        >
          {/* 1. SECCIÓN DE PUESTOS AHORA VA PRIMERO */}
          {hasPuestos && (
            <div className="mt-1 mb-2">
              {node.puestos.map((puesto: Puesto) => (
                <PuestoItem
                  key={puesto.id} puesto={puesto} parentColor={styles.color}
                  onEdit={onEditPuesto} onDelete={onDeletePuesto}
                  onAssignUser={onAssignUserToPuesto}
                />
              ))}
            </div>
          )}

          {/* 2. SECCIÓN DE SUBDEPARTAMENTOS VA DESPUÉS */}
          {hasChildren && node.children.map((child: any, index: number) => (
            <div key={child.id} className="relative">
              <div
                className="absolute left-0 top-7 w-4 border-t-2 opacity-30 dark:opacity-40"
                style={{ borderColor: styles.color }}
              />
              <DepartmentItem
                node={child} prefix={`${prefix}.${index + 1}`} depth={depth + 1}
                totalSiblings={node.children.length} onMove={onMove}
                onAdd={onAdd} onEdit={onEdit} onDelete={onDelete}
                onAsignarPuesto={onAsignarPuesto} onEditPuesto={onEditPuesto} onDeletePuesto={onDeletePuesto}
                onAssignUserToPuesto={onAssignUserToPuesto}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function ListDepartamentos({ initialData }: { initialData: DepartamentoRow[] }) {
  const { data, isLoading } = useDepartamentos(initialData);
  const { mutate: crear } = useCreateDepartamento();
  const { mutate: actualizar } = useUpdateDepartamento();
  const { mutate: eliminar } = useDeleteDepartamento();
  const { mutate: eliminarPuesto } = useDeletePuesto();
  const { mutate: intercambiar } = useSwapDepartamento();
  const { mutate: shift } = useShiftDepartamento();

  const handleMove = (node: DepartamentoNode, action: 'up' | 'down' | 'start' | 'end') => {
    const hermanos = data?.flat?.filter(d => d.parent_id === node.parent_id) || [];
    const total = hermanos.length;
    const currentOrden = node.orden ?? 1;

    if (action === 'up' && currentOrden > 1) {
      const prev = hermanos.find(h => h.orden === currentOrden - 1);
      if (prev) intercambiar({ id1: node.id, orden1: currentOrden - 1, id2: prev.id, orden2: currentOrden });
    } else if (action === 'down' && currentOrden < total) {
      const next = hermanos.find(h => h.orden === currentOrden + 1);
      if (next) intercambiar({ id1: node.id, orden1: currentOrden + 1, id2: next.id, orden2: currentOrden });
    } else if (action === 'start' && currentOrden > 1) {
      shift({ id: node.id, parentId: node.parent_id || null, oldOrden: currentOrden, newOrden: 1 });
    } else if (action === 'end' && currentOrden < total) {
      shift({ id: node.id, parentId: node.parent_id || null, oldOrden: currentOrden, newOrden: total });
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<"crear" | "editar">("crear");
  const [currentNode, setCurrentNode] = useState<DepartamentoNode | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [orden, setOrden] = useState<number | "">("");

  const [isPuestoModalOpen, setIsPuestoModalOpen] = useState(false);
  const [selectedDepa, setSelectedDepa] = useState<{ id: string, nombre: string } | null>(null);
  const [puestoToEdit, setPuestoToEdit] = useState<Puesto | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedPuestoForAssign, setSelectedPuestoForAssign] = useState<Puesto | null>(null);

  const handleOpenCrearPuesto = (node: DepartamentoNode) => { setSelectedDepa({ id: node.id, nombre: node.nombre }); setPuestoToEdit(null); setIsPuestoModalOpen(true); };
  const handleOpenEditarPuesto = (puesto: Puesto) => { setSelectedDepa({ id: puesto.departamento_id, nombre: "Editar Puesto" }); setPuestoToEdit(puesto); setIsPuestoModalOpen(true); };

  const handleDeletePuesto = (id: string) => {
    Swal.fire({
      title: "¿Eliminar?",
      text: "Se perderán los datos del puesto.",
      icon: "warning",
      background: document.documentElement.classList.contains('dark') ? '#18181b' : '#fff',
      color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
      showCancelButton: true
    }).then((res) => {
      if (res.isConfirmed) {
        eliminarPuesto(id, {
          onError: (err: any) => {
            Swal.fire({
              icon: 'error',
              title: 'No se puede eliminar',
              text: err.message,
              background: document.documentElement.classList.contains('dark') ? '#18181b' : '#fff',
              color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
            });
          }
        });
      }
    });
  };

  const handleOpenAssignUser = (puesto: Puesto) => { setSelectedPuestoForAssign(puesto); setIsAssignModalOpen(true); };

  const openCreateRoot = () => { setMode("crear"); setParentId(null); setCurrentNode(null); setNombre(""); setOrden(""); setIsModalOpen(true); };
  const openCreateChild = (padre: DepartamentoNode) => { setMode("crear"); setParentId(padre.id); setCurrentNode(padre); setNombre(""); setOrden(""); setIsModalOpen(true); };
  const openEdit = (node: DepartamentoNode) => { setMode("editar"); setCurrentNode(node); setNombre(node.nombre); setOrden(node.orden ?? ""); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setNombre(""); setOrden(""); };
  const handleSave = () => {
    if (!nombre.trim()) return Toast.fire({ icon: "warning", title: "Nombre vacío" });
    const ordenValue = orden !== "" ? Number(orden) : undefined;

    if (mode === "crear") {
      crear({ nombre, parent_id: parentId, orden: ordenValue }, { onSuccess: closeModal });
    } else if (currentNode) {
      if (ordenValue !== undefined) {
        const hermanos = data?.flat?.filter(d => d.parent_id === currentNode.parent_id) || [];
        const totalInLevel = hermanos.length;

        if (ordenValue > totalInLevel) {
          return Toast.fire({ icon: "warning", title: `El correlativo máximo permitido es ${totalInLevel}.` });
        }

        const duplicateNode = hermanos.find(
          d => d.id !== currentNode.id && d.orden === ordenValue
        );
        if (duplicateNode) {
          Swal.fire({
            title: "¿Intercambiar posiciones?",
            text: `El correlativo ${ordenValue} ya está asignado a "${duplicateNode.nombre}". ¿Deseas intercambiar sus posiciones?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, intercambiar",
            cancelButtonText: "Cancelar",
            background: document.documentElement.classList.contains('dark') ? '#18181b' : '#fff',
            color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
            confirmButtonColor: '#9333ea',
          }).then((result) => {
            if (result.isConfirmed) {
              intercambiar({
                id1: currentNode.id,
                orden1: ordenValue,
                id2: duplicateNode.id,
                orden2: currentNode.orden ?? 1
              }, {
                onSuccess: () => {
                  Toast.fire({ icon: "success", title: "Posiciones intercambiadas." });
                  if (nombre !== currentNode.nombre) {
                    actualizar({ id: currentNode.id, values: { nombre, parent_id: currentNode.parent_id } }, { onSuccess: closeModal });
                  } else {
                    closeModal();
                  }
                }
              });
            }
          });
          return;
        }
      }
      actualizar({ id: currentNode.id, values: { nombre, parent_id: currentNode.parent_id, orden: ordenValue } }, { onSuccess: closeModal });
    }
  };

  const handleDeleteDepartamento = (id: string) => {
    Swal.fire({
      title: "¿Eliminar Departamento?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      background: document.documentElement.classList.contains('dark') ? '#18181b' : '#fff',
      color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
      showCancelButton: true
    }).then((res) => {
      if (res.isConfirmed) {
        eliminar(id, {
          onError: (err: any) => {
            Swal.fire({
              icon: 'error',
              title: 'No se puede eliminar',
              text: err.message,
              background: document.documentElement.classList.contains('dark') ? '#18181b' : '#fff',
              color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
            });
          }
        });
      }
    });
  }

  if (isLoading) return <div className="p-10 text-center text-zinc-500 animate-pulse">Cargando...</div>;

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">ORGANIZACIÓN</h1>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">Estructura Organizacional</p>
        </div>
        <button onClick={openCreateRoot} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg text-sm font-bold shadow-lg active:scale-95 transition-transform">
          + ESTRUCTURA
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-x-auto">
        <div className="min-w-[650px]">
          <div className="flex justify-between items-center px-4 sm:px-6 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 rounded-t-xl">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Estructura</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Acciones</span>
          </div>
          <div className="flex flex-col">
            {data?.tree?.map((n, index) => (
              <DepartmentItem
                key={n.id} node={n} prefix={`${index + 1}`} depth={0}
                totalSiblings={data.tree.length} onMove={handleMove}
                onAdd={openCreateChild} onEdit={openEdit} onDelete={handleDeleteDepartamento}
                onAsignarPuesto={handleOpenCrearPuesto} onEditPuesto={handleOpenEditarPuesto} onDeletePuesto={handleDeletePuesto}
                onAssignUserToPuesto={handleOpenAssignUser}
              />
            ))}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950/50">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {mode === "crear" ? "Nuevo Departamento" : "Editar Departamento"}
                </h3>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">
                  {mode === "crear" ? "Estructura Organizacional" : "Editar Nombre"}
                </p>
              </div>
              <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 bg-white dark:bg-zinc-900">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Nombre del Departamento
                </label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                  placeholder=""
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
              </div>
              {mode === "editar" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Orden / Correlativo
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={orden}
                    onChange={(e) => setOrden(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                    placeholder=""
                  />
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Cambia el número para reordenar dentro de su nivel.
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
              <button
                onClick={handleSave}
                className="px-6 py-2 rounded-lg text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-md active:scale-95 shadow-purple-900/10 dark:shadow-purple-900/20"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDepa && (
        <ModalPuesto
          isOpen={isPuestoModalOpen}
          onClose={() => setIsPuestoModalOpen(false)}
          departamentoId={selectedDepa.id}
          departamentoNombre={selectedDepa.nombre}
          puestoToEdit={puestoToEdit}
        />
      )}

      {selectedPuestoForAssign && (
        <ModalAsignarUsuario
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          puestoId={selectedPuestoForAssign.id}
          puestoNombre={selectedPuestoForAssign.nombre}
        />
      )}
    </div>
  );
}