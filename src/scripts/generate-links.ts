import yargs from 'yargs/yargs';
import * as fs from 'fs/promises';
import { hideBin } from 'yargs/helpers';
import { Arguments } from 'yargs-parser';
import keys from 'lodash/keys';
import {
  generateSearchStringsBySearchRawData,
  generateSearchStringsCompanyOrProductsBySearchRawData,
  getSearchStringsByBrowserContexts,
  getTypeForBrowserContextByUserCredentialsKey,
} from '../utils';
import {
  INSTAGRAM_PAGE_MAX_ATTEMPTS_SIZE,
  FACEBOOK_PAGE_MAX_ATTEMPTS_SIZE,
} from '../constants';
import { createInstagramUrlForSearch } from '../instagram';
import { createFacebookUrlForSearch } from '../facebook';
import { IUserCredentials, ISearchRawData } from '../types';
import {
  addLinksByCompanyOrProducts,
  removeAllLinksByCompanyOrProducts,
  removeLinksByCompanyProductsIncidentKeywords,
  addLinksByCompanyProductsIncidentKeywords,
} from '../db';

void (async function () {
  const userCredentials: IUserCredentials[] = JSON.parse(
    await fs.readFile('userCredentials.json', 'utf-8'),
  );
  const searchRawData: ISearchRawData[] = JSON.parse(
    await fs.readFile('searchRawData.json', 'utf-8'),
  );

  await yargs(hideBin(process.argv))
    .usage('Usage: $0 <command>')
    .command(
      'links-by-company-products-incident-keywords',
      'Will generate links by company products incident keywords',
      () => {},
      (argv: Arguments) => {
        async function make(): Promise<void> {
          const searchStringsBySearchRawData =
            generateSearchStringsBySearchRawData(searchRawData);

          const searchStringsByBrowserContexts =
            getSearchStringsByBrowserContexts(
              userCredentials,
              searchStringsBySearchRawData,
            );

          const links: Array<Array<string | number>> = [];

          for (const key of keys(searchStringsByBrowserContexts)) {
            for (const searchString of searchStringsByBrowserContexts[key]) {
              if (
                getTypeForBrowserContextByUserCredentialsKey(key) === 'facebook'
              ) {
                links.push([
                  key,
                  createFacebookUrlForSearch(searchString),
                  searchStringsBySearchRawData[searchString].searchOptions
                    .facebook.pageMaxAttemptsSize ??
                    FACEBOOK_PAGE_MAX_ATTEMPTS_SIZE,
                ]);
              }
            }
          }

          console.log(await removeLinksByCompanyProductsIncidentKeywords());
          console.log(await addLinksByCompanyProductsIncidentKeywords(links));
        }

        void make();
      },
    )
    .command(
      'links-by-company-or-products',
      'Will generate links by company or products',
      () => {},
      (argv: Arguments) => {
        async function make(): Promise<void> {
          const searchStringsCompanyOrProductsBySearchRawData =
            generateSearchStringsCompanyOrProductsBySearchRawData(
              searchRawData,
            );

          const searchStringsCompanyOrProductsByBrowserContexts =
            getSearchStringsByBrowserContexts(
              userCredentials,
              searchStringsCompanyOrProductsBySearchRawData,
            );

          const links: Array<Array<string | number>> = [];

          for (const key of keys(
            searchStringsCompanyOrProductsByBrowserContexts,
          )) {
            for (const searchString of searchStringsCompanyOrProductsByBrowserContexts[
              key
            ]) {
              if (
                getTypeForBrowserContextByUserCredentialsKey(key) ===
                'instagram'
              ) {
                links.push([
                  key,
                  createInstagramUrlForSearch(searchString),
                  searchStringsCompanyOrProductsBySearchRawData[searchString]
                    .searchOptions.instagram.pageMaxAttemptsSize ??
                    INSTAGRAM_PAGE_MAX_ATTEMPTS_SIZE,
                ]);
              }
            }
          }

          console.log(await removeAllLinksByCompanyOrProducts());
          console.log(await addLinksByCompanyOrProducts(links));
        }

        void make();
      },
    )
    .strictCommands()
    .demandCommand(1).argv;
})();
