"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";

/**
 * Wrapper do ThemeProvider do next-themes
 * Suporta props como:
 * - attribute="class"
 * - defaultTheme="system"
 * - enableSystem
 * - disableTransitionOnChange
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
