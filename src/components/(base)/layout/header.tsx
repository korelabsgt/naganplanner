"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@/components/(base)/providers/UserProvider";
import {
  Menu,
  X,
  Users,
  CarFront,
  Info,
  PhoneCall,
  LayoutGrid,
  LogIn,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { AuroraText } from "@/components/ui/aurora-text";
import { PushNotificationToggle } from "@/components/ui/PushNotificationToggle";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { getSimulatedRoleState, setSimulatedRole } from "@/lib/auth-role-actions";


export default function Header() {
  const user = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [simulationState, setSimulationState] = useState<{
    canSimulate: boolean;
    realRole: string;
    effectiveRole: string;
  }>({
    canSimulate: false,
    realRole: "user",
    effectiveRole: "user",
  });
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  useEffect(() => {
    if (user) {
      getSimulatedRoleState().then((res) => {
        setSimulationState(res);
      });
    }
  }, [user]);

  const handleRoleChange = async (newRole: string) => {
    setIsUpdatingRole(true);
    await setSimulatedRole(newRole);
    window.location.reload();
  };

  useEffect(() => {
    console.log("Header (desde Context):", user);
  }, [user]);

  const metadata = (user as any)?.raw_user_meta_data || user?.user_metadata || {};

  const userRole = metadata.rol || "user";
  const username = metadata.nombre || user?.email?.split("@")[0] || "Invitado";

  const initial = username.charAt(0).toUpperCase();
  const activeRole = simulationState.canSimulate ? simulationState.effectiveRole : userRole;
  const canManageProfiles = ["super", "admin"].includes(activeRole);

  const publicLinks = [
    { href: "#inventory", label: "Inventory", icon: CarFront },
    { href: "#services", label: "Services", icon: LayoutGrid },
    { href: "#about", label: "About Us", icon: Info },
    { href: "#contact", label: "Contact", icon: PhoneCall },
  ];

  return (
    <>
      <header className="w-full bg-background transition-all border-b border-border/50">
        <div className="mx-auto flex h-24 items-center justify-between pl-3 sm:pl-6 lg:pl-12 pr-2 sm:pr-4 lg:pr-8">
          <div className="flex items-center h-full">
            <Link
              href={user ? "/kore" : "/"}
              className="flex items-center h-full py-2 group"
            >
              <div className="flex items-center gap-2 sm:gap-4">
                <img
                  src="/icon.png"
                  alt="Nagan Planner Logo"
                  className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded-xl border border-white/10 shadow-sm transition-all group-hover:shadow-[#d6a738]/20 group-hover:border-[#d6a738]/30"
                />
                <BrandLogo className="flex" />
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            <RefreshButton />
            <PushNotificationToggle />
            <AnimatedThemeToggler />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center justify-center rounded-xl p-2 text-foreground hover:bg-muted/50 border border-border/50 cursor-pointer"
            >
              {isOpen ? (
                <X className="h-[22.8px] w-[22.8px]" />
              ) : (
                <Menu className="h-[22.8px] w-[22.8px]" />
              )}
            </button>
          </div>
        </div>
        
        {user && <BreadcrumbNav />}
      </header>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full sm:w-100 bg-background/95 backdrop-blur-2xl border-l border-border/50 transition-transform duration-500 overflow-y-auto shadow-2xl",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex justify-end p-6">
          <button
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center rounded-xl p-2.5 text-foreground hover:bg-muted/50 border border-border/50 cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-col min-h-[calc(100%-80px)] px-6 pb-8">
          {user ? (
            <>
              <div className="mb-8 p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-3 select-none">
                  <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary uppercase shrink-0">
                    {initial}
                  </div>
                  <div className="text-left overflow-hidden">
                    <p className="text-sm font-bold text-foreground leading-none truncate">
                      Usuario: <span className="underline">{username}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium truncate mt-1 flex items-center gap-1.5 flex-wrap">
                      <span>Rol: <span className="underline">{userRole}</span></span>
                      {simulationState.canSimulate && simulationState.effectiveRole !== "super" && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/40">
                          Simulando: {simulationState.effectiveRole.toUpperCase()}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <nav className="flex flex-col gap-6 mb-8 pl-2">
                {canManageProfiles && (
                  <Link
                    href="/kore/users/"
                    onClick={() => setIsOpen(false)}
                    className="w-fit text-lg font-bold text-muted-foreground hover:text-foreground transition-colors relative group flex items-center gap-2"
                  >
                    <Users className="size-5" />
                    <span>Gestionar usuarios</span>
                    <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-primary transition-all group-hover:w-full" />
                  </Link>
                )}
              </nav>
            </>
          ) : (
            <>
              <div className="mb-8">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 text-sm font-bold w-full hover:opacity-90 transition-all"
                >
                  <span>Iniciar Sesión</span>
                  <LogIn className="size-4" />
                </Link>
              </div>

              <nav className="flex flex-col gap-6 mb-8 pl-2">
                {publicLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="w-fit text-lg font-bold text-muted-foreground hover:text-foreground transition-colors relative group"
                  >
                    {link.label}
                    <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-primary transition-all group-hover:w-full" />
                  </Link>
                ))}
              </nav>
            </>
          )}

          <div className="mt-auto pt-6 border-t border-border/40">
            <div className="flex flex-col space-y-4">
              {simulationState.canSimulate && (
                <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/30 shadow-inner">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                      <ShieldAlert size={15} className="shrink-0" />
                      <span>Simulador de Roles</span>
                    </div>
                    {simulationState.effectiveRole !== "super" && (
                      <button
                        type="button"
                        disabled={isUpdatingRole}
                        onClick={() => handleRoleChange("super")}
                        className="text-[10px] text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer disabled:opacity-50"
                      >
                        Restaurar SUPER
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground mb-2">
                    Prueba cómo ve y opera la plataforma cada rol:
                  </p>

                  <div className="relative">
                    <select
                      disabled={isUpdatingRole}
                      value={simulationState.effectiveRole}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-neutral-900 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer appearance-none transition-all disabled:opacity-50"
                    >
                      <option value="super">👑 Super Administrador (Real)</option>
                      <option value="admin">🛡️ Administrador (Admin)</option>
                      <option value="user">👤 Miembro / Usuario Regular</option>
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-amber-400">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>
              )}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="text-center space-y-1 pt-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <span className="opacity-40 flex items-center gap-1">
                    <AuroraText variant="gold">©️</AuroraText> 2026
                  </span>
                  <AuroraText variant="gold">Nagan</AuroraText>
                  <AuroraText variant="planner">Planner</AuroraText>
                  <span className="opacity-40">™️</span>
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                  Sistema de Gestión Ministerial Modular
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest">
                  Powered by{" "}
                  <a
                    href="https://www.oscar27jimenez.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline cursor-pointer transition-all inline-block"
                  >
                    <AuroraText>Kore | ingeniería de software</AuroraText>
                  </a>
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}