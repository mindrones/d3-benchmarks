import { default as Component } from '.'
import { default as Stats } from 'stats.js'

Component.prototype.initStats = function() {
    this.stats = new Stats()
    this.stats.showPanel(1) // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild( this.stats.dom )
}
