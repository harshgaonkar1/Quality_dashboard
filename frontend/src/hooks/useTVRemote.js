// ============================================================
// TV Remote Navigation Hook
// ------------------------------------------------------------
// Enables TV Remote D-Pad, Media Keys, and Shortcut control for
// Smart TVs, Android Kiosk Apps, and remote controllers.
// ============================================================

import { useEffect, useState, useCallback } from 'react';

// Keycode & Key Name maps for TV Remotes (Android TV, WebOS, Tizen, FireTV, etc.)
const TV_KEYS = {
  LEFT: ['ArrowLeft', 'Left', '37'],
  RIGHT: ['ArrowRight', 'Right', '39'],
  UP: ['ArrowUp', 'Up', '38'],
  DOWN: ['ArrowDown', 'Down', '40'],
  SELECT: ['Enter', 'Select', '13', '32', '66', '23', 'NumpadEnter'],
  BACK: ['Escape', 'Backspace', 'BrowserBack', 'GoBack', '27', '8', '4'],
  PLAY_PAUSE: ['MediaPlayPause', 'MediaPlay', 'MediaPause', '179', '177', '178', 'p', 'P'],
  NEXT: ['MediaTrackNext', 'ChannelUp', 'PageUp', '33', 'n', 'N'],
  PREV: ['MediaTrackPrevious', 'ChannelDown', 'PageDown', '34'],
  BLUE: ['VK_BLUE', '406', 'f', 'F'],
};

export function useTVRemote(options = {}) {
  const {
    onLeft,
    onRight,
    onUp,
    onDown,
    onSelect,
    onBack,
    onPlayPause,
    onNext,
    onPrev,
    onFullscreen,
    enabled = true,
  } = options;

  const [isTVMode, setIsTVMode] = useState(false);

  // Helper to find focusable elements on the page
  const getFocusableElements = useCallback(() => {
    return Array.from(
      document.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
    });
  }, []);

  // Ensure an element is focused on screen when D-Pad is pressed
  const autoFocusFirstElement = useCallback(() => {
    const active = document.activeElement;
    if (!active || active === document.body || active === document.documentElement) {
      const focusables = getFocusableElements();
      if (focusables.length > 0) {
        focusables[0].focus();
        return true;
      }
    }
    return false;
  }, [getFocusableElements]);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event) {
      const key = String(event.key || event.keyCode || '');
      const code = String(event.keyCode || '');

      // Check if user is typing inside a text input field
      const isInput =
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA' ||
          document.activeElement.isContentEditable);

      // Indicate TV Remote detection
      if (!isTVMode) {
        setIsTVMode(true);
      }

      // 1. D-Pad Left
      if (TV_KEYS.LEFT.includes(key) || TV_KEYS.LEFT.includes(code)) {
        const handledFocus = autoFocusFirstElement();
        if (onLeft && (!isInput || document.activeElement.type !== 'text')) {
          onLeft(event);
        }
      }

      // 2. D-Pad Right
      else if (TV_KEYS.RIGHT.includes(key) || TV_KEYS.RIGHT.includes(code)) {
        const handledFocus = autoFocusFirstElement();
        if (onRight && (!isInput || document.activeElement.type !== 'text')) {
          onRight(event);
        }
      }

      // 3. D-Pad Up
      else if (TV_KEYS.UP.includes(key) || TV_KEYS.UP.includes(code)) {
        autoFocusFirstElement();
        if (onUp) onUp(event);
      }

      // 4. D-Pad Down
      else if (TV_KEYS.DOWN.includes(key) || TV_KEYS.DOWN.includes(code)) {
        autoFocusFirstElement();
        if (onDown) onDown(event);
      }

      // 5. Select / OK / Enter
      else if (TV_KEYS.SELECT.includes(key) || TV_KEYS.SELECT.includes(code)) {
        if (onSelect) {
          onSelect(event);
        } else if (document.activeElement && typeof document.activeElement.click === 'function') {
          // Trigger click on currently focused element if no custom handler
          document.activeElement.click();
        }
      }

      // 6. Back / Escape
      else if (TV_KEYS.BACK.includes(key) || TV_KEYS.BACK.includes(code)) {
        if (onBack) {
          event.preventDefault();
          onBack(event);
        }
      }

      // 7. Media Play / Pause
      else if (TV_KEYS.PLAY_PAUSE.includes(key) || TV_KEYS.PLAY_PAUSE.includes(code)) {
        if (onPlayPause && !isInput) {
          event.preventDefault();
          onPlayPause(event);
        }
      }

      // 8. Next Track / Fast Forward
      else if (TV_KEYS.NEXT.includes(key) || TV_KEYS.NEXT.includes(code)) {
        if (onNext && !isInput) {
          event.preventDefault();
          onNext(event);
        }
      }

      // 9. Previous Track
      else if (TV_KEYS.PREV.includes(key) || TV_KEYS.PREV.includes(code)) {
        if (onPrev && !isInput) {
          event.preventDefault();
          onPrev(event);
        }
      }

      // 10. Blue Button / Fullscreen shortcut
      else if (TV_KEYS.BLUE.includes(key) || TV_KEYS.BLUE.includes(code)) {
        if (onFullscreen && !isInput) {
          event.preventDefault();
          onFullscreen(event);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    isTVMode,
    onLeft,
    onRight,
    onUp,
    onDown,
    onSelect,
    onBack,
    onPlayPause,
    onNext,
    onPrev,
    onFullscreen,
    autoFocusFirstElement,
  ]);

  return { isTVMode, autoFocusFirstElement, getFocusableElements };
}
