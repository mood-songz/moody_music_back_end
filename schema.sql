DROP TABLE IF EXISTS emotions, songs;

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
  songs_id INTEGER,
  emotion_id INTEGER,
  users_id INTEGER,
  songs_liked BOOLEAN,
  FOREIGN KEY (songs_id) REFERENCES songs (id),
  FOREIGN KEY (emotion_id) REFERENCES emotions (id),
  FOREIGN KEY (users_id) REFERENCES users (id)
);

-- newcomment