import path from 'path'
import { default as gulp } from 'gulp'
import { default as gutil } from 'gulp-util'
import { default as config } from '../config'

gulp.task('data', () => {
    return gulp.src(path.resolve(config.dataDir, 'path.json'))
    .pipe(gulp.dest(config.buildDataDir).on('error', gutil.log))
})
