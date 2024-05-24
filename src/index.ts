// src/main.ts
import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';
import { readCSV, writeCSV } from './csv/csvOperations';
import { uploadToS3, downloadFromS3 } from './aws/s3Operations';
import {
  executeSQLFile,
  loadCSVToPostgres,
  copyFileToDocker,
} from './db/dbOperations';
import { parseArray, ensureArray } from './helpers/helperFunctions';
import { Artist } from './models/artists';
import { Track, TransformedTrack } from './models/tracks';
import {
  tracksFilePath,
  artistsFilePath,
  transformedDataFile,
  s3BucketName,
  createTablesFile,
  createTrackSummaryViewFile,
  createTracksWithFollowersViewFile,
  createMostEnergisingTracksViewFile,
} from './constants/constants';

dotenv.config();

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

    await loadCSVToPostgres(
      client,
      'local-postgres',
      '/data/transformed_data.csv',
      'tracks',
    );

    await executeSQLFile(client, createTrackSummaryViewFile);
    await executeSQLFile(client, createTracksWithFollowersViewFile);
    await executeSQLFile(client, createMostEnergisingTracksViewFile);

    await client.end();

    console.log('Data loaded into PostgreSQL successfully.');
  } catch (error) {
    console.error('Error processing CSV files', error);
  }
};

main().catch((error) => console.error('Error in main function', error));
