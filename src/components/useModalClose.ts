import { useEffect } from "react";

let openModalCount = 0;
let previousBodyOverflow = "";
let previousBodyPaddingRight = "";

function lockPageScroll() {
  if (openModalCount === 0) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    previousBodyOverflow = document.body.style.overflow;
    previousBodyPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  openModalCount += 1;
}

function unlockPageScroll() {
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
    document.body.style.paddingRight = previousBodyPaddingRight;
  }
}

export function useModalClose(onClose: () => void, isOpen: boolean = true) {
  useEffect(() => {
    if (!isOpen) return;
    lockPageScroll();
    return unlockPageScroll;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isOpen]);

  function handleBackdropClick(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return { handleBackdropClick };
}
