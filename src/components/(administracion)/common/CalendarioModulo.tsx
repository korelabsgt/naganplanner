"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import { motion } from "framer-motion";

export interface CalendarioModuloProps {
  mes: number; // 0 - 11
  anio: number;
  onMesChange: (mes: number, anio: number) => void;
  diaSeleccionado: string | null; // "YYYY-MM-DD" o null
  onDiaSelect: (dia: string | null) => void;
  eventosPorFecha: Map<string, number>; // fecha "YYYY-MM-DD" => cantidad de actividades
  canViewAll?: boolean;
  filtroVista?: "TODAS" | "MÍAS";
  onFiltroVistaChange?: (v: "TODAS" | "MÍAS") => void;
  stats?: {
    servicios: number;
    actividades?: number;
    reuniones?: number;
  };
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

export default function CalendarioModulo({
  mes,
  anio,
  onMesChange,
  diaSeleccionado,
  onDiaSelect,
  eventosPorFecha,
  canViewAll = false,
  filtroVista = "TODAS",
  onFiltroVistaChange,
  stats,
}: CalendarioModuloProps) {
  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Guatemala',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }, []);

  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerAnio, setPickerAnio] = useState(anio);

  const prevMonth = () => {
    if (mes === 0) onMesChange(11, anio - 1);
    else onMesChange(mes - 1, anio);
  };

  const nextMonth = () => {
    if (mes === 11) onMesChange(0, anio + 1);
    else onMesChange(mes + 1, anio);
  };

  const goToToday = () => {
    const [y, m] = todayStr.split('-').map(Number);
    onMesChange(m - 1, y);
    onDiaSelect(todayStr);
  };

