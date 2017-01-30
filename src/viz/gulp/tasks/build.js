import { default as gulp } from 'gulp'
import { default as _ } from 'lodash'
import { default as config } from '../config'

gulp.task('build',
    _.chain(config.vizDirNames)
    .map(dirName =>
        _.map(['logic', 'style', 'html'], taskType => `${taskType}.${dirName}`)
    )
    .flatten()
    .value()
)
