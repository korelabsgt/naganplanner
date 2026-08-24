"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useUser } from "@/components/(base)/providers/UserProvider";
import { useMemo, Suspense } from "react";

function BreadcrumbNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const from = searchParams.get("from");

  const user = useUser();
  const metadata = (user as any)?.raw_user_meta_data || user?.user_metadata || {};
  const userRole = metadata.rol || "user";
  const isManagement = ["super", "admin", "rrhh"].includes(userRole);

  // Si estamos en el home, no renderizamos nada
  if (pathname === "/kore") return null;

  let segments = pathname.split("/").filter((item) => item !== "");

  // Si venimos del planificador a ver estadísticas, sobrescribimos los segmentos para que parezca que sigue ahí
  if (from === "planificador" && pathname === "/kore/reportes/alabanzas") {
    segments = ["kore", "planificador", "alabanza", "estadísticas"];
  }

  // Calcular la ruta padre para el botón de atrás
  const parentPath = useMemo(() => {
    if (segments.length <= 1) return "/kore";
    
    // Si estamos en una subruta de planificador (ej: /kore/planificador/alabanza)
    // El padre directo sería /kore/planificador
    const directParent = segments[segments.length - 2];
    
    if (directParent === "planificador" && !isManagement) {
      // Para usuarios normales, saltamos el planificador global y volvemos al Home
      return "/kore";
    }

    return `/${segments.slice(0, -1).join("/")}`;
  }, [segments, isManagement]);

  return (
    <div className="w-full border-t border-border/50 bg-background/50 backdrop-blur-md px-4 sm:px-8 lg:px-12 py-4 flex items-center overflow-x-auto custom-scrollbar">
      <LayoutGroup id="breadcrumb">
        <motion.div
          layout
          className="flex items-center gap-2 text-[9px] md:text-base font-medium text-muted-foreground overflow-hidden"
        >
        {/* Botón Atrás (Izquierda de la casita) */}
        <motion.div layout="position">
          <Link
            href={parentPath}
            className="group flex items-center justify-center hover:text-foreground transition-colors cursor-pointer mr-1"
            title="Atrás"
          >
            <ArrowLeft className="size-4 md:size-5 transition-transform group-hover:-translate-x-1" />
          </Link>
        </motion.div>

        {/* Icono Home */}
        <motion.div layout="position" className="flex items-center">
          <Link
            href="/kore"
            className="hover:text-foreground transition-colors p-1 shrink-0 flex items-center"
          >
            <Home className="size-4 md:size-5" />
          </Link>
        </motion.div>

        {/* Segmentos de Ruta */}
        <div className="flex items-center gap-1 overflow-hidden mask-gradient">
          <AnimatePresence mode="popLayout" initial={false}>
            {segments.map((segment, index) => {
              // Omitir 'kore' (home) para todos. 
              // Omitir 'planificador' SOLO para usuarios que no son administración/jefes.
              if (segment === "kore") return null;
              if (segment === "planificador" && !isManagement) return null;

              const href = `/${segments.slice(0, index + 1).join("/")}`;
              const isLast = index === segments.length - 1;

              return (
                <motion.div
                  layout="position"
                  key={href} // La key es vital: URL única
                  initial={{ opacity: 0, x: 10, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 0.9,
                    transition: { duration: 0.15 },
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 25,
                    mass: 1,
                  }}
                  className="flex items-center gap-1 shrink-0 whitespace-nowrap"
                >
                  <ChevronRight className="size-4 md:size-5 text-muted-foreground/40 shrink-0" />
                  <Link
                    href={href}
                    className={`capitalize hover:text-foreground transition-colors truncate ${
                      isLast
                        ? "text-foreground underline underline-offset-4 pointer-events-none text-xs md:text-lg"
                        : ""
                    }`}
                  >
                    {segment.replace(/-/g, " ")}
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>
      </LayoutGroup>
    </div>
  );
}

export function BreadcrumbNav() {
  return (
    <Suspense fallback={null}>
      <BreadcrumbNavContent />
    </Suspense>
  );
}
