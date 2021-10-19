import { BrowserContext, Browser, Page } from 'playwright';
import * as fs from 'fs/promises';
import {
  groupBy,
  isEmpty,
  map,
  reduce,
  each,
  chunk,
  keys,
  assign,
  size,
} from 'lodash';
import xlsx from 'xlsx';
import {
  IUserCredentials,
  IBrowserContextByUserCredentials,
  ISearchRawData,
  IUserCredentialsTypes,
  ISearchStringsByBrowserContexts,
  IGenerateSearchStringsBySearchRawData,
  IGenerateSearchStringsCompanyOrProductsBySearchRawData,
  ILinksFromSearchPostPage,
} from '../types';
import { getStorageStateAfterFacebookLogin } from '../facebook';
import { getStorageStateAfterInstagramLogin } from '../instagram';
import { ALLOW_GLOBAL, FACEBOOK_IS_LOG_IN_SELECTOR } from '../constants';

export const isUserIsLogIn = async (
  browserContext: BrowserContext,
  type: IUserCredentialsTypes,
): Promise<boolean> => {
  if (type === 'facebook') {
    const page = await browserContext.newPage();

    await page.goto('https://www.facebook.com/', {
      waitUntil: 'networkidle',
    });

    await page.waitForTimeout(getRandomNumberToMax(5000, 2000));

    const elements = await page.$$(FACEBOOK_IS_LOG_IN_SELECTOR);

    await page.close();

    if (size(elements) > 0) {
      return true;
    }

    return false;
  }

  return true;
};

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
    const loadedContext = await browser.newContext({
      storageState: JSON.parse(storageState),
    });

    if (await isUserIsLogIn(loadedContext, userCredential.type)) {
      return loadedContext;
    }
  }

  if (userCredential.type === 'facebook') {
    storageState = await getStorageStateAfterFacebookLogin(
      userCredential,
      context,
    );
  } else if (userCredential.type === 'instagram') {
    storageState = await getStorageStateAfterInstagramLogin(
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
): IGenerateSearchStringsBySearchRawData => {
  const result = reduce(
    searchRawData,
    (memo: IGenerateSearchStringsBySearchRawData, item) => {
      let firstSearchWords = [item.companyName];

      if (!isEmpty(item.productNames)) {
        firstSearchWords = map(
          item.productNames,
          (productName) => `${item.companyName} ${productName}`,
        );
      }

      each(firstSearchWords, (partOfSearch) =>
        each(item.incidentKeywords, (incidentKeyword) => {
          memo[`${partOfSearch} ${incidentKeyword}`] = {
            companyName: item.companyName,
            searchString: `${partOfSearch} ${incidentKeyword}`,
            searchOptions: item.searchOptions,
          };
        }),
      );

      return memo;
    },
    {},
  );

  return result;
};

export const generateSearchStringsCompanyOrProductsBySearchRawData = (
  searchRawData: ISearchRawData[],
): IGenerateSearchStringsCompanyOrProductsBySearchRawData => {
  const result = reduce(
    searchRawData,
    (memo: IGenerateSearchStringsCompanyOrProductsBySearchRawData, item) => {
      let firstSearchWords = [item.companyName];

      if (!isEmpty(item.productNames)) {
        firstSearchWords = [
          ...firstSearchWords,
          ...(item.productNames as string[]),
        ];
      }

      each(firstSearchWords, (searchString) => {
        memo[searchString] = {
          companyName: item.companyName,
          incidentKeywords: item.incidentKeywords,
          searchString: searchString,
          searchOptions: item.searchOptions,
        };
      });

      return memo;
    },
    {},
  );

  return result;
};

export const getTypeForBrowserContextByUserCredentialsKey = (
  key: string,
): IUserCredentialsTypes | undefined => {
  if (key.includes('facebook-')) {
    return 'facebook';
  }
  if (key.includes('instagram-')) {
    return 'instagram';
  }
};

export const getSearchStringsByBrowserContexts = (
  userCredentials: IUserCredentials[],
  searchStrings:
    | IGenerateSearchStringsBySearchRawData
    | IGenerateSearchStringsCompanyOrProductsBySearchRawData,
): ISearchStringsByBrowserContexts => {
  const groupedUserCredentialsByType = groupBy(userCredentials, 'type');

  return reduce(
    groupedUserCredentialsByType,
    (memo: ISearchStringsByBrowserContexts, userCredentialsByType) => {
      const searchStringsKeys = keys(
        reduce(
          searchStrings,
          (memo, searchString, key) => {
            if (
              searchString.searchOptions[userCredentialsByType[0].type]
                .enable &&
              ALLOW_GLOBAL[userCredentialsByType[0].type]
            ) {
              assign(memo, { [key]: searchString });
            }

            return memo;
          },
          {},
        ),
      );

      const sizeOfParts = userCredentialsByType.length;
      const totalSize = searchStringsKeys.length;
      const searchStringsByChanks =
        sizeOfParts >= totalSize
          ? [searchStringsKeys]
          : chunk(searchStringsKeys, Math.ceil(totalSize / sizeOfParts));

      each(userCredentialsByType, (userCredentialByType, index) => {
        memo[getKeyByUserCredential(userCredentialByType)] =
          searchStringsByChanks[index];
      });

      return memo;
    },
    {},
  );
};

export const getRandomNumberToMax = (max: number, min: number): number =>
  Math.floor(Math.random() * (max - min + 1) + min);

export async function scrollPageToBottom(
  page: Page,
  scrollDelay = getRandomNumberToMax(500, 300),
  scrollStep = getRandomNumberToMax(250, 20),
): Promise<void> {
  return await page.evaluate(
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    ({ step, delay }) => {
      const getScrollHeight = (element: any): number => {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (!element) return 0;

        const { scrollHeight, offsetHeight, clientHeight } = element;
        return Math.max(scrollHeight, offsetHeight, clientHeight);
      };

      return new Promise((resolve) => {
        let count = 0;
        const intervalId = setInterval(() => {
          const { body } = document;
          const availableScrollHeight = getScrollHeight(body);

          window.scrollBy(0, step);
          count += Math.floor(Math.random() * step);

          if (count >= availableScrollHeight || window.scrollY === 0) {
            clearInterval(intervalId);
            resolve();
          }
        }, delay);
      });
    },
    { step: scrollStep, delay: scrollDelay },
  );
}

export async function writeOutputFiles(
  links: ILinksFromSearchPostPage,
): Promise<void> {
  const name = `out[${new Date().toDateString()}]`;
  await fs.writeFile(`${name}.json`, JSON.stringify(links), 'utf-8');
  const newWB = xlsx.utils.book_new();
  const newWS = xlsx.utils.json_to_sheet(
    reduce(
      links,
      (memo, { companyName, searchString }, key) => {
        memo.push({
          Link: {
            f: `HYPERLINK("${key}", "${key}")`,
          },
          'Company Name': companyName,
          Search: searchString,
        });
        return memo;
      },
      [] as Array<{
        Link: { f: string };
        'Company Name': string;
        Search: string;
      }>,
    ),
  );
  xlsx.utils.book_append_sheet(newWB, newWS, 'name');
  xlsx.writeFile(newWB, `${name}.xlsx`);
}
