export function useRouter() {
  return {
    push: (path: string) => {
      const page = path.replace(/^\//, '');
      window.dispatchEvent(new CustomEvent('autoslp_navigate', { detail: page || 'dashboard' }));
    },
    replace: (path: string) => {
      const page = path.replace(/^\//, '');
      window.dispatchEvent(new CustomEvent('autoslp_navigate', { detail: page || 'dashboard' }));
    },
    prefetch: () => {},
    back: () => {},
  };
}
