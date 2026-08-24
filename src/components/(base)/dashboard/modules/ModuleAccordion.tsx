"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import AnimatedIcon from "@/components/ui/AnimatedIcon";

interface ModuleAccordionProps {
  titulo: string;
  descripcion?: string;
  iconKey?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function ModuleAccordion({
  titulo,
  descripcion,
  iconKey,
  children,
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onToggle,
}: ModuleAccordionProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    }
    if (!isControlled) {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={handleToggle}
        className="flex items-center justify-between w-full px-6 py-5 text-left group transition-all bg-card/40 hover:bg-card/60 border border-border/40 rounded-2xl shadow-sm"
      >
        <div className="flex items-center gap-5">
          {iconKey && (
            <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center shrink-0">
              <AnimatedIcon iconKey={iconKey} className="w-8 h-8" />
            </div>
          )}
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-foreground">
              {titulo}
            </h2>
            {descripcion && (
              <p className="text-xs text-muted-foreground leading-snug">
                {descripcion}
              </p>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground group-hover:text-foreground pr-1"
        >
          <ChevronDown size={24} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-3 pb-4 px-4 sm:px-6 mx-auto w-[98%] sm:w-[96%]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
