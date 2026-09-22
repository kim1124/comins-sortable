/** Retain the known end of the item region when its final item leaves. */
export function itemBoundary(
  parent: Element,
  items: readonly Element[],
  previous: Element | null = null,
): Element | null {
  const last = items[items.length - 1];
  if (last === undefined) return previous?.parentElement === parent ? previous : null;
  const children = Array.from(parent.children);
  return children.slice(children.indexOf(last) + 1).find((child) => (
    !items.includes(child) && !child.hasAttribute('data-comins-sortable-placeholder')
  )) ?? null;
}
