import { BrowserContext } from 'playwright';
import {
  FACEBOOK_FILTERS_STRING,
  FACEBOOK_AFTER_SEARCH_LINK_SELECTOR,
} from './constants';
import {
  IUserCredentials,
  IGenerateSearchStringsBySearchRawData,
  ILinksFromSearchPostPage,
} from './types';

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
  await page.type('#email', userCredentials.username, { delay: 30 });
  await page.type('#pass', userCredentials.password, { delay: 30 });
  await page.click('#loginbutton');
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  await page.waitForTimeout(15000);
  await page.close();

  const storage = await context.storageState();

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
    await page.goto(createFacebookUrlForSearch(searchString), {
      waitUntil: 'networkidle',
    });

    const linksElements = await page.$$(FACEBOOK_AFTER_SEARCH_LINK_SELECTOR);
    const links: ILinksFromSearchPostPage = {};

    for await (const link of linksElements) {
      const key = await link.getAttribute('href');
      if (key != null) {
        links[key] = searchStringsBySearchRawData[searchString];
      }
    }

    await page.close();
    return links;
  } catch (e) {
    console.log('Error while grabAllLinksFromSearchPostPage', e);
    return {};
  }
};
