export function subscribeToUrlChanges(listener: (url: string) => void): () => void {
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  const notify = () => listener(window.location.href);

  history.pushState = function (...args): void {
    originalPushState.apply(this, args);
    notify();
  };
  history.replaceState = function (...args): void {
    originalReplaceState.apply(this, args);
    notify();
  };
  window.addEventListener('popstate', notify);

  return () => {
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    window.removeEventListener('popstate', notify);
  };
}
