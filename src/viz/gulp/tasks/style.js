import path from 'path'
import gulp from 'gulp'
import gutil from 'gulp-util'
import less from 'gulp-less'
import { default as browserSync } from 'browser-sync'
import config from '../config'

gulp.task('style', () => {
    return gulp.src('./path/index.less')
        .pipe(less().on('error', gutil.log))
        .pipe(
            gulp.dest(path.resolve(config.buildDir, 'path'))
            .on('error', gutil.log)
        )
        .pipe(browserSync.stream())
});
