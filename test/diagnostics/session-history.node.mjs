import { SessionMachine } from '../../dist/core/session.js';

// 장기 scope에서 production 상태 이력 저장이 제거됐는지 확인한다.
// 실제 browser heap 측정이나 공개 API 소비자 검사를 대신하지 않는다.
const session = new SessionMachine();
const pointer = { type: 'mouse', clientX: 0, clientY: 0, deltaX: 0, deltaY: 0,
  altKey: false, ctrlKey: false, metaKey: false, shiftKey: false };
const pending = { pointerId: 1, pointerType: 'mouse', itemId: 'probe',
  source: { areaId: 'probe', index: 0 }, origin: pointer };
const cycles = 10_000;
for (let cycle = 0; cycle < cycles; cycle += 1) {
  session.pending(pending);
  session.activate({ ...pending, pointer, destination: pending.source });
  session.cancel('escape');
  session.finish();
}
const storesHistory = Object.hasOwn(session, 'history');
console.log(JSON.stringify({ cycles, terminalStatus: session.state.status, storesHistory }));
if (storesHistory || session.state.status !== 'idle') process.exitCode = 1;
