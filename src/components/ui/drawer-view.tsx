import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, RefObject } from "react";

interface DrawerViewProps {
  children: React.ReactNode;
  isVisible: boolean;
  className?: string;
  scrollRef?: RefObject<HTMLDivElement | null>;
}

export default function DrawerView({ children, isVisible, className, scrollRef }: DrawerViewProps) {
  const localRef = useRef<HTMLDivElement>(null);
  const ref = scrollRef ?? localRef;

  useEffect(() => {
    if (isVisible && ref.current) {
      ref.current.scrollTop = 0;
    }
  }, [isVisible, ref]);

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.2 }}
          className={cn("overflow-y-auto absolute inset-0 h-full bg-background", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
