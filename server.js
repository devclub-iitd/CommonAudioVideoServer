const mongoose = require('mongoose');

require('dotenv').config();

const db_uri = process.env.DB_URI;

mongoose
  .connect(db_uri, {useNewUrlParser: true, useUnifiedTopology: true})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log(err));
