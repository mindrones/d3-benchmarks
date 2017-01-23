import { default as gulp } from 'gulp'
import { default as gutil } from 'gulp-util'
import { default as config } from '../config'

gulp.task('html', () => {
    return gulp.src('./viz/index.html')
    .pipe(gulp.dest(config.buildDir).on('error', gutil.log))
})
