import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        // Figma-style primary: dark in light mode, white in dark mode
        default: "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 focus-visible:ring-zinc-500",
        // Old default kept as "muted"
        muted: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500 dark:bg-red-600 dark:hover:bg-red-700",
        outline:
          "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-100",
        secondary:
          "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
        ghost:
          "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
        link: "text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100",
        // Success variant for save buttons etc.
        success: "bg-emerald-500 text-white hover:bg-emerald-600 focus-visible:ring-emerald-500",
        // Blue variant for special actions
        blue: "bg-blue-500 text-white hover:bg-blue-600 focus-visible:ring-blue-500",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps extends React.ComponentProps<"button">,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
