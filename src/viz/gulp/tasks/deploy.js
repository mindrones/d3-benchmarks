import path from 'path'
import { default as gulp } from 'gulp'
import { default as runSequence } from 'run-sequence'
import { default as ghPages } from 'gulp-gh-pages'
import { default as options } from '../options'
import { default as config } from '../config'

gulp.task('commitToGhPages', () => {
    var opts = {cacheDir: path.resolve(config.rootDir, '.gh_pages_cache')}
    if (options.m) { opts.message = options.m }

    return gulp.src(path.resolve(config.buildDir, '**/*')).pipe( ghPages(opts) )
})

gulp.task('deploy', () => {
    runSequence(['data', 'vendor', 'build'], 'commitToGhPages')
})
