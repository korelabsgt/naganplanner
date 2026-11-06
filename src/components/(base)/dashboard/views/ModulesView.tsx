"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TODOS_LOS_MODULOS, Rol } from "../constants";
import { ModuleCard } from "../modules/ModuleCard";
import ModuleAccordion from "../modules/ModuleAccordion";
import { useUser } from "@/components/(base)/providers/UserProvider";
import { useProfile } from "@/components/(base)/(users)/profile/lib/hooks";

interface ModulesViewProps {
  rol?: Rol | null;
  isJefe?: boolean;
}

export function ModulesView({ rol, isJefe = false }: ModulesViewProps) {
  const [loadingModule, setLoadingModule] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const shouldHide = (group: string) => isMobile && expandedGroup && expandedGroup !== group;
  
  const user = useUser();
  const { profile } = useProfile(user?.id ?? "", !!user?.id);

  const modulosVisibles = useMemo(() => {
    return TODOS_LOS_MODULOS.filter((mod) => {
      // Restricción por género solo para usuarios estándar
      if (rol === "user") {
        const generoStr = (profile?.genero as string)?.trim().toLowerCase();
        if (mod.id === "DANZA_DAMAS" && generoStr !== "femenino") return false;
        if (mod.id === "DANZA_CABALLEROS" && generoStr !== "masculino") return false;
      }

      if (mod.soloJefe && !isJefe) return false;
      if (mod.rolesPermitidos === "TODOS") return true;
      if (!rol) return false;
      return mod.rolesPermitidos.includes(rol);
    });
  }, [rol, isJefe, profile]);

  const modulosMinisteriales = useMemo(
    () => modulosVisibles.filter((m) => m.subgrupo === "Organización Ministerial"),
    [modulosVisibles]
  );

  const modulosPlanificacion = useMemo(
    () => modulosVisibles.filter((m) => m.subgrupo === "Planificación de Servicio"),
    [modulosVisibles]
  );

  const modulosFormacion = useMemo(
    () => modulosVisibles.filter((m) => m.subgrupo === "Formación Espiritual"),
    [modulosVisibles]
  );

  if (modulosVisibles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground text-sm">
          No tienes módulos disponibles para tu rol.
        </p>
      </div>
    );
  }

  const tieneIzquierda = modulosMinisteriales.length > 0 || modulosFormacion.length > 0;
  const tieneDerecha = modulosPlanificacion.length > 0;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Título de sección inspirado en la referencia con viñeta y línea extendida */}
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] shrink-0" />
        <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-blue-400 shrink-0">
          Módulos de Gestión
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-blue-500/40 via-blue-500/10 to-transparent ml-2" />
      </div>

      {/* Grilla que conserva exactamente las dos columnas (Columna 1: Organización y Formación / Columna 2: Planificación) */}
      <div
        className={`grid grid-cols-1 ${
          tieneIzquierda && tieneDerecha ? "md:grid-cols-2" : ""
        } gap-4 sm:gap-6 items-start`}
      >
        {/* Subcolumna 1: Organización Ministerial y Formación Espiritual */}
        {tieneIzquierda && (
          <div className="flex flex-col gap-4 sm:gap-6">
            <AnimatePresence mode="popLayout">
              {/* Categoría: Organización Ministerial */}
              {modulosMinisteriales.length > 0 && !shouldHide("Ministerial") && (
                <motion.div
                  key="ministerial"
                  layout
                  initial={{ opacity: 0, scale: 0.95, height: 0 }}
                  animate={{ opacity: 1, scale: 1, height: "auto" }}
                  exit={{ opacity: 0, scale: 0.95, height: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  <ModuleAccordion
                    titulo="Organización Ministerial"
                    descripcion="Estructura organizacional y departamentos"
                    iconKey="unfvchvi"
                    isOpen={expandedGroup === "Ministerial"}
                    onToggle={() =>
                      setExpandedGroup(expandedGroup === "Ministerial" ? null : "Ministerial")
                    }
                  >
                    {modulosMinisteriales.map((mod) => (
                      <ModuleCard
                        key={mod.id}
                        modulo={mod}
                        loadingModule={loadingModule}
                        setLoadingModule={setLoadingModule}
                      />
                    ))}
                  </ModuleAccordion>
                </motion.div>
              )}

              {/* Categoría: Formación Espiritual */}
              {modulosFormacion.length > 0 && !shouldHide("Formacion") && (
                <motion.div
                  key="formacion"
                  layout
                  initial={{ opacity: 0, scale: 0.95, height: 0 }}
                  animate={{ opacity: 1, scale: 1, height: "auto" }}
                  exit={{ opacity: 0, scale: 0.95, height: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  <ModuleAccordion
                    titulo="Formación Espiritual"
                    descripcion="Escuelas de Aprendizaje Espiritual"
                    iconKey="freytsxj"
                    isOpen={expandedGroup === "Formacion"}
                    onToggle={() =>
                      setExpandedGroup(expandedGroup === "Formacion" ? null : "Formacion")
                    }
                  >
                    {modulosFormacion.map((mod) => (
                      <ModuleCard
                        key={mod.id}
                        modulo={mod}
                        loadingModule={loadingModule}
                        setLoadingModule={setLoadingModule}
                      />
                    ))}
                  </ModuleAccordion>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Subcolumna 2: Planificación de Servicio */}
        {tieneDerecha && (
          <div className="flex flex-col gap-4 sm:gap-6">
            <AnimatePresence mode="popLayout">
              {/* Categoría: Planificación de Servicio */}
              {modulosPlanificacion.length > 0 && !shouldHide("Planificacion") && (
                <motion.div
                  key="planificacion"
                  layout
                  initial={{ opacity: 0, scale: 0.95, height: 0 }}
                  animate={{ opacity: 1, scale: 1, height: "auto" }}
                  exit={{ opacity: 0, scale: 0.95, height: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  <ModuleAccordion
                    titulo="Planificación de Servicio"
                    descripcion="Gestión de actividades y departamentos operativos"
                    iconKey="ctuxkbtj"
                    isOpen={expandedGroup === "Planificacion"}
                    onToggle={() =>
                      setExpandedGroup(expandedGroup === "Planificacion" ? null : "Planificacion")
                    }
                  >
                    {modulosPlanificacion.map((mod) => (
                      <ModuleCard
                        key={mod.id}
                        modulo={mod}
                        loadingModule={loadingModule}
                        setLoadingModule={setLoadingModule}
                      />
                    ))}
                  </ModuleAccordion>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
