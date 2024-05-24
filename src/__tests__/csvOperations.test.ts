import fs from 'fs';
import { readCSV, writeCSV } from '../csv/csvOperations';
import { createObjectCsvWriter } from 'csv-writer';

jest.mock('fs');
jest.mock('csv-parser', () => jest.fn());
jest.mock('csv-writer', () => ({
  createObjectCsvWriter: jest.fn(() => ({
    writeRecords: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('readCSV', () => {
  it('should read CSV file and return data', async () => {
    const mockFilePath = 'path/to/file';
    const mockData = [{ test: 'data' }];

    const mockStream = {
      pipe: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation(function (this: any, event, callback) {
        if (event === 'data') {
          callback(mockData[0]);
        } else if (event === 'end') {
          callback();
        }
        return this;
      }),
    } as unknown as fs.ReadStream;

    (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

    const result = await readCSV<{ test: string }>(mockFilePath);
    expect(result).toEqual(mockData);
  });
});

describe('writeCSV', () => {
  it('should write data to CSV file', async () => {
    const mockFilePath = 'path/to/file';
    const mockData = [{ test: 'data' }];
    const mockHeaders = ['test'];

    const mockCsvWriter = {
      writeRecords: jest.fn().mockResolvedValue(undefined),
    };
    (createObjectCsvWriter as jest.Mock).mockReturnValue(mockCsvWriter);

    await writeCSV(mockFilePath, mockData, mockHeaders);

    expect(createObjectCsvWriter).toHaveBeenCalledWith({
      path: mockFilePath,
      header: mockHeaders.map((header) => ({ id: header, title: header })),
    });
    expect(mockCsvWriter.writeRecords).toHaveBeenCalledWith(mockData);
  });
});
