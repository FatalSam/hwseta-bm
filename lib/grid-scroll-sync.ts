/**
 * Utility to synchronize horizontal scrolling between Syncfusion grid headers and content
 * This ensures that when users scroll horizontally, headers move with the data rows
 */

// Store scroll handlers to avoid memory leaks
const gridScrollHandlers = new WeakMap<HTMLElement, {
  headerHandler: () => void;
  contentHandler: () => void;
}>();

export function syncGridHeaderScroll(gridElement: HTMLElement | null): void {
  if (!gridElement) return;

  const headerContent = gridElement.querySelector('.e-gridheader .e-headercontent') as HTMLElement;
  const contentElement = gridElement.querySelector('.e-gridcontent .e-content') as HTMLElement;

  if (!headerContent || !contentElement) return;

  // Remove existing handlers if any
  const existingHandlers = gridScrollHandlers.get(gridElement);
  if (existingHandlers) {
    contentElement.removeEventListener('scroll', existingHandlers.contentHandler);
    headerContent.removeEventListener('scroll', existingHandlers.headerHandler);
  }

  // Create scroll handlers
  const syncHeaderToContent = () => {
    if (headerContent.scrollLeft !== contentElement.scrollLeft) {
      headerContent.scrollLeft = contentElement.scrollLeft;
    }
  };

  const syncContentToHeader = () => {
    if (contentElement.scrollLeft !== headerContent.scrollLeft) {
      contentElement.scrollLeft = headerContent.scrollLeft;
    }
  };

  // Store handlers for cleanup
  gridScrollHandlers.set(gridElement, {
    headerHandler: syncContentToHeader,
    contentHandler: syncHeaderToContent,
  });

  // Add scroll listeners with passive flag for better performance
  contentElement.addEventListener('scroll', syncHeaderToContent, { passive: true });
  headerContent.addEventListener('scroll', syncContentToHeader, { passive: true });
}

/**
 * Initialize scroll synchronization for all grids on the page
 */
export function initializeGridScrollSync(): void {
  if (typeof window === 'undefined') return;

  // Function to sync all grids
  const syncAllGrids = () => {
    const grids = document.querySelectorAll('.e-grid');
    grids.forEach((grid) => {
      syncGridHeaderScroll(grid as HTMLElement);
    });
  };

  // Initial sync after a short delay to ensure DOM is ready
  const initialSync = () => {
    setTimeout(() => {
      syncAllGrids();
    }, 100);
  };

  // Run initial sync
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialSync);
  } else {
    initialSync();
  }

  // Sync when new grids are added (using MutationObserver with debouncing)
  let syncTimeout: ReturnType<typeof setTimeout> | null = null;
  const debouncedSync = () => {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }
    syncTimeout = setTimeout(() => {
      syncAllGrids();
    }, 150);
  };

  const observer = new MutationObserver(debouncedSync);

  // Observe the document body for new grid elements
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also sync on window load
  window.addEventListener('load', () => {
    setTimeout(syncAllGrids, 200);
  });

  // Periodic sync for dynamically loaded grids (with limited duration)
  let checkCount = 0;
  const maxChecks = 20; // Check for 10 seconds (20 * 500ms)
  const intervalId = setInterval(() => {
    syncAllGrids();
    checkCount++;
    if (checkCount >= maxChecks) {
      clearInterval(intervalId);
    }
  }, 500);
}

