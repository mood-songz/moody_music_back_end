# moody_music_back_end

## Developers
This app was built by [Cristian Restrepo](https://github.com/c23-repo), [Kishor Pandey](https://github.com/kishorpan2), [Peter Tynan](https://github.com/pettynan), [Tisha Greenidge](https://github.com/tgreenidge), [Xia Liu](https://github.com/xialiu1988)

## Deployed Link
https://desolate-shelf-44063.herokuapp.com/

## Technologies used
- Node/Express Server
- Postgres Database
- Heroku for Deployment
- Face++ Facial Recognition Api
- Spotify Api
- Multer

## Instructions to run project locally
### Database
 - Create local postgres Database and add url to `.env` file

### Node
- Install `node` and `nodemon`
- Navigate to root of project in the terminal and run `npm install`
- Run `npm start` or `nodemon` to start the server and view on `http://localhost:8080/` in the browser

## Endpoints
### Users Endpoints 
```https://desolate-shelf-44063.herokuapp.com/users/:username/:email```
- ```POST``` - Saves a new user to the database

#### Sample Response
returns ```true``` or ```false``` to indicate that the user was successfully saved 

- ```GET``` - Retrieves a user from the database
#### Sample Response
~~~~
{'username': 'tisha', 'email': 'tisha@email.com'}
~~~~

```https://desolate-shelf-44063.herokuapp.com/users/userexists/:username/:email```
- ```GET```  - Returns boolean on whether user with given username and email exists


### Recommendations Endpoints
```https://desolate-shelf-44063.herokuapp.com/recommendations/:emotion```
- ```GET``` - returns a list of songs that match the emotions of a user

#### Sample Response
~~~~
[ { id: 152,
    title: 'Esclavo de Tus Besos',
    artist: 'Manuel Turizo',
    spotifyid: '3g4UyIcQwutiG0TfW32GnX',
    duration: '219302',
    numlikes: '0',
    emotion_id: 3 },
  { id: 297,
    title: 'Starving',
    artist: 'Hailee Steinfeld',
    spotifyid: '4Ce37cRWvM1vIGGynKcs22',
    duration: '181880',
    numlikes: '0',
    emotion_id: 3 },
  { id: 109,
    title: 'Love Galore (feat. Travis Scott)',
    artist: 'SZA',
    spotifyid: '0q75NwOoFiARAVp4EXU4Bs',
    duration: '275080',
    numlikes: '0',
    emotion_id: 3 },
  { id: 180,
    title: "I Don't Fuck With You",
    artist: 'Big Sean',
    spotifyid: '7FYH5AW3bVfZHJIQpq3UOA',
    duration: '284386',
    numlikes: '0',
    emotion_id: 3 },
  { id: 87,
    title: 'One Kiss (with Dua Lipa)',
    artist: 'Calvin Harris',
    spotifyid: '7ef4DlsgrMEH11cDZd32M6',
    duration: '214846',
    numlikes: '0',
    emotion_id: 3 },
  { id: 23,
    title: 'Valentine',
    artist: 'YK Osiris',
    spotifyid: '15Nn5EEGQqlptGwiB2NVYV',
    duration: '206853',
    numlikes: '0',
    emotion_id: 3 } ] 
  ~~~~


### Upload Image Endpoints
```https://desolate-shelf-44063.herokuapp.com//upload```
- ```POST``` - creates a jpeg image that is processed for user emotion. The response is an emotion, and indication of success that a face was uploaded in the picture. Note, an image file must be attached to the the api call.


#### Sample response
~~~~
{'emotion': 'happy, 'success' : true}
~~~~

## Moody_Songz Database Schema
### users table
  ```id SERIAL PRIMARY KEY```

  ```userName TEXT```

  ```userEmail TEXT```


## emotions table
  ```id SERIAL PRIMARY KEY```

  ```emotion TEXT```

## songs table
  ```id SERIAL PRIMARY KEY```

  ```title TEXT```

  ```artist TEXT```

  ```spotifyID TEXT```

  ```duration NUMERIC```

  ```numLikes NUMERIC```

  ```emotion_id INTEGER```

  ```FOREIGN KEY (emotion_id) REFERENCES emotions (id)```



## user_songs table
  ```id SERIAL PRIMARY KEY```
  ```song_id INTEGER```
  ```user_id INTEGER```
  ```FOREIGN KEY (song_id) REFERENCES songs (id)```
  ```FOREIGN KEY (user_id) REFERENCES users (id)```
