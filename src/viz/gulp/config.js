import path from 'path'
import findup from 'findup'

const rootDir = findup.sync('.', 'package.json')
const buildDir = path.resolve(rootDir, 'build/')

export default {
    rootDir: rootDir,
    dataDir: path.resolve(rootDir, 'data/'),
    buildDir: buildDir,
    buildDataDir: path.resolve(buildDir, 'data/'),
    buildVendorDir: path.resolve(buildDir, 'vendor/'),
}
