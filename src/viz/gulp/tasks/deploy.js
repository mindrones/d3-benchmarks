import path from 'path'
import gulp from 'gulp'
import gutil from 'gulp-util'
import { default as runSequence } from 'run-sequence'
import { default as ghPages } from 'gulp-gh-pages'
import { default as options } from '../options'
import { default as config } from '../config'

gulp.task('commitToGhPages', () => {
    var opts = {cacheDir: path.resolve(config.rootDir, '.gh_pages_cache')}
    if (options.m) { opts.message = options.m }

    return gulp.src(path.resolve(config.buildDir, '**/*')).pipe( ghPages(opts) )
})

gulp.task('copyGhPagesIndex', () => {
    return gulp.src(`./index.html`)
        .pipe(gulp.dest(config.buildDir).on('error', gutil.log))
})

gulp.task('deploy', () => {
    runSequence(['data', 'vendor', 'build', 'copyGhPagesIndex'], 'commitToGhPages')
})
