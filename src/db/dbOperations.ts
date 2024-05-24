import fs from 'fs';
import { Client } from 'pg';
import util from 'util';
import path from 'path';
import { exec } from 'child_process';

const execPromise = util.promisify(exec);

export const executeSQLFile = async (
  client: Client,
  filePath: string,
): Promise<void> => {
  const sql = fs.readFileSync(filePath, 'utf8');
  await client.query(sql);
  console.log(`SQL script ${filePath} executed successfully.`);
};

export const loadCSVToPostgres = async (
  client: Client,
  containerName: string,
  destPath: string,
  tableName: string,
): Promise<void> => {
  const query = `COPY ${tableName} FROM '${destPath}' WITH (FORMAT csv, HEADER true)`;
  await client.query(query);
  console.log(`CSV data loaded into ${tableName}`);
};

export const copyFileToDocker = async (
  srcPath: string,
  containerName: string,
  destPath: string,
) => {
  const dir = path.dirname(destPath);
  await execPromise(`docker exec ${containerName} mkdir -p ${dir}`);
  await execPromise(`docker cp ${srcPath} ${containerName}:${destPath}`);
  console.log(`File copied successfully to ${containerName}:${destPath}`);
};
