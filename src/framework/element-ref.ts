/** Register after the framework finishes replacing a moved subtree's DOM. */
export function deferredElementRef(
  setElement: (element: HTMLElement | null) => void,
): (element: HTMLElement | null) => void {
  let revision = 0;
  return (element) => {
    const current = ++revision;
    if (element === null) {
      setElement(null);
      return;
    }
    queueMicrotask(() => {
      if (current === revision) setElement(element);
    });
  };
}
