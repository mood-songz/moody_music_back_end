'use strict';


require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

// use environment variable, or, if it's undefined, use 8080 by default
const PORT = process.env.PORT || 8080;

app.use(cors());

// Database Setup
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();

/*************************  Endpoints  *****************************************/

// gets recommendations for a playlist
// If we get API to work as we want to, possibly refactor to include userid and valence in string, for example:  app.get('/recommendations/userid/valence', (request, response) => {

app.get('/recommendations', (request, response) => {
  try {
    getSpotifyToken()
      .then(token => getSpotifyRecommendations(token))
      .then(recommendations => response.send(recommendations))
      .catch(error => console.error(error));
  } catch( error ) {
    console.error(error);
  }
});


/************************* Constructors  *****************************************/



/*************************  Helper Functions  *****************************************/
// requests an access token from Spotify
function getSpotifyToken() {
  //must use base64 encoding for credentials/Authorization
  let encodedClientCredentials = (Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'));
  return superagent.post('https://accounts.spotify.com/api/token')
    .set({'Authorization': 'Basic ' + encodedClientCredentials, 'Content-Type': 'application/x-www-form-urlencoded'})
    .send({'grant_type': 'client_credentials'})
    .then(result => result.body.access_token);
}

// cuurently gets a song from spotify using cuurent id. 
function getSpotifyRecommendations (token) { 
  let songId = '6rqhFgbbKwnb9MLmUQDhG6';
  //can either grab song by id or by array of id's. Not sure if this Api is possible to use
  let spotifyUrl = `https://api.spotify.com/v1/tracks/${songId}`;
  return superagent.get(spotifyUrl)
    .set('Authorization', `Bearer ${token}`)
    .then(response => response.body)
    .catch(error => console.error(error));
}

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
