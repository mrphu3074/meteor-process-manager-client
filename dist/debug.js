"use strict";
var chalk = require('chalk');
function error(message) {
    var msg = chalk.red('[ERROR]: ' + message);
    console.log(msg);
}
exports.error = error;
function success(message) {
    var msg = chalk.green('[SUCCESS]: ' + message);
    console.log(msg);
}
exports.success = success;
function info(message) {
    var msg = chalk.blue('[INFO]: ' + message);
    console.log(msg);
}
exports.info = info;
function warning(message) {
    var msg = chalk.yellow('[WARNING]: ' + message);
    console.log(msg);
}
exports.warning = warning;
