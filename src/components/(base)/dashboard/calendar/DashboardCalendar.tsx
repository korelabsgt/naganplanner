"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, User } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/components/(base)/providers/UserProvider";

export interface CalendarEvent {
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type?: "actividad" | "servicio" | "reunion" | "otro";
  modulo?: string;
  isMine?: boolean;
  cargo?: string;
}

interface DashboardCalendarProps {
  initialEvents?: CalendarEvent[];
  canViewAll?: boolean;
}

const DIAS_SEMANA = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const MESES_CORTOS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

function formatHeaderDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const dayName = dayNames[date.getDay()];
  const monthName = MESES[date.getMonth()];
  return `${dayName} ${d} De ${monthName}`;
}

function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const yy = String(y).slice(-2);
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${dd}/${mm}/${yy}`;
}

function getEventUrl(ev: CalendarEvent, isUserAdmin: boolean = false): string {
  if (isUserAdmin) return `/kore/planificador?actividadId=${ev.id}`;
  const mod = (ev.modulo || "").toLowerCase().trim();
  if (mod === "reunion") return `/kore/planificador/reunion?actividadId=${ev.id}`;
  if (mod === "alabanza") return `/kore/planificador/alabanza?actividadId=${ev.id}`;
  if (mod === "danza-damas") return `/kore/planificador/danza-damas?actividadId=${ev.id}`;
  if (mod === "danza-caballeros") return `/kore/planificador/danza-caballeros?actividadId=${ev.id}`;
  if (mod === "multimedia") return `/kore/planificador/multimedia?actividadId=${ev.id}`;
  return `/kore/actividades?actividadId=${ev.id}`;
}

const ITEMS_PER_PAGE = 3;

export function DashboardCalendar({
  initialEvents = [],
  canViewAll: canViewAllProp = false,
}: DashboardCalendarProps) {
  // Detección de rol tanto por servidor como por cliente
  const user = useUser();
  const clientRole = ((user?.user_metadata?.rol as string) || "").toLowerCase().trim();
  const isClientAdmin = ["admin", "super"].includes(clientRole);
  const canViewAll = canViewAllProp || isClientAdmin;

  const hoy = useMemo(() => new Date(), []);
  const todayStr = useMemo(
    () =>
      `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(
        hoy.getDate()
      ).padStart(2, "0")}`,
    [hoy]
  );

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  // Si puede ver todo (admin/super), arranca en TODAS; si no, forzado a MÍAS
  const [filterType, setFilterType] = useState<"TODAS" | "MÍAS">(
    canViewAll ? "TODAS" : "MÍAS"
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setIsPopoverOpen(false);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setIsPopoverOpen(false);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(todayStr);
    setCurrentPage(1);
    setIsPopoverOpen(true);
  };

  // Filtrado de eventos: si no es admin/super/rrhh siempre filtra a sus actividades
  const filteredEvents = useMemo(() => {
    if (!canViewAll || filterType === "MÍAS") {
      return initialEvents.filter((ev) => ev.isMine);
    }
    return initialEvents;
  }, [initialEvents, filterType, canViewAll]);

  // Mapa de eventos por fecha (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach((ev) => {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    });
    return map;
  }, [filteredEvents]);

  // Métricas del mes actual
  const monthStats = useMemo(() => {
    let actividades = 0;
    let servicios = 0;
    filteredEvents.forEach((ev) => {
      const [evY, evM] = ev.date.split("-").map(Number);
      if (evY === year && evM === month + 1) {
        if (ev.type === "servicio") servicios++;
        else actividades++;
      }
    });
    return { actividades, servicios, total: actividades + servicios };
  }, [filteredEvents, year, month]);

  // Cálculo de los días del calendario (grilla de 7 columnas comenzando en Lunes)
  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayIndex = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const totalDays = lastDay.getDate();
    const daysPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: CalendarEvent[];
    }> = [];

    // Días del mes anterior
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = daysPrevMonth - i;
      const prevDate = new Date(year, month - 1, d);
      const str = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dateString: str,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: false,
        events: eventsByDate.get(str) || [],
      });
    }

    // Días del mes actual
    for (let d = 1; d <= totalDays; d++) {
      const str = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dateString: str,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: str === todayStr,
        events: eventsByDate.get(str) || [],
      });
    }

    // Días del próximo mes para completar las semanas (múltiplo de 7, máx 42 filas)
    const remaining = (7 - (cells.length % 7)) % 7;
    const targetLength = cells.length + remaining < 35 ? 35 : cells.length + remaining;
    const fillNeeded = targetLength - cells.length;

    for (let d = 1; d <= fillNeeded; d++) {
      const nextDate = new Date(year, month + 1, d);
      const str = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dateString: str,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: false,
        events: eventsByDate.get(str) || [],
      });
    }

    return cells;
  }, [year, month, eventsByDate, todayStr]);

  // Eventos del día seleccionado y paginación para el popover
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate.get(selectedDate) || [];
  }, [selectedDate, eventsByDate]);

  const totalPages = Math.max(1, Math.ceil(selectedDayEvents.length / ITEMS_PER_PAGE));
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return selectedDayEvents.slice(start, start + ITEMS_PER_PAGE);
  }, [selectedDayEvents, currentPage]);

  const handleDayClick = (dateString: string) => {
    setSelectedDate(dateString);
    setCurrentPage(1);
    setIsPopoverOpen(true);
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Título de sección con viñeta y línea extendida en tono dorado ámbar de la marca */}
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] shrink-0" />
        <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-amber-600 dark:text-amber-400 shrink-0">
          Calendario de Servicios y Reuniones
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-amber-500/40 via-amber-500/10 to-transparent ml-2" />
      </div>

      {/* Contenedor Principal del Calendario */}
      <div className="relative w-full bg-white dark:bg-[#12141a]/95 backdrop-blur-md border border-[#d5cec2] dark:border-border/40 rounded-xl sm:rounded-2xl p-2 sm:p-5 shadow-sm dark:shadow-xl flex flex-col gap-2.5 sm:gap-4">
        {/* Cabecera: Filtros + Selector de Mes */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-[#d5cec2]/60 dark:border-border/30">
          {/* Pastillas de Filtro: Solo si es admin o super sale la opción de alternar 'TODAS' */}
          {canViewAll ? (
            <div className="inline-flex items-center bg-[#faf8f4] dark:bg-black/40 border border-[#d5cec2] dark:border-border/40 rounded-lg p-0.5">
              <button
                onClick={() => setFilterType("TODAS")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  filterType === "TODAS"
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/50 shadow-sm"
                    : "text-[#847563] dark:text-muted-foreground hover:text-[#4a3f36] dark:hover:text-foreground"
                }`}
              >
                TODAS
              </button>
              <button
                onClick={() => setFilterType("MÍAS")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  filterType === "MÍAS"
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/50 shadow-sm"
                    : "text-[#847563] dark:text-muted-foreground hover:text-[#4a3f36] dark:hover:text-foreground"
                }`}
              >
                MÍAS
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 rounded-lg px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              MIS ACTIVIDADES
            </div>
          )}

          {/* Navegación de Mes */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              title="Mes anterior"
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-muted/30 text-[#847563] dark:text-muted-foreground hover:text-[#4a3f36] dark:hover:text-foreground transition-colors"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={goToToday}
              title="Ir al mes actual"
              className="text-xs sm:text-sm font-bold text-[#4a3f36] dark:text-foreground px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-muted/20 transition-colors"
            >
              {MESES_CORTOS[month]} {year}
            </button>

            <button
              onClick={nextMonth}
              title="Mes siguiente"
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-muted/30 text-[#847563] dark:text-muted-foreground hover:text-[#4a3f36] dark:hover:text-foreground transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Resumen de Métricas */}
        <div className="flex items-center justify-center gap-4 text-xs font-medium text-muted-foreground py-0.5">
          <span className="text-blue-600 dark:text-blue-400 font-semibold">
            Reuniones: <span className="text-[#4a3f36] dark:text-foreground">{monthStats.actividades}</span>
          </span>
          <span className="text-[#d5cec2] dark:text-border">•</span>
          <span className="text-amber-600 dark:text-amber-400 font-semibold">
            Servicios: <span className="text-[#4a3f36] dark:text-foreground">{monthStats.servicios}</span>
          </span>
        </div>

        {/* Grilla de Calendario */}
        <div className="border border-[#d5cec2] dark:border-border/30 rounded-xl overflow-hidden bg-[#faf8f4]/60 dark:bg-black/20">
          {/* Fila de días de la semana */}
          <div className="grid grid-cols-7 border-b border-border/30 bg-muted/10 text-center">
            {DIAS_SEMANA.map((dia) => (
              <div
                key={dia}
                className="py-1 sm:py-2 text-[9px] sm:text-xs font-bold text-muted-foreground tracking-wider"
              >
                {dia}
              </div>
            ))}
          </div>

          {/* Celdas de días */}
          <div className="grid grid-cols-7">
            {calendarCells.map((cell, idx) => {
              const isSelected = selectedDate === cell.dateString;
              const hasEvents = cell.events.length > 0;

              return (
                <motion.button
                  key={`${cell.dateString}-${idx}`}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => handleDayClick(cell.dateString)}
                  className={`min-h-[48px] sm:min-h-[66px] p-0.5 sm:p-1.5 flex flex-col justify-between items-center sm:items-start text-left border-b border-r border-[#d5cec2]/60 dark:border-border/20 transition-all group relative cursor-pointer ${
                    idx % 7 === 6 ? "border-r-0" : ""
                  } ${
                    cell.isCurrentMonth
                      ? "hover:bg-amber-500/10 dark:hover:bg-amber-950/20"
                      : "opacity-35 hover:opacity-60 bg-black/[0.03] dark:bg-black/20"
                  } ${
                    isSelected ? "bg-amber-500/10 ring-1 ring-inset ring-amber-500/60" : ""
                  }`}
                >
                  {/* Número del día */}
                  <div className="w-full flex justify-between items-start">
                    {cell.isToday ? (
                      <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-500 text-white font-bold text-[10px] sm:text-xs flex items-center justify-center shadow-md shadow-red-500/40">
                        {cell.dayNumber}
                      </span>
                    ) : (
                      <span
                        className={`text-xs font-semibold px-1 py-0.5 rounded ${
                          cell.isCurrentMonth ? "text-[#4a3f36] dark:text-foreground" : "text-[#847563]/60 dark:text-muted-foreground/60"
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                    )}
                  </div>

                  {/* Indicador de Eventos / Barra colorida interactiva */}
                  {hasEvents && (
                    <div className="w-full mt-1 flex items-center gap-1 group-hover:scale-105 transition-transform">
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        {cell.events.length}
                      </span>
                      <div className="h-1.5 sm:h-2 flex-1 rounded-full bg-amber-500" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* POPOVER SUPERPUESTO (Efecto burbuja elástica estilo macOS) */}
        <AnimatePresence>
          {isPopoverOpen && selectedDate && (
            <>
              {/* Overlay oscuro para cerrar al pulsar fuera */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-[3px] rounded-2xl z-20 transition-opacity"
                onClick={() => setIsPopoverOpen(false)}
              />

              {/* Tarjeta flotante superpuesta estilo burbuja macOS */}
              <motion.div
                initial={{ opacity: 0, scale: 0.72, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.76,
                  y: 12,
                  transition: { duration: 0.15, ease: "easeIn" },
                }}
                transition={{
                  type: "spring",
                  stiffness: 440,
                  damping: 25,
                  mass: 0.8,
                }}
                className="absolute inset-x-0.5 sm:inset-x-4 top-1 sm:top-3 z-30 bg-white dark:bg-[#12141a]/96 backdrop-blur-2xl border border-[#d5cec2] dark:border-white/10 rounded-2xl sm:rounded-3xl px-1.5 py-2.5 sm:p-5 shadow-2xl flex flex-col gap-2.5 sm:gap-3 ring-1 ring-black/5 dark:ring-white/5"
              >
                {/* Cabecera del popover con fecha formateada en azul y botón cerrar */}
                <div className="flex items-center justify-between px-1 pb-2 border-b border-[#d5cec2]/60 dark:border-border/30">
                  <h3 className="text-sm sm:text-base font-bold text-sky-600 dark:text-sky-400">
                    {formatHeaderDate(selectedDate)}
                  </h3>
                  <button
                    onClick={() => setIsPopoverOpen(false)}
                    className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 active:scale-90 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Lista de eventos del día */}
                <div className="flex flex-col gap-2 min-h-[140px] justify-center w-full">
                  {selectedDayEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground text-xs italic">
                      No hay actividades programadas para esta fecha.
                    </div>
                  ) : (
                    paginatedEvents.map((ev, itemIdx) => (
                      <motion.div
                        key={ev.id}
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: itemIdx * 0.04, duration: 0.2 }}
                        className="w-full flex items-start justify-between gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-black/40 border border-white/5 hover:border-amber-500/40 transition-colors shadow-sm"
                      >
                        {/* Línea de acento ámbar dorado a la izquierda */}
                        <div className="w-1 self-stretch rounded-full bg-amber-500 shrink-0" />

                        {/* Contenido: Título, Subtítulo y Badge */}
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                            {ev.title}
                          </h4>
                          {ev.subtitle && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {ev.subtitle}
                            </p>
                          )}
                          <div className="mt-1 sm:mt-1.5 flex items-center gap-1 sm:gap-1.5 flex-wrap">
                            {ev.category && (
                              <span className="inline-block px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase">
                                {ev.category}
                              </span>
                            )}
                            {ev.cargo && (
                              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold tracking-wide bg-neutral-800 text-amber-200 border border-amber-500/25">
                                <User size={10} className="text-amber-400 shrink-0" />
                                <span>{ev.cargo}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Lado derecho: Fecha y hora arriba, y botón IR abajo */}
                        <div className="flex flex-col items-end justify-between self-stretch shrink-0 gap-1.5 sm:gap-2">
                          <div className="text-[10px] sm:text-[11px] font-medium text-muted-foreground text-right whitespace-nowrap">
                            {ev.time
                              ? `${formatShortDate(ev.date)} · ${ev.time}`
                              : formatShortDate(ev.date)}
                          </div>

                          <Link
                            href={getEventUrl(ev, canViewAll)}
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 sm:px-4 py-1 sm:py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 border border-amber-400/50 rounded-lg text-[11px] sm:text-xs font-black tracking-wider transition-all shadow-md shadow-amber-900/30 flex items-center justify-center cursor-pointer active:scale-95 z-10"
                          >
                            IR
                          </Link>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* Paginador inferior (solo si hay más de 3 eventos) */}
                {selectedDayEvents.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-center gap-6 text-xs font-semibold text-muted-foreground pt-2 border-t border-border/30">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                    >
                      <ChevronLeft size={14} /> ANT.
                    </button>
                    <span className="text-foreground tracking-widest font-mono text-[11px]">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                    >
                      SIG. <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
