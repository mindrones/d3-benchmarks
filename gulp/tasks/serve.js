import { default as gulp } from 'gulp'
import { default as runSequence } from 'run-sequence'
import { default as browserSync } from 'browser-sync'

gulp.task('serve', () => {
    browserSync.init({
        server: {
            baseDir: './build/',
        },
        port: 8001,
        open: false,
        reloadOnRestart: true,
        notify: false,
        ghostMode: false
    })
    gulp.watch('./viz/**/*.js', () => {
        runSequence('logic', browserSync.reload)
    })
    gulp.watch([
        './viz/*.less',
        './viz/**/*.less'
    ], ['style'])
    gulp.watch('./viz/**/*.html', () => {
        runSequence('html', browserSync.reload)
    })
    gulp.watch('./data/**/*.json', () => {
        runSequence('data', browserSync.reload)
    })
})
