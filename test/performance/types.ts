export interface BenchmarkConfig {
  itemCount: number;
  areaCount: number;
  animation: boolean;
  autoScroll: boolean;
}
export type BenchmarkPhase = 'idle' | 'activation' | 'move' | 'release';
export interface FrameSample { phase: BenchmarkPhase; ms: number }
