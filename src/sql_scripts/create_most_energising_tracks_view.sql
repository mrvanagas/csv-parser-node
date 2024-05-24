CREATE VIEW most_energising_track_per_year AS
WITH ranked_tracks AS (
   SELECT 
       id,
       name,
       popularity,
       energy,
       danceability_label,
       artist_followers,
       release_year,
       ROW_NUMBER() OVER (PARTITION BY release_year ORDER BY energy DESC) AS rank
   FROM 
       tracks
)
SELECT 
   id,
   name,
   popularity,
   energy,
   danceability_label,
   artist_followers,
   release_year
FROM 
   ranked_tracks
WHERE 
   rank = 1;