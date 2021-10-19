import { INTERVAL_FOR_TWO_FACTOR, MAX_TIME_FOR_TWO_FACTOR } from '../constants';
import { getTwoFactorCode } from '../db';
import { IUserCredentials } from '../types';

export const waitForTwoFactorCode = async (
  userCredentials: IUserCredentials,
): Promise<string> => {
  const start = Date.now();

  return await new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const spendedTime = Date.now() - start;

      console.log('SpendedTime WaitForTwoFactor', spendedTime / 1000);

      void getTwoFactorCode(userCredentials.username, userCredentials.type)
        .then((code) => {
          if (code != null) {
            clearInterval(interval);
            resolve(code);
          }
        })
        .catch((error) => {
          clearInterval(interval);
          reject(error);
        });

      if (spendedTime >= MAX_TIME_FOR_TWO_FACTOR) {
        clearInterval(interval);
        reject(new Error('Error in waitForTwoFactorCode'));
      }
    }, INTERVAL_FOR_TWO_FACTOR);
  });
};
