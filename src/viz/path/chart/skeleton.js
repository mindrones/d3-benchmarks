import { default as Component } from '.'

Component.prototype.initSkeleton = function() {
    this.container =
        this.options.container.append('div')
        .attr('class', this.name)
    this.svg = this.container.append('svg')
    this.g = this.svg.append('g')
}

Component.prototype.updateSkeletonGeometry = function() {
    this.svg
        .attr('width', this.geometry.width)
        .attr('height', this.geometry.height)

    this.g
        .attr('transform', `translate(${this.geometry.origin})`)
}
