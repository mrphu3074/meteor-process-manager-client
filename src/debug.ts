import * as chalk from 'chalk';

export function error(message: string): void {
  const msg = chalk.red('[ERROR]: ' + message);
  console.log(msg);
}

export function success(message: string): void {
  const msg = chalk.green('[SUCCESS]: ' + message);
  console.log(msg);
}

export function info(message: string): void {
  const msg = chalk.blue('[INFO]: ' + message);
  console.log(msg);
}

export function warning(message: string): void {
  const msg = chalk.yellow('[WARNING]: ' + message);
  console.log(msg);
}