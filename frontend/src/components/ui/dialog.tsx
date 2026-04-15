import type { MouseEvent, ReactNode } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
  closeOnOverlayClick?: boolean;
};

export const Dialog = ({
  open,
  onClose,
  children,
  className,
  overlayClassName,
  closeOnOverlayClick = true,
}: DialogProps) => {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const { overflow } = document.body.style;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) {
      onClose();
    }
  };

  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className={cn(
          "absolute inset-0 border-0 bg-slate-950/30 p-0 backdrop-blur-[2px]",
          overlayClassName
        )}
        aria-label="대화상자 닫기"
        onClick={handleOverlayClick}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          className={cn("relative max-h-[calc(100vh-2rem)] overflow-hidden", className)}
          onClick={stopPropagation}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
