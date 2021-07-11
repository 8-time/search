import { BrowserContext, Page } from 'playwright';
import map from 'lodash/map';
import flatten from 'lodash/flatten';
import uniq from 'lodash/uniq';
import isEmpty from 'lodash/isEmpty';

import {
  INTERVAL_FOR_INSTAGRAM_TWO_FACTOR,
  MAX_TIME_FOR_INSTAGRAM_TWO_FACTOR,
  INSTAGRAM_PAGE_MAX_ATTEMPTS_SIZE,
} from './constants';
import {
  IUserCredentials,
  IGenerateSearchStringsCompanyOrProductsBySearchRawData,
  ILinksFromSearchTagPage,
  IInstagramJsonResponse,
  IInstagramJsonResponseResent,
} from './types';
import { getRandomNumberToMax, scrollPageToBottom } from './utils';

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

export const getTagByString = (searchString: string): string =>
  searchString.toLowerCase().replace(/ /g, '');

export const createInstagramUrlForSearch = (searchString: string): string => {
  return `https://www.instagram.com/explore/tags/${encodeURIComponent(
    getTagByString(searchString),
  )}`;
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
  await page.waitForTimeout(getRandomNumberToMax(5000));
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
    await page.waitForTimeout(getRandomNumberToMax(10000));
  }

  if (page.url().includes('https://www.instagram.com/accounts/onetap')) {
    console.log('Instagram Login Onetap Page');
    await page.click('button[type="button"]');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    await page.waitForTimeout(getRandomNumberToMax(10000));
  }

  const storage = await context.storageState();
  await page.waitForTimeout(getRandomNumberToMax(5000));
  await page.close();

  console.log('getStorageStateAfterInstagramLogin', storage);

  return JSON.stringify(storage);
};

async function* makeSeqOfRequest(
  attemptNumber: number,
  page: Page,
  searchString: string,
): AsyncGenerator<null | IInstagramJsonResponse['data'], null, void> {
  let countOfAttempts = 0;

  if (countOfAttempts === 0) {
    await page.goto(createInstagramUrlForSearch(searchString), {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(getRandomNumberToMax(10000));

    const resultHandle = await page.evaluateHandle(() => window.__initialData);
    const initialData = await resultHandle.jsonValue();
    await resultHandle.dispose();
    const fisrtPageData = initialData.data.entry_data.TagPage[0].data;
    yield fisrtPageData;
  }

  while (attemptNumber > countOfAttempts) {
    const [request] = await Promise.all([
      page.waitForRequest(/sections\//gi, { timeout: 0 }),
      scrollPageToBottom(page),
    ]);

    const response = await request.response();

    await page.waitForTimeout(getRandomNumberToMax(5000));

    if (response === null) {
      return null;
    }
    const json = (await response.json()) as IInstagramJsonResponseResent;

    if (json.sections == null) {
      return null;
    }

    countOfAttempts++;

    yield { recent: json };
  }

  return null;
}

export const grabAllLinksFromSearchTagPage = async (
  browserContext: BrowserContext,
  searchString: string,
  searchStringsBySearchRawData: IGenerateSearchStringsCompanyOrProductsBySearchRawData,
): Promise<ILinksFromSearchTagPage> => {
  try {
    const links: ILinksFromSearchTagPage = {};
    const page = await browserContext.newPage();
    const sections = [];
    const attemptSize =
      searchStringsBySearchRawData[searchString].searchOptions.instagram
        .pageMaxAttemptsSize ?? INSTAGRAM_PAGE_MAX_ATTEMPTS_SIZE;

    for await (const data of makeSeqOfRequest(
      attemptSize,
      page,
      searchString,
    )) {
      if (data != null) {
        sections.push(...data.recent.sections);
      }
    }

    if (isEmpty(sections)) {
      await page.close();
      return links;
    }

    const medias = flatten(
      map(sections, (section) => section.layout_content.medias),
    );

    map(medias, (media) => {
      const regIncidentExp = new RegExp(
        searchStringsBySearchRawData[searchString].incidentKeywords.join('|'),
        'ig',
      );

      const regCompanyExp = new RegExp(
        searchStringsBySearchRawData[searchString].companyName,
        'ig',
      );
      if (
        Boolean(media.media.caption) &&
        Boolean(media.media.caption.text) &&
        regCompanyExp.test(media.media.caption.text as string) &&
        regIncidentExp.test(media.media.caption.text as string)
      ) {
        links[`https://www.instagram.com/p/${media.media.code}/`] = {
          tag: getTagByString(searchString),
          companyName: searchStringsBySearchRawData[searchString].companyName,
          matchedIncidentKeywords: uniq(
            (media.media.caption.text as string).match(regIncidentExp),
          ),
        };
      }
    });

    await page.close();
    return links;
  } catch (e) {
    console.log('Error while grabAllLinksFromSearchTagPage', e);
    return {};
  }
};
