import React from "react";
import clsx from "clsx";

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={clsx(
      "rounded-xl border border-black/5 bg-white/80 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-black/60",
      className
    )}
    {...props}
  />
);
