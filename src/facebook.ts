import { BrowserContext } from 'playwright';
import { IUserCredentials } from './types';

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
