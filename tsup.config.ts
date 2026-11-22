import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', express: 'src/express.ts' },
  format: ['esm', 'cjs'], dts: true, clean: true, splitting: false,
  sourcemap: true, treeshake: true, target: 'node20',
  outExtension({ format }) { return { js: format === 'cjs' ? '.cjs' : '.js' }; }
});
