import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";
import React from "react";

const buttonStyles = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white shadow-md hover:bg-brand-dark focus-visible:outline-brand",
        ghost: "bg-transparent hover:bg-white/10 text-white",
        subtle: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:outline-gray-300",
        outline: "border border-gray-300 text-gray-900 hover:border-gray-400"
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-5 py-2.5 text-base"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>;

export const Button: React.FC<ButtonProps> = ({ className, variant, size, ...props }) => (
  <button className={clsx(buttonStyles({ variant, size }), className)} {...props} />
);
