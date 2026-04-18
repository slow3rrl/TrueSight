import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "./utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-blue-600 text-white hover:bg-blue-700 shadow-sm dark:bg-blue-600 dark:hover:bg-blue-700": variant === "default",
            "bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700": variant === "destructive",
            "border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-900 dark:text-slate-100": variant === "outline",
            "bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100 hover:bg-gray-200 dark:hover:bg-slate-700": variant === "secondary",
            "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300": variant === "ghost",
            "text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline": variant === "link",
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-lg px-3": size === "sm",
            "h-12 rounded-xl px-8 text-base": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
