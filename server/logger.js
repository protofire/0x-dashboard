
let log_console = console.log;
let log_error = console.error;
let log_null = function (s) { };

module.exports = {
    log: process.env.DEBUG ? log_console : log_null,
    error: log_error
};
