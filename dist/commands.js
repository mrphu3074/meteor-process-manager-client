"use strict";
var path = require('path');
var fs = require('fs');
var child_process_1 = require('child_process');
var _ = require('lodash');
var request = require('request');
var CLI = require('clui');
var jsonFile = require('jsonfile');
var debug = require('./debug');
var Promise = require('bluebird');
var Spinner = CLI.Spinner;
var PROJECT_DIR = process.cwd();
function execp(cmd, option) {
    if (option === void 0) { option = {}; }
    return new Promise(function (resolve, reject) {
        var cmdStr;
        if (_.isArray(cmd)) {
            cmdStr = cmd.join(' ');
        }
        else {
            cmdStr = cmd;
        }
        child_process_1.exec(cmdStr, option, function (error, stdOut) {
            if (error) {
                reject(error);
            }
            else {
                resolve(stdOut);
            }
        });
    });
}
exports.execp = execp;
function validate() {
    // check mpm.json exists in directory
    var validateSettingFile = function () {
        return new Promise(function (resolve, reject) {
            var configPath = path.resolve(PROJECT_DIR, 'mpm.json');
            fs.exists(configPath, function (isExists) {
                if (isExists) {
                    resolve();
                }
                else {
                    return reject({ message: 'App settings not found' });
                }
            });
        });
    };
    // check mpm.json content
    var validateSettingContent = function () {
        var configPath = path.resolve(PROJECT_DIR, 'mpm.json');
        return new Promise(function (resolve, reject) {
            jsonFile.readFile(configPath, function (error, data) {
                if (error) {
                    reject(error);
                }
                else if (!data['name'] || !data['version'] || !data['source']) {
                    reject({ message: 'App settings invalid' });
                }
                else {
                    resolve();
                }
            });
        });
    };
    var validateSource = function () {
        var configPath = path.resolve(PROJECT_DIR, 'mpm.json');
        return new Promise(function (resolve, reject) {
            jsonFile.readFile(configPath, function (error, data) {
                if (error) {
                    reject(error);
                }
                else {
                    fs.exists(data.source, function (isExists) {
                        if (!isExists) {
                            reject({ message: 'Source dir not found' });
                        }
                        else {
                            resolve();
                        }
                    });
                }
            });
        });
    };
    return Promise.resolve()
        .then(validateSettingFile)
        .then(validateSettingContent)
        .then(validateSource);
}
exports.validate = validate;
function getAppConfig() {
    var configPath = path.resolve(PROJECT_DIR, 'mpm.json');
    return new Promise(function (resolve, reject) {
        jsonFile.readFile(configPath, function (error, data) {
            if (error)
                return reject(error);
            resolve(data);
        });
    });
}
exports.getAppConfig = getAppConfig;
/**
 * Generate app enviroment
 *
 * @param name {string} app name
 * @return {void}
 */
function init(name) {
    try {
        var templatePath = path.resolve(__dirname, '../templates/mpm.json');
        ;
        jsonFile.readFile(templatePath, function (error, data) {
            if (error) {
                debug.error(error.message);
                return;
            }
            data.name = name;
            jsonFile.writeFile(PROJECT_DIR + '/mpm.json', data, { spaces: 2 }, function (err) {
                if (error) {
                    debug.error(error.message);
                    return;
                }
                debug.success('Generated app settings');
            });
        });
    }
    catch (e) {
        debug.error(e.message);
    }
}
exports.init = init;
function build() {
    var createTarball = function (appConfig) {
        return new Promise(function (resolve, reject) {
            var compressing = new Spinner('Building...');
            compressing.start();
            var cmd = [
                'meteor', 'build',
                PROJECT_DIR + '/binary/',
                '--architecture', 'os.linux.x86_64'
            ];
            execp(cmd, { cwd: appConfig.source })
                .then(function () {
                compressing.stop();
                resolve(appConfig);
            })
                .catch(function (e) { return reject(e); });
        });
    };
    var renameTarball = function (appConfig) {
        return new Promise(function (resolve, reject) {
            var sourcePaths = appConfig.source.split('/');
            var oldTarbalPath = PROJECT_DIR + '/binary/' + sourcePaths[sourcePaths.length - 1] + '.tar.gz';
            var newTarballPath = PROJECT_DIR + '/binary/bundle.tar.gz';
            fs.rename(oldTarbalPath, newTarballPath, function (error) {
                if (error)
                    return reject(error);
                debug.success('Created tarball successfully');
                resolve(appConfig);
            });
        });
    };
    Promise
        .resolve()
        .then(validate)
        .then(getAppConfig)
        .then(createTarball)
        .then(renameTarball)
        .catch(function (error) {
        debug.error(error.message);
    });
}
exports.build = build;
function deploy() {
    var tarbalPath = PROJECT_DIR + '/binary/bundle.tar.gz';
    var submitBinary = function (appConfig) {
        return Promise.mapSeries(appConfig.pm, function (pm) {
            return new Promise(function (resolve, reject) {
                var loading = new Spinner('Deploying to ' + pm.name);
                loading.start();
                var r = request.post(pm.url + '/api/deploy', function (error) {
                    loading.stop();
                    if (error) {
                        reject(error);
                    }
                    else {
                        debug.success('Deployed to ' + pm.name + ' successfully!');
                        resolve(appConfig);
                    }
                });
                var form = r.form();
                form.append('bundle', fs.createReadStream(tarbalPath));
                form.append('settings', JSON.stringify(appConfig));
            });
        });
    };
    Promise
        .resolve()
        .then(validate)
        .then(getAppConfig)
        .then(submitBinary)
        .catch(function (error) {
        debug.error(error.message);
    });
}
exports.deploy = deploy;
