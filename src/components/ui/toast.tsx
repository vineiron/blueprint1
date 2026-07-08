"use client";

import type { ReactNode } from "react";
import { toast as sonnerToast } from "sonner";

/**
 * Thin wrapper over sonner (plan F9) preserving the existing `useToast()` API so
 * call sites stay unchanged. The actual <Toaster> is mounted globally in
 * <Providers>; ToastProvider is kept as a no-op passthrough for back-compat.
 */
type ToastVariant = "default" | "success" | "error";
interface ToastInput {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  /** Reuse an existing toast id to update it in place (e.g. loading → result). */
  id?: string | number;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useToast() {
  return {
    /** Returns the sonner toast id so callers can update it in place later. */
    toast: ({ title, description, variant = "default", id }: ToastInput) => {
      const message = title ?? "";
      if (variant === "success") return sonnerToast.success(message, { description, id });
      if (variant === "error") return sonnerToast.error(message, { description, id });
      return sonnerToast(message, { description, id });
    },
  };
}
