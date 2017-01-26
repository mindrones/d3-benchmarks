import path from 'path'
import { default as gulp } from 'gulp'
import { default as gutil } from 'gulp-util'
import { default as config } from '../config'

gulp.task('vendor', () => {
    return gulp.src([
        path.resolve(config.rootDir, 'node_modules/d3/build/d3.js'),
        path.resolve(config.rootDir, 'node_modules/lodash/lodash.js')
    ])
    .pipe(gulp.dest(config.buildVendorDir).on('error', gutil.log))
})
