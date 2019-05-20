DROP TABLE IF EXISTS emotions, songs, user_songs;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  userName TEXT,
  userEmail TEXT
);

CREATE TABLE IF NOT EXISTS emotions (
  id SERIAL PRIMARY KEY,
  emotion TEXT
);

CREATE TABLE IF NOT EXISTS songs (
  id SERIAL PRIMARY KEY,
  title TEXT,
  artist TEXT,
  spotifyID TEXT,
  duration NUMERIC,
  numLikes NUMERIC,
  emotion_id INTEGER,
  FOREIGN KEY (emotion_id) REFERENCES emotions (id)
);

CREATE TABLE IF NOT EXISTS user_songs (
  id SERIAL PRIMARY KEY,
  song_id INTEGER,
  user_id INTEGER,
  FOREIGN KEY (song_id) REFERENCES songs (id),
  FOREIGN KEY (user_id) REFERENCES users (id)
);
