import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { type RefObject, useEffect, useRef } from "react";

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

  // DrawerView가 열릴 때 부모 스크롤 컨테이너의 스크롤 막기
  useEffect(() => {
    if (isVisible && scrollRef?.current) {
      const parent = scrollRef.current;
      const originalOverflow = parent.style.overflow;
      parent.style.overflow = "hidden";

      return () => {
        parent.style.overflow = originalOverflow;
      };
    }
  }, [isVisible, scrollRef]);

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.2 }}
          className={cn("overflow-y-auto absolute inset-0 z-10 w-full h-full bg-background", className)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            height: "100%",
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
