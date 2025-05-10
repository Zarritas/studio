// NOTE: This file was added by the AI.
// This is a common pattern for implementing a theme provider in Next.js.
// You can learn more about this pattern here: https://github.com/pacocoursey/next-themes#with-app
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
