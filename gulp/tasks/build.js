import { default as gulp } from 'gulp'

gulp.task('build', [
    'logic',
    'style',
    'html'
])
