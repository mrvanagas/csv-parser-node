import { filterAndTransformTracks, filterArtists } from '../index';
import { Track, TransformedTrack } from '../models/tracks';
import { Artist } from '../models/artists';

describe('filterAndTransformTracks', () => {
  const mockTracks: Track[] = [
    {
      id: '1',
      name: 'Track 1',
      popularity: 80,
      duration_ms: 180000,
      explicit: 1,
      release_date: '2020-01-01',
      danceability: 0.6,
      energy: 0.8,
      key: 5,
      loudness: -5.0,
      mode: 1,
      speechiness: 0.05,
      acousticness: 0.1,
      instrumentalness: 0.0,
      liveness: 0.1,
      valence: 0.5,
      tempo: 120,
      time_signature: 4,
      id_artists: ['1', '2'],
      artists: ['Artist 1', 'Artist 2'],
    },
    {
      id: '2',
      name: 'Track 2',
      popularity: 70,
      duration_ms: 50000,
      explicit: 0,
      release_date: '2020-02-01',
      danceability: 0.7,
      energy: 0.9,
      key: 6,
      loudness: -6.0,
      mode: 0,
      speechiness: 0.06,
      acousticness: 0.2,
      instrumentalness: 0.1,
      liveness: 0.2,
      valence: 0.6,
      tempo: 130,
      time_signature: 3,
      id_artists: ['3'],
      artists: ['Artist 3'],
    },
  ];

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  it('should filter and transform tracks correctly', () => {
    const result: TransformedTrack[] = filterAndTransformTracks(mockTracks);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Track 1');
    expect(result[0].danceability_label).toBe('Medium');
    expect(result[0].release_year).toBe(2020);
    expect(result[0].id_artists).toBe('{1,2}');
  });
});

describe('filterArtists', () => {
  const mockArtists: Artist[] = [
    {
      id: '1',
      name: 'Artist 1',
      followers: 1000,
      genres: ['Pop'],
      popularity: 80,
    },
    {
      id: '2',
      name: 'Artist 2',
      followers: 2000,
      genres: ['Rock'],
      popularity: 70,
    },
    {
      id: '3',
      name: 'Artist 3',
      followers: 500,
      genres: ['Jazz'],
      popularity: 60,
    },
  ];

  const mockTransformedTracks: TransformedTrack[] = [
    {
      id: '1',
      name: 'Track 1',
      popularity: 80,
      duration_ms: 180000,
      explicit: 1,
      release_date: '2020-01-01',
      danceability: 0.6,
      energy: 0.8,
      key: 5,
      loudness: -5.0,
      mode: 1,
      speechiness: 0.05,
      acousticness: 0.1,
      instrumentalness: 0.0,
      liveness: 0.1,
      valence: 0.5,
      tempo: 120,
      time_signature: 4,
      release_year: 2020,
      release_month: 1,
      release_day: 1,
      danceability_label: 'Medium',
      id_artists: '{1,2}',
      artists: ['Artist 1', 'Artist 2'],
    },
  ];

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  it('should filter artists based on tracks', async () => {
    const result: Artist[] = await filterArtists(
      mockArtists,
      mockTransformedTracks,
    );
    expect(result.length).toBe(2);
    expect(result[0].name).toBe('Artist 1');
    expect(result[1].name).toBe('Artist 2');
  });
});
