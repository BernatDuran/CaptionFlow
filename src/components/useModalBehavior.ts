import { useEffect, useId, useRef } from "react";

let openModalCount = 0;
let previousBodyOverflow = "";
let previousBodyPaddingRight = "";
let modalStack: symbol[] = [];

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

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

function getFocusableElements(root: HTMLElement | null) {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement
  );
}

export function useModalBehavior(onClose: () => void, isOpen = true) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const modalIdRef = useRef(Symbol("modal"));
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;
    lockPageScroll();
    modalStack = [...modalStack, modalIdRef.current];
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    window.requestAnimationFrame(() => {
      const firstFocusable = getFocusableElements(dialogRef.current)[0];
      (firstFocusable || dialogRef.current)?.focus();
    });

    return () => {
      modalStack = modalStack.filter((modalId) => modalId !== modalIdRef.current);
      unlockPageScroll();
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      const isTopModal = modalStack[modalStack.length - 1] === modalIdRef.current;
      if (!isTopModal) return;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
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

  return { descriptionId, dialogRef, handleBackdropClick, titleId };
}
