import sqlite3 from 'sqlite3';
import { IUserCredentialsTypes } from '../types';
import flatten from 'lodash/flatten';
import fill from 'lodash/fill';
import size from 'lodash/size';


const sql = sqlite3.verbose();
const db = new sql.Database(process.env.DB_FILE_NAME as string);

export default db;

export const addTwoFactorCode = async (
  username: string,
  code: string,
  type: IUserCredentialsTypes,
): Promise<string> => {
  return await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO 'two-factor-codes' (username,code,type) VALUES(?, ?, ?)`,
      [username, code, type],
      function (error) {
        if (error !== null) {
          reject(error.message);
          return;
        }

        resolve(`Two factor code has been inserted with id ${this.lastID}`);
      },
    );
  });
};

export const getTwoFactorCode = async (
  username: string,
  type: string,
): Promise<string | undefined> => {
  return await new Promise((resolve, reject) => {
    db.get(
      `SELECT code FROM 'two-factor-codes' WHERE username=(?) AND type =(?)`,
      [username, type],
      function (error, row) {
        if (error !== null) {
          reject(error.message);
          return;
        }

        resolve(row?.code);
      },
    );
  });
};

export const removeTwoFactorCode = async (
  username: string,
  type: string,
): Promise<string> => {
  return await new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM 'two-factor-codes' WHERE username=(?) AND type =(?)`,
      [username, type],
      function (error) {
        if (error !== null) {
          reject(error.message);
          return;
        }

        resolve(`Removed ${this.changes} rows`);
      },
    );
  });
};

export const removeAllLinksByCompanyOrProducts = async (): Promise<string> => {
  return await new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM 'links-by-company-or-products'`,
      [],
      function (error) {
        if (error !== null) {
          reject(error.message);
          return;
        }

        resolve(`Removed ${this.changes} rows`);
      },
    );
  });
};

export const addLinksByCompanyOrProducts = async (
  values: Array<Array<string|number>>,
): Promise<string> => {
  return await new Promise((resolve, reject) => {
    db.run(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `INSERT INTO 'links-by-company-or-products' (type,link,depth) VALUES ${fill(Array(size(values)), "(?, ?, ?)").join(",")}`,
      flatten(values),
      function (error) {
        if (error !== null) {
          reject(error.message);
          return;
        }

        resolve(`Add ${this.changes} links by company or products`);
      },
    );
  });
};

export const removeLinksByCompanyProductsIncidentKeywords = async (): Promise<string> => {
  return await new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM 'links-by-company-products-incident-keywords'`,
      [],
      function (error) {
        if (error !== null) {
          reject(error.message);
          return;
        }

        resolve(`Removed ${this.changes} rows`);
      },
    );
  });
};

export const addLinksByCompanyProductsIncidentKeywords = async (
  values: Array<Array<string|number>>,
): Promise<string> => {
  return await new Promise((resolve, reject) => {
    db.run(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `INSERT INTO 'links-by-company-products-incident-keywords' (type,link,depth) VALUES ${fill(Array(size(values)), "(?, ?, ?)").join(",")}`,
      flatten(values),
      function (error) {
        if (error !== null) {
          reject(error.message);
          return;
        }

        resolve(`Add ${this.changes} links by company products incident keywords`);
      },
    );
  });
};