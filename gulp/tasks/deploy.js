import { default as gulp } from 'gulp'
import { default as runSequence } from 'run-sequence'
import { default as ghPages } from 'gulp-gh-pages'
import { default as options } from '../options'

gulp.task('commitToGhPages', () => {
    var opts = {cacheDir: '.gh_pages_cache'}
    if (options.m) { opts.message = options.m }

    return gulp.src('./build/**/*')
        .pipe( ghPages(opts) )
})

gulp.task('deploy', () => {
    runSequence(['data', 'vendor', 'build'], 'commitToGhPages')
})
