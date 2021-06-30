import { BrowserContext } from 'playwright';

export type IUserCredentialsTypes = 'facebook' | 'instagram';
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

export interface IGenerateSearchStringBySearchRawData {
  companyName: string;
  searchString: string;
}

export type IGenerateSearchStringsBySearchRawData = {
  [key in string]: IGenerateSearchStringBySearchRawData;
};

export type ILinksFromSearchPostPage = {
  [key in string]: IGenerateSearchStringBySearchRawData;
};
