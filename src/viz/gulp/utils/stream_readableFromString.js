import { default as stream } from 'stream'

export default function(string) {
    var readable = new stream.Readable();
    readable._read = function noop() {}
    readable.push(string)
    readable.push(null)
    return readable
}
