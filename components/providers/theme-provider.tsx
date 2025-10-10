"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";
import { type ThemeProviderProps } from "next-themes";

/**
 * Wrapper do ThemeProvider do next-themes
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

/**
 * Hook customizado para usar tema
 */
export const useTheme = useNextTheme;
