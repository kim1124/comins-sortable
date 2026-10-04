// Vue's compiler hook needs the JS TypeScript API; package checks keep using TypeScript 7.
require('vue-tsc').run(require.resolve('typescript-sfc/lib/tsc'));
