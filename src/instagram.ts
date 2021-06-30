import { BrowserContext } from 'playwright';
import {
  INTERVAL_FOR_INSTAGRAM_TWO_FACTOR,
  MAX_TIME_FOR_INSTAGRAM_TWO_FACTOR,
} from './constants';
import {
  IUserCredentials,
  IGenerateSearchStringsBySearchRawData,
} from './types';

const waitForTwoFactor = async (): Promise<string> => {
  const start = Date.now();

  return await new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const spendedTime = Date.now() - start;
      console.log('waitForTwoFactor', spendedTime / 1000);
      if (spendedTime >= MAX_TIME_FOR_INSTAGRAM_TWO_FACTOR) {
        // TODO: get real code from DB
        clearInterval(interval);
        resolve('12345678');
      }
    }, INTERVAL_FOR_INSTAGRAM_TWO_FACTOR);
  });
};

export const createInstagramUrlForSearch = (searchString: string): string => {
  return `https://www.instagram.com/explore/tags/${encodeURIComponent(
    searchString.toLowerCase().replace(/ /g, ''),
  )}?__a=1`;
};

export const getStorageStateAfterInstagramLogin = async (
  userCredentials: IUserCredentials,
  context: BrowserContext,
): Promise<string> => {
  const page = await context.newPage();
  const pageContext = page.context();
  await pageContext.grantPermissions([]);

  page.setDefaultNavigationTimeout(100000);

  await page.goto('https://www.instagram.com/', {
    waitUntil: 'networkidle',
  });
  await page.type('input[name="username"]', userCredentials.username, {
    delay: 30,
  });
  await page.type('input[name="password"]', userCredentials.password, {
    delay: 30,
  });
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle' });

  await page.waitForTimeout(15000);

  if (
    page.url().includes('https://www.instagram.com/accounts/login/two_factor')
  ) {
    console.log('Instagram Login Two Factor Page');
    const verificationCode = await waitForTwoFactor();
    await page.type('input[name="verificationCode"]', verificationCode, {
      delay: 30,
    });
    await page.click('button[type="button"]');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    await page.waitForTimeout(15000);
  }

  if (page.url().includes('https://www.instagram.com/accounts/onetap')) {
    console.log('Instagram Login Onetap Page');
    await page.click('button[type="button"]');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    await page.waitForTimeout(15000);
  }

  await page.close();

  const storage = await context.storageState();

  console.log('getStorageStateAfterInstagramLogin', storage);

  return JSON.stringify(storage);
};

export const grabAllLinksFromSearchTagPage = async (
  browserContext: BrowserContext,
  searchString: string,
  searchStringsBySearchRawData: IGenerateSearchStringsBySearchRawData,
): Promise<void> => {
  try {
    console.log(searchStringsBySearchRawData[searchString]);
    const page = await browserContext.newPage();
    await page.goto(
      createInstagramUrlForSearch(
        searchStringsBySearchRawData[searchString].companyName,
      ),
      {
        waitUntil: 'networkidle',
      },
    );

    await page.waitForTimeout(15000);
  } catch (e) {
    console.log('Error while grabAllLinksFromSearchTagPage', e);
    // return {};
  }
};
