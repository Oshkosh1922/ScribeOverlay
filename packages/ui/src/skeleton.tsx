import React from "react";
import clsx from "clsx";

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={clsx("animate-pulse rounded-md bg-gray-200/70 dark:bg-white/10", className)} {...props} />
);
