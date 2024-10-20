if (typeof window !== 'undefined' && !window.setImmediate) {
    window.setImmediate = function (callback) {
        return setTimeout(callback, 0);
    };
}

if (typeof global !== 'undefined' && !global.setImmediate) {
    global.setImmediate = function (callback) {
        return setTimeout(callback, 0);
    };
}