import { chromium } from 'playwright';
import * as fs from 'fs/promises';
import map from 'lodash/map';
import keys from 'lodash/keys';
import assign from 'lodash/assign';
import reduce from 'lodash/reduce';
import chunk from 'lodash/chunk';
import {
  IUserCredentials,
  ISearchRawData,
  ILinksFromSearchPostPage,
  ILinksFromSearchTagPage,
  IBrowserContextByUserCredentials,
} from './types';
import {
  getBrowserContextsByUserCredentialsKey,
  generateSearchStringsBySearchRawData,
  getTypeForBrowserContextByUserCredentialsKey,
  getSearchStringsByBrowserContexts,
  generateSearchStringsCompanyOrProductsBySearchRawData,
} from './utils';
import { grabAllLinksFromSearchPostPage } from './facebook';
import { grabAllLinksFromSearchTagPage } from './instagram';

import { OPEN_PAGES_SIZE_IN_PARRALEL } from './constants';

const grabLinksByCompanyOrProducts = async (
  searchRawData: ISearchRawData[],
  userCredentials: IUserCredentials[],
  browserContextsByUserCredentialsKey: IBrowserContextByUserCredentials,
): Promise<ILinksFromSearchPostPage> => {
  const links: ILinksFromSearchPostPage = {};
  const searchStringsCompanyOrProductsBySearchRawData =
    generateSearchStringsCompanyOrProductsBySearchRawData(searchRawData);

  const searchStringsCompanyOrProductsByBrowserContexts =
    getSearchStringsByBrowserContexts(
      userCredentials,
      searchStringsCompanyOrProductsBySearchRawData,
    );

  for await (const key of keys(browserContextsByUserCredentialsKey)) {
    for await (const searchStrings of chunk(
      searchStringsCompanyOrProductsByBrowserContexts[key],
      OPEN_PAGES_SIZE_IN_PARRALEL,
    )) {
      const linksArray = await Promise.all(
        map(searchStrings, async (searchString) => {
          if (
            getTypeForBrowserContextByUserCredentialsKey(key) === 'instagram'
          ) {
            return await grabAllLinksFromSearchTagPage(
              browserContextsByUserCredentialsKey[key],
              searchString,
              searchStringsCompanyOrProductsBySearchRawData,
            );
          }

          return {};
        }),
      );

      const linksHash = reduce(
        linksArray,
        (memo: ILinksFromSearchTagPage, item: ILinksFromSearchTagPage) => {
          assign(memo, item);
          return memo;
        },
        {},
      );

      assign(links, linksHash);
    }
  }

  return links;
};

const grabLinksByCompanyProductsIncidentKeywords = async (
  searchRawData: ISearchRawData[],
  userCredentials: IUserCredentials[],
  browserContextsByUserCredentialsKey: IBrowserContextByUserCredentials,
): Promise<ILinksFromSearchPostPage> => {
  const links: ILinksFromSearchPostPage = {};

  const searchStringsBySearchRawData =
    generateSearchStringsBySearchRawData(searchRawData);

  const searchStringsByBrowserContexts = getSearchStringsByBrowserContexts(
    userCredentials,
    searchStringsBySearchRawData,
  );

  for await (const key of keys(browserContextsByUserCredentialsKey)) {
    for await (const searchStrings of chunk(
      searchStringsByBrowserContexts[key],
      OPEN_PAGES_SIZE_IN_PARRALEL,
    )) {
      const linksArray = await Promise.all(
        map(searchStrings, async (searchString) => {
          if (
            getTypeForBrowserContextByUserCredentialsKey(key) === 'facebook'
          ) {
            return await grabAllLinksFromSearchPostPage(
              browserContextsByUserCredentialsKey[key],
              searchString,
              searchStringsBySearchRawData,
            );
          }

          return {};
        }),
      );

      const linksHash = reduce(
        linksArray,
        (memo: ILinksFromSearchPostPage, item: ILinksFromSearchPostPage) => {
          assign(memo, item);
          return memo;
        },
        {},
      );

      assign(links, linksHash);
    }
  }

  return links;
};

const start = async (): Promise<void> => {
  const userCredentials: IUserCredentials[] = JSON.parse(
    await fs.readFile('userCredentials.json', 'utf-8'),
  );
  const searchRawData: ISearchRawData[] = JSON.parse(
    await fs.readFile('searchRawData.json', 'utf-8'),
  );

  const browser = await chromium.launch({ headless: false, slowMo: 10 });
  const browserContextsByUserCredentialsKey =
    await getBrowserContextsByUserCredentialsKey(browser, userCredentials);

  const links: ILinksFromSearchPostPage = {};

  const [linksByCompanyOrProducts, linksByCompanyProductsIncidentKeywords] =
    await Promise.all([
      grabLinksByCompanyOrProducts(
        searchRawData,
        userCredentials,
        browserContextsByUserCredentialsKey,
      ),
      grabLinksByCompanyProductsIncidentKeywords(
        searchRawData,
        userCredentials,
        browserContextsByUserCredentialsKey,
      ),
    ]);

  assign(
    links,
    linksByCompanyOrProducts,
    linksByCompanyProductsIncidentKeywords,
  );

  console.log(links);
  await fs.writeFile(
    `out[${new Date().toDateString()}].json`,
    JSON.stringify(links),
    'utf-8',
  );

  await browser.close();
};

// eslint-disable-next-line no-void
void (async function () {
  await start();
})();
