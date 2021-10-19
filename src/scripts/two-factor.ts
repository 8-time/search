import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { Arguments } from 'yargs-parser';
import { addTwoFactorCode } from '../db';

void (async function () {
  await yargs(hideBin(process.argv))
    .usage('Usage: $0 <command> [options]')
    .command(
      'add <code> <username> <type>',
      'Will add two factor code to specific username and type',
      (yargs: any) =>
        yargs
          .positional('code', {
            type: 'string',
          })
          .positional('username', {
            type: 'string',
          })
          .positional('type', {
            type: 'string',
          }),
      ({ username, code, type }: Arguments) => {
        async function make(): Promise<void> {
          try {
            const msg = await addTwoFactorCode(username, code, type);
            console.log(msg);
          } catch (error) {
            console.log(error);
          }
        }

        void make();
      },
    )
    .strictCommands()
    .demandCommand(1).argv;
})();
