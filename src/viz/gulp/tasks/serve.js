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

    gulp.watch([
        './path/**/*.js',
        './path_client/**/*.js'
    ], event => {
        let dirName = path.relative(config.vizDir, event.path).split(path.sep)[0]
        console.log(dirName)

        runSequence(`logic.${dirName}`, browserSync.reload)
    })
    gulp.watch([
        './path/*.less',
        './path/**/*.less',
        './path_client/*.less',
        './path_client/**/*.less'
    ], event => {
        let dirName = path.relative(config.vizDir, event.path).split(path.sep)[0]
        runSequence(`style.${dirName}`)
    })
    gulp.watch([
        './path/**/*.html',
        './path_client/**/*.html'
    ], event => {
        let dirName = path.relative(config.vizDir, event.path).split(path.sep)[0]
        runSequence(`html.${dirName}`, browserSync.reload)
    })
    gulp.watch(path.resolve(config.dataDir, '**/*.json'), () => {
        runSequence('data', browserSync.reload)
    })
})
