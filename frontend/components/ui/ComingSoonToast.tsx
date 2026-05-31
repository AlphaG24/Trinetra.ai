"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ComingSoonToast() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor && anchor.getAttribute('href') === '#') {
        e.preventDefault();
        
        // Don't trigger if it's already visible to prevent spam resetting
        setIsVisible(true);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
          setIsVisible(false);
        }, 3000);
      }
    };

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 20, x: "-50%" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-[24px] left-1/2 z-[9999] px-[24px] py-[12px] rounded-[10px] bg-[#130224] border border-[#2D1255] shadow-[0_10px_40px_rgba(0,0,0,0.5)] font-sans font-normal text-[14px] text-[#A8A0C0] pointer-events-none whitespace-nowrap"
        >
          Coming soon! We're working on it.
        </motion.div>
      )}
    </AnimatePresence>
  );
}
