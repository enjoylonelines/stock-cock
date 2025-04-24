import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface DrawerViewProps {
  children: React.ReactNode;
  isVisible: boolean;
  className?: string;
}

export default function DrawerView({ children, isVisible, className }: DrawerViewProps) {
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.2 }}
          className={cn("absolute inset-0 bg-background", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
