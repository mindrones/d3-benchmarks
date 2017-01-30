import path from 'path'
import { default as gulp } from 'gulp'
import { default as gutil } from 'gulp-util'
import { default as config } from '../config'

config.vizDirNames.forEach(vizDir => {
    gulp.task(`html.${vizDir}`, () => {
        return gulp.src(`./${vizDir}/index.html`)
        .pipe(
            gulp.dest(path.resolve(config.buildDir, vizDir))
            .on('error', gutil.log)
        )
    })
})
