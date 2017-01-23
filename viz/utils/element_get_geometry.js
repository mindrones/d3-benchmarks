import { default as _ } from 'lodash'

export default function(elem, additionalProps) {
    let inspectedProps = ['width', 'height']
    if (!_.isUndefined(additionalProps)) {
        inspectedProps = inspectedProps.concat(additionalProps)
    }
    return _.chain(getComputedStyle(elem))
        .pick(inspectedProps)
        .mapValues(function(pxValue) { return parseFloat(pxValue, 10); })
        .value()
}
