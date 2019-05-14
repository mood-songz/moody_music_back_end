DROP TABLE IF EXISTS emotions, songs;

CREATE TABLE users (
  userID SERIAL PRIMARY KEY,
  userName TEXT,
  userEmail TEXT
);

CREATE TABLE emotions (
  id SERIAL PRIMARY KEY,
  emotion TEXT, 
);

CREATE TABLE songs (
  id SERIAL PRIMARY KEY,
  title TEXT,
  artist TEXT,
  spotifyID TEXT,
  duration NUMERIC,
  numLikes NUMERIC,
  FOREIGN KEY (emotion_id) REFERENCES emotions(id)
);

CREATE TABLE user_songs (
  id INTEGER NOT NULL
);
-- CREATE TABLE IF NOT EXISTS events (
--   id SERIAL PRIMARY KEY, 
--   link TEXT, 
--   name TEXT, 
--   summary TEXT,
--   event_date CHAR(15), 
--   location_id INTEGER NOT NULL REFERENCES locations(id) 
-- );