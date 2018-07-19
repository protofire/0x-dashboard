
let log_console = console.log;
let log_error = console.error;
let log_null = function (s) { };

module.exports.log = log_console;

module.exports.error = log_error;

module.exports.enable = function () {
    log = log_console;
};

module.exports.disable = function () {
    log = log_null;
};
