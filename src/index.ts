import { chromium } from 'playwright';
import * as fs from 'fs/promises';
import { each } from 'lodash';
import { IUserCredentials, ISearchRawData } from './types';
import {
  getBrowserContextsByUserCredentialsKey,
  generateSearchStringsBySearchRawData,
  getTypeForBrowserContextByUserCredentialsKey,
  getSearchStringsByBrowserContexts,
} from './utils';
import { grabAllLinksFromSearchPostPage } from './facebook';

const start = async (): Promise<void> => {
  const userCredentials: IUserCredentials[] = JSON.parse(
    await fs.readFile('userCredentials.json', 'utf-8'),
  );
  const searchRawData: ISearchRawData[] = JSON.parse(
    await fs.readFile('searchRawData.json', 'utf-8'),
  );

  const browser = await chromium.launch({ headless: false, slowMo: 50 });

  const searchStrings = generateSearchStringsBySearchRawData(searchRawData);
  const browserContextsByUserCredentialsKey =
    await getBrowserContextsByUserCredentialsKey(browser, userCredentials);

  const searchStringsByBrowserContexts = getSearchStringsByBrowserContexts(
    userCredentials,
    searchStrings,
  );

  each(browserContextsByUserCredentialsKey, (browserContext, key) => {
    each(searchStringsByBrowserContexts[key], async (searchString) => {
      if (getTypeForBrowserContextByUserCredentialsKey(key) === 'facebook') {
        await grabAllLinksFromSearchPostPage(browserContext, searchString);
      }
    });
  });
};

// eslint-disable-next-line no-void
void (async function () {
  await start();
})();
