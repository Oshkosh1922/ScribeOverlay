import React from "react";
import clsx from "clsx";

export const Pill: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({ className, ...props }) => (
  <span
    className={clsx(
      "inline-flex items-center rounded-full border border-gray-200 bg-white/60 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-700 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/10 dark:text-gray-100",
      className
    )}
    {...props}
  />
);
