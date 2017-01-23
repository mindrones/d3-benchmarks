import { default as d3 } from 'd3'
import { default as App } from '.'

App.prototype.setSkeleton = function() {
    let appdiv = d3.select(this.options.container).append('div').attr('class', 'app')
    appdiv.append('div').attr('id', 'Chart')
    appdiv.append('div').attr('id', 'Controls')
}
