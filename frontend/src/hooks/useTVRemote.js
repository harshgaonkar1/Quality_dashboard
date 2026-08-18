// ============================================================
// TV Remote Navigation Hook
// ------------------------------------------------------------
// Enables TV Remote D-Pad, Media Keys, and Shortcut control for
// Smart TVs, Android Kiosk Apps, and remote controllers.
// ============================================================

import { useEffect, useState, useCallback } from 'react';

// Keycode & Key Name maps for TV Remotes (Android TV, WebOS, Tizen, FireTV, Apple TV, etc.)
const TV_KEYS = {
  LEFT: ['ArrowLeft', 'Left', '37'],
  RIGHT: ['ArrowRight', 'Right', '39'],
  UP: ['ArrowUp', 'Up', '38'],
  DOWN: ['ArrowDown', 'Down', '40'],
  SELECT: ['Enter', 'Select', '13', '32', '66', '23', 'NumpadEnter', ' '],
  BACK: ['Escape', 'Backspace', 'BrowserBack', 'GoBack', '27', '8', '4', '10009', '10015'],
  PLAY_PAUSE: ['MediaPlayPause', 'MediaPlay', 'MediaPause', '179', '177', '178', 'p', 'P'],
  NEXT: ['MediaTrackNext', 'ChannelUp', 'PageUp', '33', 'n', 'N'],
  PREV: ['MediaTrackPrevious', 'ChannelDown', 'PageDown', '34'],
  RED: ['VK_RED', '400', '112', 'F1', 'r', 'R'],
  GREEN: ['VK_GREEN', '401', '113', 'F2', 'g', 'G'],
  YELLOW: ['VK_YELLOW', '402', '114', 'F3', 'y', 'Y'],
  BLUE: ['VK_BLUE', '403', '115', 'F4', 'b', 'B', 'f', 'F'],
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
    onRed,
    onGreen,
    onYellow,
    onBlue,
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

  // Spatial D-Pad directional focus movement
  const navigateSpatial = useCallback(
    (direction) => {
      const focusables = getFocusableElements();
      if (focusables.length === 0) return;

      const active = document.activeElement;
      if (!active || active === document.body || active === document.documentElement) {
        focusables[0].focus();
        return;
      }

      const activeRect = active.getBoundingClientRect();
      const activeCenter = {
        x: activeRect.left + activeRect.width / 2,
        y: activeRect.top + activeRect.height / 2,
      };

      let bestCandidate = null;
      let minDistance = Infinity;

      focusables.forEach((el) => {
        if (el === active) return;
        const rect = el.getBoundingClientRect();
        const center = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };

        const dx = center.x - activeCenter.x;
        const dy = center.y - activeCenter.y;

        let isValidDirection = false;
        if (direction === 'left' && dx < -10) isValidDirection = true;
        if (direction === 'right' && dx > 10) isValidDirection = true;
        if (direction === 'up' && dy < -10) isValidDirection = true;
        if (direction === 'down' && dy > 10) isValidDirection = true;

        if (isValidDirection) {
          // Weight off-axis distance higher to favor orthogonal alignment
          const weight = direction === 'left' || direction === 'right' ? Math.abs(dy) * 2 : Math.abs(dx) * 2;
          const dist = Math.sqrt(dx * dx + dy * dy) + weight;
          if (dist < minDistance) {
            minDistance = dist;
            bestCandidate = el;
          }
        }
      });

      if (bestCandidate) {
        bestCandidate.focus();
        bestCandidate.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    },
    [getFocusableElements]
  );

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event) {
      const key = String(event.key || '');
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
        if (onLeft && (!isInput || document.activeElement.type !== 'text')) {
          onLeft(event);
        } else if (!isInput) {
          navigateSpatial('left');
        }
      }

      // 2. D-Pad Right
      else if (TV_KEYS.RIGHT.includes(key) || TV_KEYS.RIGHT.includes(code)) {
        if (onRight && (!isInput || document.activeElement.type !== 'text')) {
          onRight(event);
        } else if (!isInput) {
          navigateSpatial('right');
        }
      }

      // 3. D-Pad Up
      else if (TV_KEYS.UP.includes(key) || TV_KEYS.UP.includes(code)) {
        if (onUp) {
          onUp(event);
        } else if (!isInput) {
          navigateSpatial('up');
        }
      }

      // 4. D-Pad Down
      else if (TV_KEYS.DOWN.includes(key) || TV_KEYS.DOWN.includes(code)) {
        if (onDown) {
          onDown(event);
        } else if (!isInput) {
          navigateSpatial('down');
        }
      }

      // 5. Select / OK / Enter
      else if (TV_KEYS.SELECT.includes(key) || TV_KEYS.SELECT.includes(code)) {
        if (onSelect) {
          onSelect(event);
        } else if (document.activeElement && typeof document.activeElement.click === 'function') {
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

      // 8. Next Track / Channel Up
      else if (TV_KEYS.NEXT.includes(key) || TV_KEYS.NEXT.includes(code)) {
        if (onNext && !isInput) {
          event.preventDefault();
          onNext(event);
        }
      }

      // 9. Previous Track / Channel Down
      else if (TV_KEYS.PREV.includes(key) || TV_KEYS.PREV.includes(code)) {
        if (onPrev && !isInput) {
          event.preventDefault();
          onPrev(event);
        }
      }

      // 10. RED Button Shortcut
      else if (TV_KEYS.RED.includes(key) || TV_KEYS.RED.includes(code)) {
        if (onRed && !isInput) {
          event.preventDefault();
          onRed(event);
        }
      }

      // 11. GREEN Button Shortcut
      else if (TV_KEYS.GREEN.includes(key) || TV_KEYS.GREEN.includes(code)) {
        if (onGreen && !isInput) {
          event.preventDefault();
          onGreen(event);
        }
      }

      // 12. YELLOW Button Shortcut
      else if (TV_KEYS.YELLOW.includes(key) || TV_KEYS.YELLOW.includes(code)) {
        if (onYellow && !isInput) {
          event.preventDefault();
          onYellow(event);
        }
      }

      // 13. BLUE Button / Fullscreen shortcut
      else if (TV_KEYS.BLUE.includes(key) || TV_KEYS.BLUE.includes(code)) {
        if (onBlue && !isInput) {
          event.preventDefault();
          onBlue(event);
        } else if (onFullscreen && !isInput) {
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
    onRed,
    onGreen,
    onYellow,
    onBlue,
    autoFocusFirstElement,
    navigateSpatial,
  ]);

  return { isTVMode, autoFocusFirstElement, getFocusableElements, navigateSpatial };
}

