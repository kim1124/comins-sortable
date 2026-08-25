import { useLayoutEffect, useMemo, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';

import type { FrameworkSortableChange, SortableScopeOptions } from '../core.js';
import {
  createReactSortableController,
  ReactSortableContext,
} from './context.js';
import { createReactRootLifecycle } from './root-lifecycle.js';

export interface SortableRootProps<T>
  extends Omit<SortableScopeOptions, 'onChange'> {
  children?: ReactNode;
  onChange?: (change: FrameworkSortableChange<T>) => void;
}

export function SortableRoot<T>(props: SortableRootProps<T>): ReactElement {
  const propsRef = useRef(props);
  propsRef.current = props;
  const controller = useMemo(
    () => createReactRootLifecycle<T>(() => createReactSortableController<T>({
      getRootProps: () => propsRef.current,
    })),
    [],
  );
  useLayoutEffect(() => () => controller.destroy(), [controller]);
  return (
    <ReactSortableContext.Provider value={controller as never}>
      {props.children}
    </ReactSortableContext.Provider>
  );
}
