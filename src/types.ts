import { BrowserContext } from 'playwright';

export type TYPES = 'facebook';
export interface IUserCredentials {
  type: TYPES;
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
