import { createSortable } from '../../src/index.js';
import type {
  Sortable,
  VanillaSortableAreaOptions,
  VanillaSortableOptions,
} from '../../src/index.js';

declare const area: Element;

const areaOptions: VanillaSortableAreaOptions = {
  areaId: 'todo',
  item: '[data-sortable-id]',
  getItemId: (element) => element.getAttribute('data-sortable-id') ?? 'missing',
  group: { name: 'tasks', pull: 'copy' },
  copyElement: (source, context) => {
    const copy = source.cloneNode(true) as Element;
    copy.setAttribute('data-sortable-id', `${String(context.itemId)}-copy`);
    return copy;
  },
};
const options: VanillaSortableOptions = {
  ...areaOptions,
  onChange: (change) => void change.itemId,
};
const sortable: Sortable = createSortable(area, options);

sortable.registerArea(area, areaOptions);
sortable.updateArea('todo', { disabled: true });
sortable.refreshArea('todo');
sortable.cancel();
sortable.destroy();
