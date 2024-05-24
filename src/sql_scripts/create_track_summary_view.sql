CREATE VIEW track_summary AS
SELECT 
   id,
   name,
   popularity,
   energy,
   danceability_label,
   artist_followers
FROM 
   tracks;