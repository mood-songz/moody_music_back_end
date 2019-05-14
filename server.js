'use strict';

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const app = express();
// const pg = require('pg');

// require('dotenv').config();
app.use(cors());

// const client = new pg.Client(process.env.DATABASE_URL);
// client.connect();

const PORT = process.env.PORT || 3000;
app.use(express.static('./public'));

app.get('/itbetterwork', (request,response)=>{
  response.send('yes');
});

app.listen(PORT,()=> console.log(`Listening on port ${PORT}`));
