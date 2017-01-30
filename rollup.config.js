import { default as nodeResolve } from 'rollup-plugin-node-resolve'
import { default as commonjs } from 'rollup-plugin-commonjs'
import buble from 'rollup-plugin-buble'

export default {
  entry: 'src/implementations/index.js',
  dest: 'build/bundle.js',
  format: 'umd',
  moduleName: 'implementations',
  plugins: [
      nodeResolve({
          module: true,
          jsnext: true,
          main: true,
          browser: true
      }),
      commonjs(),
      buble()
  ]
}
