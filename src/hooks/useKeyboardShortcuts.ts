import { useEffect, useCallback } from 'react';

type KeyCombo = string;
type ShortcutHandler = (event: KeyboardEvent) => void;

interface Shortcut {
  key: KeyCombo;
  handler: ShortcutHandler;
  description?: string;
  disabled?: boolean;
}

/**
 * Hook لإدارة اختصارات لوحة المفاتيح
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // تجاهل إذا كان المستخدم يكتب في حقل إدخال
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    for (const shortcut of shortcuts) {
      if (shortcut.disabled) continue;

      const keys = shortcut.key.toLowerCase().split('+');
      const needsCtrl = keys.includes('ctrl') || keys.includes('cmd');
      const needsShift = keys.includes('shift');
      const needsAlt = keys.includes('alt');
      const mainKey = keys.filter(k => !['ctrl', 'cmd', 'shift', 'alt'].includes(k))[0];

      const ctrlMatch = needsCtrl ? (event.ctrlKey || event.metaKey) : true;
      const shiftMatch = needsShift ? event.shiftKey : !event.shiftKey;
      const altMatch = needsAlt ? event.altKey : !event.altKey;
      const keyMatch = event.key.toLowerCase() === mainKey;

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        event.preventDefault();
        shortcut.handler(event);
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * اختصارات شائعة للتطبيق
 */
export const commonShortcuts = {
  save: 'ctrl+s',
  search: 'ctrl+f',
  new: 'ctrl+n',
  close: 'escape',
  delete: 'delete',
  copy: 'ctrl+c',
  paste: 'ctrl+v',
  undo: 'ctrl+z',
  redo: 'ctrl+shift+z',
  selectAll: 'ctrl+a',
  print: 'ctrl+p',
  refresh: 'ctrl+r',
  home: 'ctrl+h',
};

/**
 * Hook مبسط للاختصار الواحد
 */
export function useShortcut(
  key: string,
  handler: ShortcutHandler,
  disabled = false
) {
  useKeyboardShortcuts([{ key, handler, disabled }]);
}
