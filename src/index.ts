#!/usr/bin/env node

var program = require('commander');
var jsonFile = require('jsonfile');

const COMMAND_TYPES = ['init', 'build', 'deploy', 'app'];
const PROJECT_DIR = process.cwd();
import * as commands from './commands';

/**
 * Command to generate deployment file
 */
program
  .command('init')
  .description('Generate new deployment enviroment')
  .action(name => commands.init(name));

program
  .command('build')
  .description('Create a tarball file')
  .action(() => commands.build());

program
  .command('deploy')
  .description('Generate new deployment enviroment')
  .action(() => commands.deploy());

program
  .command('app')
  .description('App control')
  .option('start', 'Start app')
  .option('stop', 'Start app')
  .option('restart', 'Start app')
  .option('configure', 'Start app')
  .action(function (option, cmd) {
    if(!option || ['start', 'stop', 'restart', 'configure'].indexOf(option) < 0) {
      cmd.help();
      return;
    }
    
  });

/**
 * Show help if empty or invalid command
 */
if (!process.argv[2] || COMMAND_TYPES.indexOf(process.argv[2].toLowerCase()) < 0) {
  program.help();
}

program.parse(process.argv);