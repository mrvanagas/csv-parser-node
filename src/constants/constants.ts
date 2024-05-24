import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const rootDir = path.resolve(__dirname, '..', '..');

export const artistsFilePath = path.join(rootDir, 'data', 'artists.csv');
export const tracksFilePath = path.join(rootDir, 'data', 'tracks.csv');
export const transformedDataFile = path.join(
  rootDir,
  'data',
  'transformed_data.csv',
);
export const createTablesFile = path.join(
  rootDir,
  'src',
  'sql_scripts',
  'create_tables.sql',
);
export const createTrackSummaryViewFile = path.join(
  rootDir,
  'src',
  'sql_scripts',
  'create_track_summary_view.sql',
);
export const createTracksWithFollowersViewFile = path.join(
  rootDir,
  'src',
  'sql_scripts',
  'create_tracks_with_artist_followers_view.sql',
);
export const createMostEnergisingTracksViewFile = path.join(
  rootDir,
  'src',
  'sql_scripts',
  'create_most_energising_tracks_view.sql',
);

export const s3BucketName = process.env.S3_BUCKET_NAME as string;
if (!s3BucketName) {
  throw new Error('S3_BUCKET_NAME environment variable is not set');
}
