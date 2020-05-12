import * as express from 'express';
import * as mongoose from 'mongoose';
import * as compression from 'compression';
import * as bodyParser from 'body-parser';

import {MONGODB_URI} from './utils/secrets';

// Create Express server.
const app = express();

// Connect to MongoDB
const mongoUrl: string = MONGODB_URI;
mongoose
  .connect(mongoUrl, {useNewUrlParser: true, useUnifiedTopology: true})
  .then(() => console.log('Connected to MongoDB'))
  .catch((): void => {
    throw new Error('Cannot Connect To MongoDB');
  });

// Express configuration
app.set('port', process.env.PORT || 5000);
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', (req, res) => {
  res.send('Welcome to the Common Audio Video Streaming Server !!');
});

export default app;
