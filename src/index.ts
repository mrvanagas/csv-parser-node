import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
import AWS from 'aws-sdk';
import { Client } from 'pg';
import { Artist } from './models/artists';
import { Track, TransformedTrack } from './models/tracks';
import dotenv from 'dotenv';

dotenv.config();

type ObjectMap<T> = { [key: string]: T };

const artistsFilePath = path.join(__dirname, '../data/artists.csv');
const tracksFilePath = path.join(__dirname, '../data/tracks.csv');
const transformedDataFile = path.join(
  __dirname,
  '../data/transformed_data.csv',
);

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

const parseIdArtists = (id_artists: string | string[]): string[] => {
  if (Array.isArray(id_artists)) {
    return id_artists;
  }

  try {
    const cleanedIdArtists = id_artists
      .replace(/'/g, '"')
      .replace(/^\[|\]$/g, '');
    return JSON.parse(`[${cleanedIdArtists}]`);
  } catch (error) {
    return id_artists
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((id) => id.trim().replace(/^'|'$/g, ''));
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

      const idArtistsArray = parseIdArtists(track.id_artists);

      return {
        ...track,
        release_year: year,
        release_month: month,
        release_day: day,
        danceability_label: danceabilityLabel,
        id_artists: `{${idArtistsArray.join(',')}}`,
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
  console.log('Track artist IDs:', Array.from(trackArtistIds));

  const filteredArtists = artists.filter((artist) =>
    trackArtistIds.has(artist.id),
  );
  console.log('Filtered artists:', filteredArtists);

  return filteredArtists;
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

    const artistLookup = new Map(filteredArtists.map(artist => [artist.id, artist]));

    const combinedData = filteredTracks.map((track) => {
      console.log('Processing tracks, please wait...');
    
      const artist = artistLookup.get(track.id_artists);
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
      'release_date',
      'danceability',
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
      'artist_name',
      'artist_followers',
      'artist_genres',
      'artist_popularity',
    ]);

    console.log('Data transformation complete.');
  } catch (error) {
    console.error('Error processing CSV files', error);
  }
};

main().catch((error) => console.error('Error in main function', error));

// import * as fs from 'fs';
// import * as path from 'path';
// import csv from 'csv-parser';
// import { Artist } from './models/artists';
// import { Track } from './models/tracks';
// import { createObjectCsvWriter } from 'csv-writer';
// import { Parser } from 'json2csv';

// const artistsFilePath = path.resolve(__dirname, '../data/artists.csv');
// const tracksFilePath = path.resolve(__dirname, '../data/tracks.csv');
// const outputFilePath = path.resolve(__dirname, '../data/joined.csv');

// // Read CSV file
// function readCSV(filePath: string): Promise<any[]> {
//   return new Promise((resolve, reject) => {
//     const results: any[] = [];
//     fs.createReadStream(filePath)
//       .pipe(csv())
//       .on('data', (data) => results.push(data))
//       .on('end', () => resolve(results))
//       .on('error', (error) => reject(error));
//   });
// }

// // Filter tracks
// function filterTracks(tracks: Track[]): Track[] {
//   return tracks.filter((track) => track.name && track.duration_ms >= 60000);
// }

// // Filter artists
// function filterArtists(tracks: any[], artists: any[]): any[] {
//   const artistIds = new Set(
//     tracks
//       .map((track) => {
//         const parsedIds = track.id_artists
//           .slice(1, -1)
//           .split(',')
//           .map((id: string) => id.trim().replace(/'/g, ''));
//         return parsedIds;
//       })
//       .flat(),
//   );
//   return artists.filter((artist) => artistIds.has(artist.id));
// }

// // Transform data
// function transformData(tracks: any[]): any[] {
//   return tracks.map((track) => {
//     const [year, month, day] = track.release_date.split('-');
//     let danceability;
//     if (track.danceability < 0.5) {
//       danceability = 'Low';
//     } else if (track.danceability <= 0.6) {
//       danceability = 'Medium';
//     } else {
//       danceability = 'High';
//     }
//     return {
//       ...track,
//       year,
//       month,
//       day,
//       danceability,
//     };
//   });
// }

// // Combine data
// function combineData(tracks: any[], artists: any[]): any[] {
//   const artistMap = new Map(artists.map((artist) => [artist.id, artist]));
//   return tracks.map((track) => {
//     const artistIds = track.id_artists
//       .slice(1, -1)
//       .split(',')
//       .map((id: string) => id.trim().replace(/'/g, ''));
//     const mainArtist = artistMap.get(artistIds[0]);
//     return {
//       ...track,
//       artist_name: mainArtist.name,
//       artist_followers: mainArtist.followers,
//       artist_genres: mainArtist.genres,
//     };
//   });
// }

// // Write CSV file
// function writeCSV(filePath: string, data: any[]): void {
//   const header = Object.keys(data[0]).join(',') + '\n';
//   const csvData = data.map((row) => Object.values(row).join(',')).join('\n');
//   fs.writeFileSync(filePath, header + csvData);
// }

// // Main function
// async function main() {
//   const artists = await readCSV(path.resolve(__dirname, artistsFilePath));
//   const tracks = await readCSV(path.resolve(__dirname, tracksFilePath));

//   const filteredTracks = filterTracks(tracks);
//   const filteredArtists = filterArtists(filteredTracks, artists);
//   const transformedTracks = transformData(filteredTracks);
//   const combinedData = combineData(transformedTracks, filteredArtists);

//   writeCSV(path.resolve(__dirname, outputFilePath), combinedData);
// }

// main().catch(console.error);

// // Arrays to store the data
// const artists: Artist[] = [];
// const tracks: Track[] = [];

// // Function to load CSV data
// const loadCSV = (filePath: string): Promise<any[]> => {
//   return new Promise((resolve, reject) => {
//     const results: any[] = [];
//     fs.createReadStream(filePath)
//       .pipe(csv())
//       .on('data', (data) => results.push(data))
//       .on('end', () => resolve(results))
//       .on('error', (error) => reject(error));
//   });
// };

// // Helper function to safely parse JSON
// const safeParseJSON = (json: string): any => {
//     try {
//       return JSON.parse(json.replace(/'/g, '"'));
//     } catch (error) {
//       return [];
//     }
//   };

//   // Functions to parse the CSV data into the appropriate interfaces
//   const parseArtists = (data: any[]): Artist[] => {
//     return data.map((row) => ({
//       id: row.id,
//       followers: parseFloat(row.followers),
//       genres: safeParseJSON(row.genres),
//       name: row.name,
//       popularity: parseInt(row.popularity, 10),
//     }));
//   };

// const parseTracks = (data: any[]): Track[] => {
//   return data.map((row) => ({
//     id: row.id,
//     name: row.name,
//     popularity: parseInt(row.popularity, 10),
//     duration_ms: parseInt(row.duration_ms, 10),
//     explicit: parseInt(row.explicit),
//     artists: safeParseJSON(row.artists),
//     id_artists: safeParseJSON(row.id_artists),
//     release_date: row.release_date,
//     danceability: parseFloat(row.danceability),
//     energy: parseFloat(row.energy),
//     key: parseInt(row.key, 10),
//     loudness: parseFloat(row.loudness),
//     mode: parseInt(row.mode, 10),
//     speechiness: parseFloat(row.speechiness),
//     acousticness: parseFloat(row.acousticness),
//     instrumentalness: parseFloat(row.instrumentalness),
//     liveness: parseFloat(row.liveness),
//     valence: parseFloat(row.valence),
//     tempo: parseFloat(row.tempo),
//     time_signature: parseInt(row.time_signature, 10),
//   }));
// };

// // Function to filter and transform the data
// const filterAndTransformData = (artists: Artist[], tracks: Track[]) => {
//   const filteredTracks = tracks.filter((track) => {
//     return track.name && track.duration_ms >= 60000;
//   });

//   const artistIdsWithValidTracks = new Set(
//     filteredTracks.flatMap((track) => track.id_artists),
//   );

//   const filteredArtists = artists.filter((artist) =>
//     artistIdsWithValidTracks.has(artist.id),
//   );

//   const transformedTracks = filteredTracks.map((track) => {
//     const [year, month, day] = track.release_date.split('-').map(Number);
//     let danceability: string;
//     if (track.danceability < 0.5) {
//       danceability = 'Low';
//     } else if (track.danceability <= 0.6) {
//       danceability = 'Medium';
//     } else {
//       danceability = 'High';
//     }
//     return {
//       ...track,
//       year,
//       month,
//       day,
//       danceability,
//     };
//   });

//   const joinedData = transformedTracks.map((track) => {
//     const artist = filteredArtists.find(
//       (artist) => artist.id === track.id_artists[0],
//     );
//     return {
//       ...track,
//       artist_name: artist ? artist.name : '',
//       artist_followers: artist ? artist.followers : 0,
//       artist_genres: artist ? artist.genres.join(', ') : '',
//       artist_popularity: artist ? artist.popularity : 0,
//     };
//   });

//   console.log('Filtered and transformed tracks:', transformedTracks.length);
//   console.log('Filtered artists:', filteredArtists.length);
//   console.log('Joined data:', joinedData.length);

//   return joinedData;
// };

// // Function to save data to CSV
// const saveToCSV = (data: any[], filePath: string) => {
//   if (data.length === 0) {
//     console.error('No data to save.');
//     return;
//   }

//   const parser = new Parser();
//   const csv = parser.parse(data);
//   fs.writeFileSync(filePath, csv);
// };

// // Load the data and perform the transformations
// const processFiles = async () => {
//   try {
//     const artistsData = await loadCSV(path.resolve(__dirname, artistsFilePath));
//     const tracksData = await loadCSV(path.resolve(__dirname, tracksFilePath));

//     const parsedArtists = parseArtists(artistsData);
//     const parsedTracks = parseTracks(tracksData);

//     const joinedData = filterAndTransformData(parsedArtists, parsedTracks);

//     if (joinedData.length > 0) {
//       saveToCSV(joinedData, path.resolve(__dirname, outputFilePath));
//     } else {
//       console.error('No joined data to save.');
//     }
//   } catch (error) {
//     console.error('Error processing files:', error);
//   }
// };

// processFiles();
