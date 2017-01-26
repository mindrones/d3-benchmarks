/* global process */

import { default as minimist } from 'minimist'

const opts = minimist(process.argv.slice(2), {
    string: [
        'm'     // deploy message
    ]
})
export default opts
