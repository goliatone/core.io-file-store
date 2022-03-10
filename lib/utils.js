function isStream(stream, readable = true) {
    if (!stream) return false;
    if (typeof stream !== 'object') return false;

    const _is = (src, type) => typeof src === type;

    return _is(stream.pipe, 'function') &&
        _is(stream._read, 'function') &&
        _is(stream._readableState, 'object') &&
        stream.readable === readable;
}

module.exports.isStream = isStream;
