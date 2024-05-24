CREATE VIEW tracks_with_artist_followers AS
SELECT 
   id,
   name,
   artists,
   popularity,
   energy,
   danceability_label,
   artist_followers
FROM 
   tracks
WHERE 
   artist_followers IS NOT NULL AND artist_followers > 0;