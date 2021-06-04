import { BrowserContext, Browser } from 'playwright';
import * as fs from 'fs/promises';
import { flatten, isEmpty, map, reduce } from 'lodash';
import {
  IUserCredentials,
  IBrowserContextByUserCredentials,
  ISearchRawData,
  TYPES,
} from './types';
import { getStorageStateAfterFacebookLogin } from './facebook';

export const getNameForStorageStateByUserCredential = (
  userCredential: IUserCredentials,
): string =>
  `storageStateFor[${userCredential.type}][${userCredential.username}].json`;

export const getKeyByUserCredential = (
  userCredential: IUserCredentials,
): string => `${userCredential.type}-${userCredential.username}`;

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

export const getBrowserContextsByUserCredentialsKey = async (
  browser: Browser,
  userCredentials: IUserCredentials[],
): Promise<IBrowserContextByUserCredentials> => {
  const browserContexts = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    map(userCredentials, (userCredential) =>
      getBrowserContextWithLoggedInStoregeState(userCredential, browser),
    ),
  );

  const browserContextsByUserCredentials: IBrowserContextByUserCredentials =
    reduce(
      userCredentials,
      (memo: IBrowserContextByUserCredentials, item, i) => {
        memo[getKeyByUserCredential(item)] = browserContexts[i];
        return memo;
      },
      {},
    );

  return browserContextsByUserCredentials;
};

export const generateSearchStringsBySearchRawData = (
  searchRawData: ISearchRawData[],
): string[] => {
  // const result: string[] = [];

  const result = reduce(
    searchRawData,
    (memo: string[], item) => {
      let firstSearchWords = [item.companyName];

      if (!isEmpty(item.productNames)) {
        firstSearchWords = map(
          item.productNames,
          (productName) => `${item.companyName} ${productName}`,
        );
      }

      return memo.concat(
        flatten(
          map(firstSearchWords, (partOfSearch) =>
            map(
              item.incidentKeywords,
              (incidentKeyword) => `${partOfSearch} ${incidentKeyword}`,
            ),
          ),
        ),
      );
    },
    [],
  );

  return result;
};

export const getTypeForBrowserContextByUserCredentialsKey = (
  key: string,
): TYPES | undefined => {
  if (key.includes('facebook-')) {
    return 'facebook';
  }
};
