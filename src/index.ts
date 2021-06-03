import { chromium } from 'playwright';
import * as fs from 'fs/promises';
import { each, map } from 'lodash';
import { getBrowserContextWithLoggedInStoregeState } from './utils';
import { IUserCredentials } from './types';

const start = async (): Promise<void> => {
  const userCredentials: IUserCredentials[] = JSON.parse(
    await fs.readFile('config.json', 'utf-8'),
  );

  const browser = await chromium.launch({ headless: false, slowMo: 50 });

  const browserContexts = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    map(userCredentials, (userCredential) =>
      getBrowserContextWithLoggedInStoregeState(userCredential, browser),
    ),
  );

  each(browserContexts, async (browserContext) => {
    const page = await browserContext.newPage();
    await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle' });
  });
};

// eslint-disable-next-line no-void
void (async function () {
  await start();
})();
