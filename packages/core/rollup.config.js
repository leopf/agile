import path from 'path';
import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import esbuild from 'rollup-plugin-esbuild';
import typescript from '@rollup/plugin-typescript';

// TODO https://www.youtube.com/watch?v=v0ZLEy1SE-A

const fileExtensions = ['.js', '.ts', '.tsx'];
const { root } = path.parse(process.cwd()); // https://nodejs.org/api/process.html#process_process_cwd

// https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency
// Checks whether the specified id/path is outside the particular package (-> external)
function external(id) {
  return !id.startsWith('.') && !id.startsWith(root);
}

function getEsbuild(target) {
  return esbuild({
    minify: false,
    target,
    tsconfig: path.resolve('./tsconfig.json'),
  });
}

function createDeclarationConfig(input, output) {
  return {
    input,
    output: {
      dir: output,
    },
    external,
    plugins: [
      typescript({
        declaration: true,
        emitDeclarationOnly: true,
        outDir: output,
      }),
    ],
  };
}

function createESMConfig(input, output) {
  return {
    input,
    output: { file: output, format: 'esm' },
    external,
    plugins: [
      resolve({ extensions: fileExtensions }),
      getEsbuild('node12'),
      typescript(),
    ],
  };
}

function createCommonJSConfig(input, output) {
  return {
    input,
    output: { file: output, format: 'cjs', exports: 'named' },
    external,
    plugins: [
      resolve({ extensions: fileExtensions }),
      babel({
        babelHelpers: 'bundled',
        comments: false,
      }),
      typescript(),
    ],
  };
}

export default function () {
  return [
    createDeclarationConfig('src/index.ts', 'dist'),
    createCommonJSConfig('src/index.ts', 'dist/index.js'),
    createESMConfig('src/index.ts', 'dist/esm/index.mjs'),
    createESMConfig('src/index.ts', 'dist/esm/index.js'),
  ];
}
