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

export interface IGenerateSearchCompanyOrProductsStringBySearchRawData
  extends IGenerateSearchStringBySearchRawData {
  incidentKeywords: string[];
}

export type IGenerateSearchStringsBySearchRawData = {
  [key in string]: IGenerateSearchStringBySearchRawData;
};

export type IGenerateSearchStringsCompanyOrProductsBySearchRawData = {
  [key in string]: IGenerateSearchCompanyOrProductsStringBySearchRawData;
};

export type ILinksFromSearchPostPage = {
  [key in string]: IGenerateSearchStringBySearchRawData;
};

export type ILinksFromSearchTagPage = {
  [key in string]: {
    companyName: string;
    tag: string;
    matchedIncidentKeywords: string[];
  };
};

export interface IInstagramJsonResponseMedia {
  media: {
    code: string;
    caption: {
      text?: string;
    };
  };
}
export interface IInstagramJsonResponseSection {
  layout_content: {
    medias: IInstagramJsonResponseMedia[];
  };
}
export type IInstagramJsonResponseSections = IInstagramJsonResponseSection[];

export interface IInstagramJsonResponse {
  data?: {
    top: {
      sections?: IInstagramJsonResponseSections;
    };
    recent: {
      sections: IInstagramJsonResponseSections;
      more_available: boolean;
      next_max_id: string;
    };
  };
}
