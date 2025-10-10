"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = "md",
}: ModalProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative bg-background rounded-lg shadow-lg max-h-[90vh] overflow-hidden flex flex-col animate-slide-up",
          {
            "w-full max-w-sm": size === "sm",
            "w-full max-w-md": size === "md",
            "w-full max-w-2xl": size === "lg",
            "w-full max-w-4xl": size === "xl",
            "w-full max-w-[70vw]": size === "2xl",
            "w-full h-full max-w-none max-h-none": size === "full",
          }
        )}
      >
        {/* Close Button - Always Present */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Header - Now only contains title/description (conditional) */}
        {(title || description) && (
          <div className="p-6 pb-4 border-b">
            <div className="pr-10">
              {" "}
              {/* Add padding right to avoid overlap with button */}
              {title && <h2 className="text-lg font-semibold">{title}</h2>}
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div
          className={cn("flex-1 overflow-y-auto p-6", {
            "pt-10": !(
              title || description
            ) /* Add top padding to content if there's no header to make space for the close button */,
          })}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