  // Cálculo de las celdas del mes (cuadrícula de 7 columnas comenzando en lunes)
  const calendarCells = useMemo(() => {
    const firstDay = new Date(anio, mes, 1);
    const lastDay = new Date(anio, mes + 1, 0);

    const startDayIndex = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const totalDays = lastDay.getDate();
    const daysPrevMonth = new Date(anio, mes, 0).getDate();

    const cells: Array<{
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      eventCount: number;
    }> = [];

    // Días del mes anterior
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = daysPrevMonth - i;
      const prevDate = new Date(anio, mes - 1, d);
      const str = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dateString: str,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: false,
        eventCount: eventosPorFecha.get(str) || 0,
      });
    }

    // Días del mes actual
    for (let d = 1; d <= totalDays; d++) {
      const str = `${anio}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dateString: str,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: str === todayStr,
        eventCount: eventosPorFecha.get(str) || 0,
      });
    }

    // Días del próximo mes para completar semanas
    const remaining = (7 - (cells.length % 7)) % 7;
    const targetLength = cells.length + remaining < 35 ? 35 : cells.length + remaining;
    const fillNeeded = targetLength - cells.length;

    for (let d = 1; d <= fillNeeded; d++) {
      const nextDate = new Date(anio, mes + 1, d);
      const str = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dateString: str,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: false,
        eventCount: eventosPorFecha.get(str) || 0,
      });
    }

    return cells;
  }, [anio, mes, eventosPorFecha, todayStr]);

  const handleCellClick = (dateString: string) => {
    if (diaSeleccionado === dateString) {
      onDiaSelect(null); // Deseleccionar para ver todo el mes
    } else {
      onDiaSelect(dateString);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between bg-white dark:bg-[#12141a]/95 backdrop-blur-md border border-[#d5cec2] dark:border-border/40 rounded-2xl p-1.5 sm:p-5 shadow-sm dark:shadow-xl font-sans min-h-[540px]">
      {/* Barra superior del calendario: Filtro de Vista (Todas/Mías) + Navegación de Mes */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#d5cec2]/60 dark:border-border/30">
        {/* Toggle para Admin/Super: TODAS / MÍAS */}
        {canViewAll && onFiltroVistaChange ? (
          <div className="inline-flex items-center bg-[#faf8f4] dark:bg-black/40 border border-[#d5cec2] dark:border-border/40 rounded-lg p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onFiltroVistaChange("TODAS")}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                filtroVista === "TODAS"
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/50 shadow-sm"
                  : "text-[#847563] dark:text-muted-foreground hover:text-[#4a3f36] dark:hover:text-foreground"
              }`}
            >
              TODAS
            </button>
            <button
              type="button"
              onClick={() => onFiltroVistaChange("MÍAS")}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                filtroVista === "MÍAS"
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/50 shadow-sm"
                  : "text-[#847563] dark:text-muted-foreground hover:text-[#4a3f36] dark:hover:text-foreground"
              }`}
            >
              MÍAS
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
            <CalendarIcon size={14} className="text-amber-500" />
            <span>CALENDARIO</span>
          </div>
        )}

        {/* Navegador de Mes / Año con Popover */}
        <div className="relative flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={prevMonth}
            title="Mes anterior"
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-muted/30 text-[#847563] dark:text-muted-foreground hover:text-[#4a3f36] dark:hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            onClick={() => {
              setPickerAnio(anio);
              setIsMonthPickerOpen(!isMonthPickerOpen);
            }}
            title="Seleccionar mes y año"
            className="flex items-center gap-1 text-xs sm:text-sm font-bold text-[#4a3f36] dark:text-foreground px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-muted/20 transition-colors cursor-pointer group"
          >
            <span>{MESES[mes]} {anio}</span>
            <ChevronDown size={14} className={`text-muted-foreground group-hover:text-amber-400 transition-transform duration-200 ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
          </button>

          <button
            type="button"
            onClick={nextMonth}
            title="Mes siguiente"
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-muted/30 text-[#847563] dark:text-muted-foreground hover:text-[#4a3f36] dark:hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>

          {/* POPOVER SELECTOR DE MES Y AÑO */}
          {isMonthPickerOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMonthPickerOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 sm:w-60 max-w-[calc(100vw-32px)] bg-white dark:bg-[#161820] border border-[#d5cec2] dark:border-border/60 rounded-2xl shadow-2xl p-3 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                {/* Cabecera del Popover: Año con flechas */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#d5cec2]/60 dark:border-border/30">
                  <button
                    type="button"
                    onClick={() => setPickerAnio(prev => prev - 1)}
                    className="p-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="font-bold text-[#4a3f36] dark:text-foreground text-sm font-mono tracking-wider">
                    {pickerAnio}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPickerAnio(prev => prev + 1)}
                    className="p-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>

                {/* Grilla 3x4 de los 12 meses */}
                <div className="grid grid-cols-3 gap-1.5">
                  {MESES_CORTOS.map((nombreMesCorto, index) => {
                    const isSelected = mes === index && anio === pickerAnio;
                    return (
                      <button
                        key={nombreMesCorto}
                        type="button"
                        onClick={() => {
                          onMesChange(index, pickerAnio);
                          setIsMonthPickerOpen(false);
                        }}
                        className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                          isSelected
                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/50 shadow-sm"
                            : "text-[#4a3f36] dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
                        }`}
                      >
                        {nombreMesCorto}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Resumen / Métricas del mes si están disponibles */}
      {stats && (
        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground px-1">
          <span className="text-blue-600 dark:text-blue-400 font-semibold">
            {stats.reuniones !== undefined ? 'Reuniones:' : 'Actividades:'}{' '}
            <span className="text-[#4a3f36] dark:text-foreground">{stats.reuniones ?? stats.actividades}</span>
          </span>
          <span className="text-[#d5cec2] dark:text-border">•</span>
          <span className="text-amber-600 dark:text-amber-400 font-semibold">
            Servicios: <span className="text-[#4a3f36] dark:text-foreground">{stats.servicios}</span>
          </span>
        </div>
      )}

      {/* Cuadrícula del Calendario */}
      <div className="border border-[#d5cec2] dark:border-border/30 rounded-xl overflow-hidden bg-[#faf8f4]/60 dark:bg-black/20 flex-1 flex flex-col">
        {/* Encabezado Días de la semana */}
        <div className="grid grid-cols-7 border-b border-[#d5cec2] dark:border-border/30 bg-[#f5f0e6]/70 dark:bg-muted/10 text-center shrink-0">
          {DIAS_SEMANA.map((dia) => (
            <div
              key={dia}
              className="py-1.5 text-[10px] sm:text-xs font-bold text-[#847563] dark:text-muted-foreground tracking-wider"
            >
              {dia}
            </div>
          ))}
        </div>

        {/* Días */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr">
          {calendarCells.map((cell, idx) => {
            const isSelected = diaSeleccionado === cell.dateString;
            const hasEvents = cell.eventCount > 0;

            return (
              <motion.button
                type="button"
                key={`${cell.dateString}-${idx}`}
                whileTap={{ scale: 0.93 }}
                onClick={() => handleCellClick(cell.dateString)}
                className={`min-h-[52px] sm:min-h-[60px] h-full p-1.5 sm:p-2 flex flex-col justify-between items-start text-left border-b border-r border-[#d5cec2]/60 dark:border-border/20 transition-all group relative cursor-pointer ${
                  idx % 7 === 6 ? "border-r-0" : ""
                } ${
                  cell.isCurrentMonth
                    ? "hover:bg-amber-500/10 dark:hover:bg-amber-950/20"
                    : "opacity-35 hover:opacity-60 bg-black/[0.03] dark:bg-black/20"
                } ${
                  isSelected ? "bg-amber-500/15 ring-1 ring-inset ring-amber-500/80 shadow-sm" : ""
                }`}
              >
                {/* Número del día */}
                <div className="w-full flex justify-between items-start">
                  {cell.isToday ? (
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white font-bold text-[10px] flex items-center justify-center shadow-md shadow-red-500/40">
                      {cell.dayNumber}
                    </span>
                  ) : (
                    <span
                      className={`text-xs sm:text-sm font-bold px-0.5 rounded ${
                        cell.isCurrentMonth ? "text-[#4a3f36] dark:text-foreground" : "text-[#847563]/60 dark:text-muted-foreground/60"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                  )}
                </div>

                {/* Barra sólida sin brillo (como pidió el usuario) */}
                {hasEvents && (
                  <div className="w-full mt-0.5 flex items-center gap-1 group-hover:scale-105 transition-transform">
                    <span className="text-[10px] sm:text-xs font-bold text-amber-700 dark:text-amber-300">
                      {cell.eventCount}
                    </span>
                    <div className="h-1.5 sm:h-2 flex-1 rounded-full bg-amber-500 shadow-sm" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
