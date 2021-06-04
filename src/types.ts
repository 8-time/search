import { BrowserContext } from 'playwright';

export type IUserCredentialsTypes = 'facebook';
export interface IUserCredentials {
  type: IUserCredentialsTypes;
  username: string;
  password: string;
}

export interface ISearchRawData {
  companyName: string;
  productNames?: string[];
  incidentKeywords: string[];
}

export type IBrowserContextByUserCredentials = {
  [key in string]: BrowserContext;
};

export type ISearchStringsByBrowserContexts = {
  [key in string]: string[] | undefined;
};

export type IGenerateSearchStringsBySearchRawData = {
  [key in string]: { companyName: string };
};
