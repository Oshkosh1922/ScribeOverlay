import React from "react";
import clsx from "clsx";

export const SectionHeader: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div className="mb-3 flex items-center justify-between">
    <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-300">{title}</h3>
    {action}
  </div>
);

export const Section: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={clsx("rounded-lg border border-white/10 bg-white/60 p-4 shadow-sm backdrop-blur-sm dark:bg-white/5", className)} {...props} />
);
