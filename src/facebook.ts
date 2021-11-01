import { range, size } from 'lodash';
import { BrowserContext } from 'playwright';
import {
  FACEBOOK_FILTERS_STRING,
  FACEBOOK_AFTER_SEARCH_LINK_SELECTOR,
  FACEBOOK_PAGE_MAX_ATTEMPTS_SIZE,
} from './constants';
import {
  IUserCredentials,
  IGenerateSearchStringsBySearchRawData,
  ILinksFromSearchPostPage,
} from './types';
import {
  getRandomNumberToMax,
  isUserIsLogIn,
  scrollPageToBottom,
} from './utils';
import { waitForTwoFactorCode } from './utils/two-factor';
import { removeTwoFactorCode } from './db';

export const getStorageStateAfterFacebookLogin = async (
  userCredentials: IUserCredentials,
  context: BrowserContext,
): Promise<string> => {
  const page = await context.newPage();
  const pageContext = page.context();
  await pageContext.grantPermissions([]);

  page.setDefaultNavigationTimeout(getRandomNumberToMax(200000, 100000));

  await page.goto('https://www.facebook.com/login', {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(getRandomNumberToMax(15000, 3000));
  await page.type('#email', userCredentials.username, {
    delay: getRandomNumberToMax(30, 5),
  });
  await page.type('#pass', userCredentials.password, {
    delay: getRandomNumberToMax(30, 5),
  });
  await page.click('#loginbutton');
  await page.waitForNavigation({ waitUntil: 'networkidle' });

  await page.waitForTimeout(getRandomNumberToMax(15000, 3000));
  await page.waitForTimeout(15000);

  if (page.url().includes('https://www.facebook.com/checkpoint/?next')) {
    console.log('Facebook Login Two Factor Page');
    await page.click('#checkpointBottomBar a[role="button"]');
    await page.waitForTimeout(getRandomNumberToMax(5000, 3000));

    await page.click('a[role="button"]:near(.fbSettingsHangingMessage)');

    await page.waitForTimeout(getRandomNumberToMax(5000, 3000));

    await page.mouse.click(
      getRandomNumberToMax(200, 100),
      getRandomNumberToMax(200, 100),
    );

    const verificationCode = await waitForTwoFactorCode(userCredentials);

    await removeTwoFactorCode(userCredentials.username, userCredentials.type);

    await page.type('input[name="approvals_code"]', verificationCode, {
      delay: 30,
    });

    await page.waitForTimeout(getRandomNumberToMax(5000, 3000));

    while (size(await page.$$('button[type="submit"]')) > 0) {
      await page.click('button[type="submit"]');
      await page.waitForTimeout(getRandomNumberToMax(10000, 6000));
    }

    await page.waitForTimeout(getRandomNumberToMax(10000, 6000));
  }

  if (!(await isUserIsLogIn(context, userCredentials.type))) {
    throw new Error(
      'Error in function getStorageStateAfterFacebookLogin not able to login user',
    );
  }
  await page.waitForTimeout(getRandomNumberToMax(10000, 2000));
  await page.close();

  const storage = await context.storageState();

  return JSON.stringify(storage);
};

export const createFacebookUrlForSearch = (
  searchString: string,
  filter = FACEBOOK_FILTERS_STRING,
): string => {
  return `https://www.facebook.com/search/posts?q=${encodeURIComponent(
    searchString,
  )}${filter}`;
};

export const grabAllLinksFromSearchPostPage = async (
  browserContext: BrowserContext,
  searchString: string,
  searchStringsBySearchRawData: IGenerateSearchStringsBySearchRawData,
): Promise<ILinksFromSearchPostPage> => {
  try {
    const page = await browserContext.newPage();
    const attemptSize =
      searchStringsBySearchRawData[searchString].searchOptions.facebook
        .pageMaxAttemptsSize ?? FACEBOOK_PAGE_MAX_ATTEMPTS_SIZE;
    await page.goto(createFacebookUrlForSearch(searchString), {
      waitUntil: 'load',
      timeout: 0,
    });

    await page.waitForTimeout(getRandomNumberToMax(4000, 1000));

    for await (const stepIndex of range(attemptSize)) {
      try {
        await Promise.race([
          page.waitForTimeout(getRandomNumberToMax(4000, 2000)),
          scrollPageToBottom(page),
        ]);
      } catch (e) {
        console.log(
          `Error grabAllLinksFromSearchPostPage while stepIndex ${stepIndex}`,
        );
        break;
      }
    }
    const linksElements = await page.$$(FACEBOOK_AFTER_SEARCH_LINK_SELECTOR);
    const links: ILinksFromSearchPostPage = {};

    console.log(size(linksElements));

    for await (const link of linksElements) {
      const key = await link.getAttribute('href');
      // console.log(await link.textContent());
      if (key != null) {
        links[key] = searchStringsBySearchRawData[searchString];
      }
    }

    await page.waitForTimeout(getRandomNumberToMax(7000, 1000));
    await page.close();
    return links;
  } catch (e) {
    console.log('Error while grabAllLinksFromSearchPostPage', e);
    return {};
  }
};
