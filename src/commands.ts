import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import * as chalk from 'chalk';
import * as _ from 'lodash';
import * as request from 'request';
import * as CLI from 'clui';
import * as jsonFile from 'jsonfile';
import * as debug from './debug';
import * as Promise from 'bluebird';

const Spinner = CLI.Spinner;
const PROJECT_DIR = process.cwd();

export function execp(cmd: string[] | string, option: Object = {}) {
  return new Promise(function (resolve, reject) {
    let cmdStr;
    if (_.isArray(cmd)) {
      cmdStr = cmd.join(' ');
    } else {
      cmdStr = cmd;
    }
    exec(cmdStr, option, function (error, stdOut) {
      if (error) {
        reject(error);
      } else {
        resolve(stdOut);
      }
    })
  });
}

export function validate() {
  // check mpm.json exists in directory
  const validateSettingFile = function () {
    return new Promise(function (resolve, reject) {
      const configPath = path.resolve(PROJECT_DIR, 'mpm.json');
      fs.exists(configPath, function (isExists: boolean) {
        if (isExists) {
          resolve();
        } else {
          return reject({ message: 'App settings not found' });
        }
      });
    });
  }
  // check mpm.json content
  const validateSettingContent = function () {
    const configPath = path.resolve(PROJECT_DIR, 'mpm.json');
    return new Promise(function (resolve, reject) {
      jsonFile.readFile(configPath, function (error: Error, data) {
        if (error) {
          reject(error);
        } else if (!data['name'] || !data['version'] || !data['source']) {
          reject({ message: 'App settings invalid' });
        } else {
          resolve();
        }
      });
    });
  }
  const validateSource = function () {
    const configPath = path.resolve(PROJECT_DIR, 'mpm.json');
    return new Promise(function (resolve, reject) {
      jsonFile.readFile(configPath, function (error: Error, data) {
        if (error) {
          reject(error);
        } else {
          fs.exists(data.source, isExists => {
            if (!isExists) {
              reject({ message: 'Source dir not found' });
            } else {
              resolve();
            }
          })
        }
      });
    });
  }
  return Promise.resolve()
    .then(validateSettingFile)
    .then(validateSettingContent)
    .then(validateSource);
}

export function getAppConfig() {
  const configPath = path.resolve(PROJECT_DIR, 'mpm.json');
  return new Promise(function (resolve, reject) {
    jsonFile.readFile(configPath, function (error: Error, data) {
      if (error) return reject(error);
      resolve(data);
    });
  });
}

/**
 * Generate app enviroment
 * 
 * @param name {string} app name
 * @return {void}
 */
export function init(name: string): void {
  try {
    const templatePath = path.resolve(__dirname, '../templates/mpm.json');;
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
      })
    });
  } catch (e) {
    debug.error(e.message);
  }
}

export function build() {
  const createTarball = function (appConfig) {
    return new Promise(function (resolve, reject) {
      var compressing = new Spinner('Building...');
      compressing.start();
      let cmd = [
        'meteor', 'build',
        PROJECT_DIR + '/binary/',
        '--architecture', 'os.linux.x86_64'
      ];
      execp(cmd, { cwd: appConfig.source })
        .then(() => {
          compressing.stop();
          resolve(appConfig);
        })
        .catch(e => reject(e));
    });
  }

  const renameTarball = function (appConfig) {
    return new Promise(function (resolve, reject) {
      let sourcePaths = appConfig.source.split('/');
      let oldTarbalPath = PROJECT_DIR + '/binary/' + sourcePaths[sourcePaths.length - 1] + '.tar.gz';
      let newTarballPath = PROJECT_DIR + '/binary/bundle.tar.gz';
      fs.rename(oldTarbalPath, newTarballPath, error => {
        if (error) return reject(error);
        debug.success('Created tarball successfully');
        resolve(appConfig);
      });
    });
  }

  Promise
    .resolve()
    .then(validate)
    .then(getAppConfig)
    .then(createTarball)
    .then(renameTarball)
    .catch(function (error: Error) {
      debug.error(error.message);
    })
}

export function deploy() {
  let tarbalPath = PROJECT_DIR + '/binary/bundle.tar.gz';
  const submitBinary = function (appConfig) {
    return Promise.mapSeries(appConfig.pm, function (pm: any) {
      return new Promise(function (resolve, reject) {
        const loading = new Spinner('Deploying to ' + pm.name);
        loading.start();
        const r = request.post(pm.url + '/api/deploy', error => {
          loading.stop();
          if (error) {
            reject(error);
          } else {
            debug.success('Deployed to ' + pm.name + ' successfully!');
            resolve(appConfig);
          }
        });
        const form = r.form();
        form.append('bundle', fs.createReadStream(tarbalPath));
        form.append('settings', JSON.stringify(appConfig));
      });
    });
  }

  Promise
    .resolve()
    .then(validate)
    .then(getAppConfig)
    .then(submitBinary)
    .catch(function (error: Error) {
      debug.error(error.message);
    });
}