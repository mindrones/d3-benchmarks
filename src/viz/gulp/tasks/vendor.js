import { default as gulp } from 'gulp'
import { default as gutil } from 'gulp-util'
import { default as config } from '../config'

gulp.task('vendor', () => {
    return gulp.src([
        './node_modules/d3/build/d3.js',
        './node_modules/lodash/lodash.js'
    ])
    .pipe(gulp.dest(config.vendorDir).on('error', gutil.log))
})
