import { default as gulp } from 'gulp'
import { default as gutil } from 'gulp-util'
import { default as config } from '../config'

gulp.task('data', () => {
    return gulp.src('./data/path.json')
    .pipe(gulp.dest(config.dataDir).on('error', gutil.log))
})
