import { BrowserContext, Browser } from 'playwright';
import * as fs from 'fs/promises';
import { IUserCredentials } from './types';
import { getStorageStateAfterFacebookLogin } from './facebook';

export const getNameForStorageStateByUserCredential = (
  userCredential: IUserCredentials,
): string =>
  `StorageStateFor[${userCredential.type}][${userCredential.username}].json`;

export const getBrowserContextWithLoggedInStoregeState = async (
  userCredential: IUserCredentials,
  browser: Browser,
): Promise<BrowserContext> => {
  const context = await browser.newContext();
  let storageState = '';

  try {
    storageState = await fs.readFile(
      getNameForStorageStateByUserCredential(userCredential),
      'utf-8',
    );
  } catch (e) {
    console.log(
      `No file ${getNameForStorageStateByUserCredential(userCredential)}`,
    );
  }

  if (storageState.length > 0) {
    return await browser.newContext({ storageState: JSON.parse(storageState) });
  }

  if (userCredential.type === 'facebook') {
    storageState = await getStorageStateAfterFacebookLogin(
      userCredential,
      context,
    );
  } else {
    return context;
  }

  await fs.writeFile(
    getNameForStorageStateByUserCredential(userCredential),
    storageState,
    'utf-8',
  );

  return context;
};
