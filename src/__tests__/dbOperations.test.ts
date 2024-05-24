import fs from 'fs';
import { Client } from 'pg';

import util from 'util';
import { executeSQLFile, loadCSVToPostgres, copyFileToDocker } from '../db/dbOperations';

jest.mock('fs');
jest.mock('pg');
jest.mock('util', () => ({
  promisify: jest.fn((fn) => fn),
}));

const mockClient = new Client();

describe('executeSQLFile', () => {
    it('should execute SQL file', async () => {
        const mockFilePath = 'path/to/file.sql';
        jest.spyOn(fs, 'readFileSync').mockReturnValue('SQL QUERY');
        await executeSQLFile(mockClient, mockFilePath);
        expect(mockClient.query).toHaveBeenCalledWith('SQL QUERY');
    });
});

describe('loadCSVToPostgres', () => {
  it('should load CSV data into PostgreSQL', async () => {
    const mockContainerName = 'container';
    const mockDestPath = 'path/to/dest';
    const mockTableName = 'table';
    const query = `COPY ${mockTableName} FROM '${mockDestPath}' WITH (FORMAT csv, HEADER true)`;
    await loadCSVToPostgres(
      mockClient,
      mockContainerName,
      mockDestPath,
      mockTableName,
    );
    expect(mockClient.query).toHaveBeenCalledWith(query);
  });
});

describe('copyFileToDocker', () => {
  it('should copy file to Docker container', async () => {
    const mockSrcPath = 'path/to/src';
    const mockContainerName = 'container';
    const mockDestPath = 'path/to/dest';
    await copyFileToDocker(mockSrcPath, mockContainerName, mockDestPath);
    expect(util.promisify).toHaveBeenCalled();
  });
});
