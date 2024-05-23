import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
import AWS from 'aws-sdk';
import { Client } from 'pg';
import dotenv from 'dotenv';
import { Artist } from './models/artists';
import { Track, TransformedTrack } from './models/tracks';
import { exec } from 'child_process';
import util from 'util';

dotenv.config();

type ObjectMap<T> = { [key: string]: T };

const artistsFilePath = path.join(__dirname, '../data/artists.csv');
const tracksFilePath = path.join(__dirname, '../data/tracks.csv');
const transformedDataFile = path.join(
  __dirname,
  '../data/transformed_data.csv',
);
const createTablesFile = path.join(
  __dirname,
  '../src/sql_scripts/create_tables.sql',
);

const s3BucketName = process.env.S3_BUCKET_NAME as string;
if (!s3BucketName) {
  throw new Error('S3_BUCKET_NAME environment variable is not set');
}

const readCSV = <T extends ObjectMap<any>>(filePath: string): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const results: T[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: T) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

const parseArray = (array: string | string[]): string[] => {
  if (Array.isArray(array)) {
    return array;
  }

  try {
    const cleanedArray = array.replace(/'/g, '"').replace(/^\[|\]$/g, '');
    return JSON.parse(`[${cleanedArray}]`);
  } catch (error) {
    return array
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((item) => item.trim().replace(/^'|'$/g, ''));
  }
};

const filterAndTransformTracks = (tracks: Track[]): TransformedTrack[] => {
  return tracks
    .filter((track) => track.name && track.duration_ms >= 60000)
    .map((track) => {
      const [year, month, day] = track.release_date.split('-').map(Number);
      let danceabilityLabel: string;
      if (track.danceability < 0.5) {
        danceabilityLabel = 'Low';
      } else if (track.danceability <= 0.6) {
        danceabilityLabel = 'Medium';
      } else {
        danceabilityLabel = 'High';
      }

      const idArtistsArray = parseArray(track.id_artists);

      return {
        ...track,
        release_year: year,
        release_month: month,
        release_day: day,
        danceability_label: danceabilityLabel,
        id_artists: `{${idArtistsArray.join(',')}}`,
        artists: parseArray(track.artists),
      };
    });
};

const filterArtists = async (
  artists: Artist[],
  tracks: TransformedTrack[],
): Promise<Artist[]> => {
  console.log('Starting to filter artists...');
  const trackArtistIds = new Set(
    tracks.flatMap((track) => track.id_artists.replace(/[{}]/g, '').split(',')),
  );

  return artists.filter((artist) => trackArtistIds.has(artist.id));
};

const ensureArray = (field: string | string[]): string[] => {
  if (Array.isArray(field)) {
    return field;
  }

  try {
    return JSON.parse(field);
  } catch (error) {
    return field.split(',').map((item) => item.trim());
  }
};

const handleEmptyValues = (
  value: string | undefined,
): string | number | null => {
  if (value === undefined || value === '') {
    return null;
  }
  if (!isNaN(Number(value))) {
    return Number(value);
  }
  return value;
};

const writeCSV = async <T extends ObjectMap<any>>(
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

const uploadToS3 = async (
  filePath: string,
  bucketName: string,
  key: string,
): Promise<void> => {
  const s3 = new AWS.S3();
  const fileStream = fs.createReadStream(filePath);

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: fileStream,
  };

  await s3.upload(params).promise();
  console.log(`File uploaded successfully to ${bucketName}/${key}`);
};

const downloadFromS3 = async (
  bucketName: string,
  key: string,
  downloadPath: string,
): Promise<void> => {
  const s3 = new AWS.S3();
  const params = {
    Bucket: bucketName,
    Key: key,
  };

  const data = await s3.getObject(params).promise();
  fs.writeFileSync(downloadPath, data.Body as Buffer);
  console.log(`File downloaded successfully from ${bucketName}/${key}`);
};

const execPromise = util.promisify(exec);

const copyFileToDocker = async (
  srcPath: string,
  containerName: string,
  destPath: string,
) => {
  // Create the directory inside the container
  const dir = path.dirname(destPath);
  await execPromise(`docker exec ${containerName} mkdir -p ${dir}`);
  
  // Copy the file to the container
  await execPromise(`docker cp ${srcPath} ${containerName}:${destPath}`);
  console.log(`File copied successfully to ${containerName}:${destPath}`);
};

const executeSQLFile = async (
  client: Client,
  filePath: string,
): Promise<void> => {
  const sql = fs.readFileSync(filePath, 'utf8');
  await client.query(sql);
  console.log(`SQL script ${filePath} executed successfully.`);
};

const loadCSVToPostgres = async (
  client: Client,
  containerName: string,
  destPath: string,
  tableName: string,
): Promise<void> => {
  const query = `COPY ${tableName} FROM '${destPath}' WITH (FORMAT csv, HEADER true)`;
  await client.query(query);
  console.log(`CSV data loaded into ${tableName}`);
};

const main = async () => {
  try {
    console.log('Starting script...');
    const tracks = await readCSV<Track>(tracksFilePath);
    console.log(`Loaded ${tracks.length} tracks`);

    const artists = await readCSV<Artist>(artistsFilePath);
    console.log(`Loaded ${artists.length} artists`);

    const filteredTracks = filterAndTransformTracks(tracks);
    console.log(`Filtered down to ${filteredTracks.length} tracks`);

    const filteredArtists = await filterArtists(artists, filteredTracks);
    console.log(`Filtered down to ${filteredArtists.length} artists`);

    const artistLookup = new Map(
      filteredArtists.map((artist) => [artist.id, artist]),
    );

    console.log('Processing tracks, please wait...');
    const combinedData = filteredTracks.map((track) => {
      const artist = artistLookup.get(track.id_artists.replace(/[{}]/g, ''));
      const genres = artist ? ensureArray(artist.genres).join(', ') : '';

      return {
        ...track,
        artist_name: artist ? artist.name : 'Unknown',
        artist_followers: artist ? artist.followers : 0,
        artist_genres: genres,
        artist_popularity: artist ? artist.popularity : 0,
      };
    });

    await writeCSV(transformedDataFile, combinedData, [
      'id',
      'name',
      'popularity',
      'duration_ms',
      'explicit',
      'artists',
      'id_artists',
      'energy',
      'key',
      'loudness',
      'mode',
      'speechiness',
      'acousticness',
      'instrumentalness',
      'liveness',
      'valence',
      'tempo',
      'time_signature',
      'release_year',
      'release_month',
      'release_day',
      'danceability_label',
      'artist_followers',
      'artist_genres',
      'artist_popularity',
    ]);

    console.log('Data transformation complete.');

    await uploadToS3(transformedDataFile, s3BucketName, 'transformed_data.csv');

    const client = new Client({
      user: process.env.PG_USER,
      host: 'localhost',
      database: process.env.PG_DATABASE,
      password: process.env.PG_PASSWORD,
      port: parseInt(process.env.PG_PORT as string, 10),
    });

    await client.connect();

    await executeSQLFile(client, createTablesFile);

    await downloadFromS3(
      s3BucketName,
      'transformed_data.csv',
      transformedDataFile,
    );

    console.log('Copying file to Docker container...');
    await copyFileToDocker(
      transformedDataFile,
      'local-postgres',
      '/data/transformed_data.csv',
    );
    console.log('File copied to Docker container successfully');

    await loadCSVToPostgres(client, 'local-postgres', '/data/transformed_data.csv', 'tracks');

    await client.end();

    console.log('Data loaded into PostgreSQL successfully.');
  } catch (error) {
    console.error('Error processing CSV files', error);
  }
};

main().catch((error) => console.error('Error in main function', error));