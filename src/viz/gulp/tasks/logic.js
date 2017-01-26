import path from 'path'
import gulp from 'gulp'
import gutil from 'gulp-util'
import { rollup } from 'rollup'
import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import buble from 'rollup-plugin-buble'
import source from 'vinyl-source-stream'
import readableFromString from '../utils/stream_readableFromString'
import config from '../config'

gulp.task('logic', () => {
    return rollup({
        entry: './path/index.js',
        external: ['d3', 'lodash'],
        plugins: [
            nodeResolve({
                module: true,
                jsnext: true,
                main: true,
                browser: true
            }),
            commonjs(),
            buble()
        ],
    }).then(bundle =>
        readableFromString(
            bundle.generate({
                format: 'iife',
                moduleName: 'index',
                globals: {
                    d3: 'd3',
                    lodash: '_'
                },
                banner: '/* https://github.com/mindrones/d3-benchmarks */',
            }).code
        )
        .pipe(source('index.js'))
        .pipe(
            gulp.dest(path.resolve(config.buildDir, 'path'))
            .on('error', gutil.log)
        )
    )
    .catch(err => { console.log(err) })
});
