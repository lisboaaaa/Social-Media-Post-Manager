import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

const inputClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"

// Chromium patches a `caret-color` style onto native date/time inputs after
// its picker widget upgrades the element, which happens before React
// hydrates — React sees an attribute it didn't render and warns. It's a
// browser-injected DOM mutation, not a real markup mismatch, so it's safe to
// suppress for these input types specifically.
const NATIVE_ONLY_TYPES = new Set(["date", "time", "datetime-local", "month", "week"]);

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  if (type && NATIVE_ONLY_TYPES.has(type)) {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(inputClassName, className)}
        suppressHydrationWarning
        {...props}
      />
    );
  }

  return (
    <InputPrimitive type={type} data-slot="input" className={cn(inputClassName, className)} {...props} />
  )
}

export { Input }
