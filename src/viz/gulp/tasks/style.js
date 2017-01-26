import gulp from 'gulp'
import gutil from 'gulp-util'
import less from 'gulp-less'
import { default as browserSync } from 'browser-sync'
import config from '../config'

gulp.task('style', () => {
    return gulp.src('./viz/index.less')
        .pipe(less().on('error', gutil.log))
        .pipe(gulp.dest(config.buildDir).on('error', gutil.log))
        .pipe(browserSync.stream())
});
