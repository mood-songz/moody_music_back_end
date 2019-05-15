'use strict';
require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

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
var sess;
var upload = multer({ storage:storage }).single('theFile');
app.post('/upload', (req, res) => {
  //request session
  sess=req.session;
  sess.keyword;

  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(500).json(err);
    } else if (err) {
      return res.status(500).json(err);
    }

    facepp.setApiKey(process.env.FACE_API_KEY);
    facepp.setApiSecret(process.env.FACE_API_SEC);
    const fs = require('fs');
    var parameters = {
      return_attributes: 'ethnicity,beauty,eyegaze,emotion',
      image_base64: fs.readFileSync(req.file.path).toString('base64')
    };
    facepp.post('/detect', parameters, function(err, res) {
      let obj=res.faces[0].attributes.emotion;
      //  let i = arr.indexOf(Math.max(...arr));
      let max=0;
      for (var o in obj) {
        if(obj[o]>max){
          max=obj[o];
          sess.keyword=o;
        }
      }
      console.log(sess.keyword);

    });
    return res.status(200).send(req.file.path);

  });

});

// Database Setup

const client = new pg.Client(process.env.DATABASE_URL);
client.connect();

function fillEmotionsTable() {
  let moodArray = ['happy', 'sad', 'neutral'];
  let insertStatement = 'INSERT INTO emotions (emotion, id) VALUES ($1, $2);';
  moodArray.forEach((mood, i )=> {
    let values = [mood, i + 1];
    client.query(insertStatement, values);
  });
}

/*************************  Endpoints  *****************************************/

// gets recommendations for a playlist
// If we get API to work as we want to, possibly refactor to include userid and valence in string, for example:  app.get('/recommendations/userid/valence', (request, response) => {
//                       :emotion
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


// cuurently gets a song from spotify using cuurent id.
function getSpotifyRecommendations (token) {
  // let songId = '6rqhFgbbKwnb9MLmUQDhG6';
  //can either grab song by id or by array of id's. Not sure if this Api is possible to use
  let spotifyUrl = `https://api.spotify.com/v1/search/`;
  return superagent.get(spotifyUrl)
    .set('Authorization', `Bearer ${token}`)
    .query({'type': 'track', 'query': 'yellow'})
    .then(response => {response.body;

      //forEach track
      //track.filter(valence)

      let songsArray = [];
      response.body.tracks.items.forEach(x => {
        songsArray.push(new Song(x));
      });
      // console.log(songsArray);

      let valenceRequestString = songsArray.map(x => x.spotifyID).join(',');

      // This code should check the emotions table, and fill it if it's empty
      client.query('SELECT * FROM emotions')
        .then(data => {
          if (data.rowCount === 0) {
            fillEmotionsTable();
          }
        });

      return superagent.get('https://api.spotify.com/v1/audio-features/')
        .set({'Authorization': `Bearer ${token}`})
        .query({'ids': valenceRequestString})
        .then(response => {
          // console.log(response.body.audio_features);

          songsArray.forEach((song, i) => {
            // let selectStatement = `SELECT id FROM emotions WHERE emotion = $1;`;
            // let values=[];
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
          // console.log(songsArray);

          songsArray.forEach(song => {

            // Need logic to determine whether or not a song already exists in songs database, using spotifyID.
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

          return songsArray;
        })
        .catch(error => console.error(error));
    })
    .catch(error => console.error(error));
}

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

// 'offset': Math.ceil(Math.random(1, 1000))
