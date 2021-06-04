import { chromium } from 'playwright';
import * as fs from 'fs/promises';
import { each } from 'lodash';
import { IUserCredentials, ISearchRawData } from './types';
import {
  getBrowserContextsByUserCredentialsKey,
  generateSearchStringsBySearchRawData,
  getTypeForBrowserContextByUserCredentialsKey,
} from './utils';
import { createFacebookUrlForSearch } from './facebook';

const start = async (): Promise<void> => {
  const userCredentials: IUserCredentials[] = JSON.parse(
    await fs.readFile('userCredentials.json', 'utf-8'),
  );
  const searchRawData: ISearchRawData[] = JSON.parse(
    await fs.readFile('searchRawData.json', 'utf-8'),
  );

  const searchStrings = generateSearchStringsBySearchRawData(searchRawData);

  const browser = await chromium.launch({ headless: false, slowMo: 50 });

  const browserContextsByUserCredentialsKey =
    await getBrowserContextsByUserCredentialsKey(browser, userCredentials);

  each(browserContextsByUserCredentialsKey, async (browserContext, key) => {
    [searchStrings[0], searchStrings[1]].map(async (searchString) => {
      if (getTypeForBrowserContextByUserCredentialsKey(key) === 'facebook') {
        const page = await browserContext.newPage();
        await page.goto(createFacebookUrlForSearch(searchString), {
          waitUntil: 'networkidle',
        });
      }
    });
  });
};

// eslint-disable-next-line no-void
void (async function () {
  await start();
})();
