// Enhanced ResizeObserver loop error suppression
// These errors are typically harmless and caused by Radix UI components
// and CSS transitions that trigger resize observations in loops

const suppressResizeObserverErrors = () => {
  // Suppress console.error messages
  const originalError = console.error;
  console.error = (...args) => {
    const errorMessage = args[0]?.toString() || '';
    
    // Suppress ResizeObserver loop errors
    if (
      errorMessage.includes('ResizeObserver loop completed with undelivered notifications') ||
      errorMessage.includes('ResizeObserver loop limit exceeded')
    ) {
      return;
    }
    
    // Allow all other errors to be logged normally
    originalError.apply(console, args);
  };

  // Suppress unhandled error events at window level
  const originalErrorHandler = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (
      typeof message === 'string' && 
      message.includes('ResizeObserver loop completed with undelivered notifications')
    ) {
      return true; // Prevent the error from being thrown
    }
    
    // Call original handler for other errors
    if (originalErrorHandler) {
      return originalErrorHandler(message, source, lineno, colno, error);
    }
    return false;
  };

  // Suppress unhandled promise rejections related to ResizeObserver
  const originalUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    if (
      event.reason &&
      typeof event.reason === 'string' &&
      event.reason.includes('ResizeObserver loop completed with undelivered notifications')
    ) {
      event.preventDefault();
      return false;
    }

    // Call original handler for other rejections
    if (originalUnhandledRejection) {
      return originalUnhandledRejection.call(window, event);
    }
    return false;
  };

  // Debounce ResizeObserver to prevent loops
  if (typeof window !== 'undefined' && window.ResizeObserver) {
    const OriginalResizeObserver = window.ResizeObserver;
    
    window.ResizeObserver = class extends OriginalResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        let timeout: NodeJS.Timeout | null = null;
        
        const debouncedCallback: ResizeObserverCallback = (entries, observer) => {
          if (timeout) {
            clearTimeout(timeout);
          }
          
          timeout = setTimeout(() => {
            try {
              callback(entries, observer);
            } catch (error) {
              // Silently catch ResizeObserver loop errors
              if (
                error instanceof Error && 
                error.message.includes('ResizeObserver loop completed with undelivered notifications')
              ) {
                return;
              }
              throw error;
            }
          }, 16); // Debounce by one frame
        };
        
        super(debouncedCallback);
      }
    };
  }
};

// Initialize the error suppression immediately
suppressResizeObserverErrors();

export { suppressResizeObserverErrors };
