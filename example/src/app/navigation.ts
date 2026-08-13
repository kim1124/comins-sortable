export const adapterIds = ['vanilla', 'react', 'vue', 'svelte'] as const;
export const exampleIds = [
  'simple',
  'two-lists',
  'handle',
  'empty',
  'accept',
  'auto-scroll',
] as const;

export type PlaygroundAdapterId = (typeof adapterIds)[number];
export type PlaygroundExampleId = (typeof exampleIds)[number];

export interface PlaygroundRoute {
  adapterId: PlaygroundAdapterId;
  exampleId: PlaygroundExampleId;
}

const defaultRoute: PlaygroundRoute = {
  adapterId: 'react',
  exampleId: 'simple',
};

export function resolvePlaygroundRoute(pathname: string): PlaygroundRoute {
  const [, prefix, exampleId, adapterId, ...rest] = pathname.split('/');
  if (
    rest.length === 0 &&
    prefix === 'examples' &&
    exampleIds.includes(exampleId as PlaygroundExampleId) &&
    adapterIds.includes(adapterId as PlaygroundAdapterId)
  ) {
    return {
      adapterId: adapterId as PlaygroundAdapterId,
      exampleId: exampleId as PlaygroundExampleId,
    };
  }

  return defaultRoute;
}

export function playgroundPath(route: PlaygroundRoute): string {
  return `/examples/${route.exampleId}/${route.adapterId}`;
}
