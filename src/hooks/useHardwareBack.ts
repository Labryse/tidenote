import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { isCapacitor } from '../lib/platform';

type BackCallback = () => void;

class BackButtonManager {
  private stack: BackCallback[] = [];
  private isListening = false;

  public push(callback: BackCallback) {
    this.stack.push(callback);
    this.ensureListener();
  }

  public remove(callback: BackCallback) {
    this.stack = this.stack.filter((cb) => cb !== callback);
  }

  private ensureListener() {
    if (!this.isListening && isCapacitor()) {
      this.isListening = true;
      App.addListener('backButton', ({ canGoBack }) => {
        if (this.stack.length > 0) {
          // Pop the top-most layer
          const topCallback = this.stack[this.stack.length - 1];
          // We remove it from the stack BEFORE calling to avoid double triggers 
          // if the callback relies on re-render to unmount
          this.stack.pop();
          topCallback();
        } else {
          // No custom layers open
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        }
      });
    }
  }
}

export const backButtonManager = new BackButtonManager();

/**
 * A hook to register a hardware back button callback in Capacitor.
 * Ensures that the most recently opened component handles the back button first (stack behavior).
 * 
 * @param isOpen Whether the modal/drawer/layer is currently open
 * @param onClose The function to call when the hardware back button is pressed
 */
export function useHardwareBack(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isCapacitor()) return;

    if (isOpen) {
      const callback = () => {
        onCloseRef.current();
      };
      
      backButtonManager.push(callback);
      
      return () => {
        backButtonManager.remove(callback);
      };
    }
  }, [isOpen]);
}
