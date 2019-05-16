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

//using for image handler
const multer=require('multer');

// use environment variable, or, if it's undefined, use 8080 by default
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.urlencoded());
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

      if(faceappResponse.faces && faceappResponse.faces.length){
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
              keyword = 'meh';
            } else {
              keyword = 'sad';
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
        let moodArray = ['happy', 'sad', 'meh'];
        let insertStatement = 'INSERT INTO emotions (emotion, id) VALUES ($1, $2);';
        moodArray.forEach((mood, i )=> {
          let values = [mood, i + 1];
          client.query(insertStatement, values);
        });
      }
    });
}

/*************************  Endpoints  *****************************************/
app.get('/', function(request, response){
  response.send('ok');
});

// gets recommendations for a playlist
// If we get API to work as we want to, possibly refactor to include userid and valence in string, for example:  app.get('/recommendations/userid/emotion', (request, response) => {
//                       :emotion
app.get('/recommendations/:emotion', (request, response) => {
  let emotion = request.params.emotion;
  // emoValue = 1 for 'happy', = 2 for 'sad', = 3 for 'meh'.
  let emoValue;
  if (emotion === 'happy') {
    emoValue = 1;
  } else if (emotion === 'sad') {
    emoValue = 2;
  } else if (emotion === 'meh') {
    emoValue = 3;
  }

  let selectStatement = 'SELECT * FROM songs WHERE emotion_id = $1;';
  client.query(selectStatement, [emoValue])
    .then(data => {
      if (data.rowCount < 100) {
        getSpotifyToken()
          .then(token => getSpotifyRecommendations(token))
          .catch(error => console.error(error));
      }
    })
    .then(
      returnSongArray(emoValue)
        .then(songArray => {
          console.log(songArray);
          response.send(songArray);
        })
    )
    .catch(error => console.error(error));
});

//get user from database
app.get('/users/:username/:email', (request, response) => {
  let username = request.params.username;
  let email = request.params.email;

  let selectStatement = `SELECT * FROM users WHERE username = $1 and useremail = $2;`;
  let values = [username, email];

  try {
    client.query(selectStatement, values)
      .then(databaseResponse => {
        if(databaseResponse.rows.length > 0){
          let user = databaseResponse.rows[0];
          response.send({'username': user.username, 'email': user.useremail});
        } else {
          response.send({});
        }
      });
  } catch (error) {
    console.error(error);
  }
});

//save user to database
app.post('/users/:username/:email', (request, response) => {
  let username = request.params.username;
  let email = request.params.email;
  let insertStatement = `INSERT into users (username, useremail) VALUES ($1, $2);`;
  let selectStatement = `SELECT * FROM users WHERE username = $1 and useremail = $2;`;
  let values = [username, email];
  try {
    client.query(selectStatement, values)
      .then(databaseResponse => {
        if(databaseResponse.rows.length > 0){
          console.log('user already exists');
          response.send(false);
        } else {
          try {
            client.query(insertStatement, values)
              .then(databaseResponse => {
                if(databaseResponse.rowCount > 0) {
                  console.log('Saved new user');
                }
                response.send(databaseResponse.rowCount > 0);
              }); 
          } catch (error) {
            console.error(error);
          }
        }
      });
  } catch (error) {
    console.error(error);
  }
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
  let randomOffset = Math.ceil(Math.random() * 450);
  console.log(randomOffset);
  return superagent.get(spotifyUrl)
    .set('Authorization', `Bearer ${token}`)
    .query({'type': 'track', 'query': 'year:2010-2019', 'limit': '50', 'offset': `${randomOffset}`})
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
            if (response.body.audio_features[i].valence > 0.6) {
              // happy
              song.emotion_id = 1;
            } else if ( response.body.audio_features[i].valence < 0.4) {
              // sad
              song.emotion_id = 2;
            } else {
              // meh
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
  let selectStatement = 'SELECT * FROM songs WHERE emotion_id = $1 ORDER BY random() LIMIT 6;';

  return client.query(selectStatement, [emoValue])
    .then(data => {
      if (emoValue === 1) {
        let pharrellWilliams = {'id': 6788, 'title': 'Happy', 'artist': 'Pharrell', 'spotifyid': '5b88tNINg4Q4nrRbrCXUmg','duration': '20400', 'emotion_id': '1', 'numLikes': 0};
        return data.rows.slice(0,5).concat(pharrellWilliams);
      } else if (emoValue === 2) {
        let rollingStone = {'id': 6789, 'title': 'As Tears Go By - Mono Version', 'artist': 'The Rolling Stones', 'spotifyid': '1LD75COdR1n8jTIjommyS2','duration': '20400', 'emotion_id': '2', 'numLikes': 0};
        return data.rows.slice(0,5).concat(rollingStone);
      } else {
        return data.rows;
      }
    });
}

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
