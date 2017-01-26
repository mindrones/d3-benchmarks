import path from 'path'
import { default as gulp } from 'gulp'
import { default as gutil } from 'gulp-util'
import { default as config } from '../config'

gulp.task('html', () => {
    return gulp.src('./path/index.html')
    .pipe(
        gulp.dest(path.resolve(config.buildDir, 'path'))
        .on('error', gutil.log)
    )
})
