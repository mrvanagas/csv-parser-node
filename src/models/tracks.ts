export interface Track {
  id: string;
  name: string;
  popularity: number;
  duration_ms: number;
  explicit: number;
  artists: string[];
  id_artists: string[];
  release_date: string;
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  time_signature: number;
  // Add new properties
  release_year?: number;
  release_month?: number;
  release_day?: number;
  danceabilityLabel?: string;
}

export type TransformedTrack = Omit<Track, 'id_artists'> & {
  release_year: number;
  release_month: number;
  release_day: number;
  danceability_label: string;
  id_artists: string;
};
