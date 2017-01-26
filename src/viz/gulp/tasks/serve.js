import path from 'path'
import { default as gulp } from 'gulp'
import { default as runSequence } from 'run-sequence'
import { default as browserSync } from 'browser-sync'
import { default as config } from '../config'

gulp.task('serve', () => {
    browserSync.init({
        server: {baseDir: config.buildDir},
        port: 8001,
        open: false,
        reloadOnRestart: true,
        notify: false,
        ghostMode: false
    })
    gulp.watch('./path/**/*.js', () => {
        runSequence('logic', browserSync.reload)
    })
    gulp.watch([
        './path/*.less',
        './path/**/*.less'
    ], ['style'])
    gulp.watch('./path/**/*.html', () => {
        runSequence('html', browserSync.reload)
    })
    gulp.watch(path.resolve(config.dataDir, '**/*.json'), () => {
        runSequence('data', browserSync.reload)
    })
})
