"use client";

import { motion } from "framer-motion";
import { cn } from "../lib/utils";

export default function AnimatedCard({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45 }}
      className={cn(
        "card-surface rounded-3xl p-6 transition duration-300 hover:-translate-y-1 hover:shadow-glow",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
