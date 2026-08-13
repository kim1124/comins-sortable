import type { PlaygroundDemoModule } from '../playground/types.js';

export const placeholderModule: PlaygroundDemoModule = {
  adapterId: 'react',
  source: '// 실제 adapter consumer source를 준비하고 있습니다.',
  mount(container, input, bridge) {
    const message = document.createElement('p');
    message.className = 'cs-demo-placeholder';
    message.textContent = `${input.adapterId} · ${input.exampleId}`;
    container.append(message);
    bridge.publishModel({ todo: ['research', 'design', 'build'] });
    bridge.publishOperation(null);
    return {
      destroy: () => message.remove(),
      dispatch: () => undefined,
      reset: () => undefined,
    };
  },
};
