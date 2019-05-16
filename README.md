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

## Instructions to run project locally
### Database
 - Create local postgres Database and add url to `.env` file

### Node
- Install `node` and `nodemon`
- Navigate to root of project in the terminal and run `npm install`
- Run `npm start` or `nodemon` to start the server and view on `http://localhost:8080/` in the browser

## Endpoints
```/users/:username/:email```
- POST - Saves a new user to the database
- GET - Retrieves a user from the database

```/recommendations/:userid/:emotion```
