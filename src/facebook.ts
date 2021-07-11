import { range } from 'lodash';
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
import { getRandomNumberToMax, scrollPageToBottom } from './utils';

export const getStorageStateAfterFacebookLogin = async (
  userCredentials: IUserCredentials,
  context: BrowserContext,
): Promise<string> => {
  const page = await context.newPage();
  const pageContext = page.context();
  await pageContext.grantPermissions([]);

  page.setDefaultNavigationTimeout(100000);

  await page.goto('https://www.facebook.com/login', {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(getRandomNumberToMax(5000));
  await page.type('#email', userCredentials.username, { delay: 30 });
  await page.type('#pass', userCredentials.password, { delay: 30 });
  await page.click('#loginbutton');
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  await page.waitForTimeout(15000);

  const storage = await context.storageState();
  await page.waitForTimeout(getRandomNumberToMax(5000));
  await page.close();

  console.log('getStorageStateAfterFacebookLogin', storage);

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
      searchStringsBySearchRawData[searchString].searchOptions.instagram
        .pageMaxAttemptsSize ?? FACEBOOK_PAGE_MAX_ATTEMPTS_SIZE;
    await page.goto(createFacebookUrlForSearch(searchString), {
      waitUntil: 'load',
    });

    await page.waitForTimeout(getRandomNumberToMax(4000));

    for await (const stepIndex of range(attemptSize)) {
      try {
        await Promise.all([
          page.waitForTimeout(getRandomNumberToMax(5000)),
          scrollPageToBottom(page),
        ]);
      } catch (e) {
        console.log(
          `grabAllLinksFromSearchPostPage while stepIndex ${stepIndex}`,
        );
      }
    }
    const linksElements = await page.$$(FACEBOOK_AFTER_SEARCH_LINK_SELECTOR);
    const links: ILinksFromSearchPostPage = {};

    for await (const link of linksElements) {
      const key = await link.getAttribute('href');
      // console.log(await link.textContent());
      if (key != null) {
        links[key] = searchStringsBySearchRawData[searchString];
      }
    }

    await page.waitForTimeout(getRandomNumberToMax(3000));
    await page.close();
    return links;
  } catch (e) {
    console.log('Error while grabAllLinksFromSearchPostPage', e);
    return {};
  }
};
