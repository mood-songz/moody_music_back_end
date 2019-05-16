'use strict';
require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');
const fs = require('fs');
//face++ api package
var facepp = require('face-plusplus-node');
//require session to store keyword which is got from face++ api based on image
var session = require('express-session');
app.use(session({secret:'ssshhhhh'}));
//using for image handler
const multer=require('multer');

// use environment variable, or, if it's undefined, use 8080 by default
const PORT = process.env.PORT || 8080;

app.use(cors());

/*************************  image handler *****************************************/

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' +file.originalname );
  }
});

//define variable to use sessoion later
let keyword;
let success;

var upload = multer({ storage:storage }).single('theFile');
app.post('/upload', (req, res) => {

  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(500).json(err);
    } else if (err) {
      return res.status(500).json(err);
    }


    facepp.setApiKey(process.env.FACE_API_KEY);
    facepp.setApiSecret(process.env.FACE_API_SEC);
    var parameters = {
      return_attributes: 'ethnicity,beauty,eyegaze,emotion',
      image_base64: fs.readFileSync(req.file.path).toString('base64')
    };

    facepp.post('/detect', parameters, function(err, faceappResponse) {

      if(faceappResponse.faces.length){
        let obj = faceappResponse.faces[0].attributes.emotion;
        if(err){
          console.error(err);
        }
        let maxEmotionScore = 0;
        for (var o in obj) {
          if(obj[o] > maxEmotionScore){
            maxEmotionScore = obj[o];
            if(o === 'happiness'|| o === 'surprise'){
              keyword = 'happy';
            } else if (o === 'neutral' || o === 'fear'){
              keyword = 'neutral';
            } else {
              keyword = 'sadness';
            }
            success = true;
          }
        }
      }   
      console.log(keyword);
      let response = {'emotion': keyword, 'success' : success};
      return res.status(200).send(response);
    });

  });
});

// Database Setup

const client = new pg.Client(process.env.DATABASE_URL);
client.connect();

function fillEmotionsTable() {
  client.query('SELECT * FROM emotions')
    .then(data => {
      if (data.rowCount === 0) {
        let moodArray = ['happy', 'sad', 'neutral'];
        let insertStatement = 'INSERT INTO emotions (emotion, id) VALUES ($1, $2);';
        moodArray.forEach((mood, i )=> {
          let values = [mood, i + 1];
          client.query(insertStatement, values);
        });
      }
    });
}

/*************************  Endpoints  *****************************************/

// gets recommendations for a playlist
// If we get API to work as we want to, possibly refactor to include userid and valence in string, for example:  app.get('/recommendations/userid/emotion', (request, response) => {
//                       :emotion
app.get('/recommendations/:emotion', (request, response) => {
  let emotion = request.params.emotion;
  console.log(emotion);
  // emoValue = 1 for 'happy', = 2 for 'sad', = 3 for 'neutral'.
  let emoValue;
  if (emotion === 'happy') {
    emoValue = 1;
  } else if (emotion === 'sad') {
    emoValue = 2;
  } else if (emotion === 'neutral') {
    emoValue = 3;
  }

  let selectStatement = 'SELECT * FROM songs WHERE emotion_id = $1;';
  client.query(selectStatement, [emoValue])
    .then(data => {
      if (data.rowCount < 5) {
        // try {
        getSpotifyToken()
          .then(token => getSpotifyRecommendations(token))
          .catch(error => console.error(error));
        // } catch( error ) {
        //   console.error(error);
        // }
      }
    })
    .then(
      returnSongArray(emoValue)
        .then(songArray => response.send(songArray))
    )
    .catch(error => console.error(error));
});

/************************* Constructors  *****************************************/

function Song(item) {
  this.title = item.name;
  this.artist = item.artists[0].name;
  this.spotifyID = item.id;
  this.duration = item.duration_ms;
  this.emotion_id = 0;
  this.numLikes = 0;
}

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
// Uses access token to get random songs from spotify, and add them to database based on their valence.
function getSpotifyRecommendations (token) {
  let spotifyUrl = `https://api.spotify.com/v1/search/`;
  return superagent.get(spotifyUrl)
    .set('Authorization', `Bearer ${token}`)
    .query({'type': 'track', 'query': 'loud'})
    .then(response => {

      let songsArray = [];
      response.body.tracks.items.forEach(item => {
        songsArray.push(new Song(item));
      });

      // This code checks the emotions table, and fills if empty.
      fillEmotionsTable();

      // Sends request to Spotify API to retreive valence of each song.
      let valenceRequestString = songsArray.map(x => x.spotifyID).join(',');
      return superagent.get('https://api.spotify.com/v1/audio-features/')
        .set({'Authorization': `Bearer ${token}`})
        .query({'ids': valenceRequestString})
        .then(response => {

          // Assign an emotion_id to each song, based on valence.
          songsArray.forEach((song, i) => {
            if (response.body.audio_features[i].valence > 0.7) {
              // happy
              song.emotion_id = 1;
            } else if ( response.body.audio_features[i].valence < 0.3) {
              // sad
              song.emotion_id = 2;
            } else {
              // neutral
              song.emotion_id = 3;
            }
          });

          // Adds song to database if it does not already exist.
          songsArray.forEach(song => {
            client.query('SELECT * FROM songs WHERE spotifyID = $1;', [song.spotifyID])
              .then(data => {
                if (data.rowCount === 0) {
                  let insertStatement = `INSERT INTO songs (title, artist, spotifyID, duration, emotion_id, numLikes) VALUES ($1, $2, $3, $4, $5, $6);`;
                  let values = [song.title, song.artist, song.spotifyID, song.duration, song.emotion_id, song.numLikes];
                  client.query(insertStatement, values);
                  console.log(`${song.title} was added to database.`);
                } else {
                  console.log(`${song.title} already existed inside database.`);
                }
              });
          });
        })
        .catch(error => console.error(error));
    })
    .catch(error => console.error(error));
}

// Returns the first 5 songs that match the specified emotion_id value.
function returnSongArray(emoValue) {
  let selectStatement = 'SELECT * FROM songs WHERE emotion_id = $1 LIMIT 5;';

  return client.query(selectStatement, [emoValue])
    .then(data => {
      return data.rows;
    });
}

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

// newcomment
