import fs from 'fs';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';

type ObjectMap<T> = { [key: string]: T };

export const readCSV = <T extends ObjectMap<any>>(filePath: string): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const results: T[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: T) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

export const writeCSV = async <T extends ObjectMap<any>>(
  filePath: string,
  records: T[],
  headers: string[],
): Promise<void> => {
  console.log(`Starting writing ${filePath}`);
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: headers.map((header) => ({ id: header, title: header })),
  });
  await csvWriter.writeRecords(records);
  console.log(`Finished writing ${filePath}`);
};
