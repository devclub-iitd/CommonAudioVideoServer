import * as express from 'express';
import * as mongoose from 'mongoose';
import * as compression from 'compression';
import * as bodyParser from 'body-parser';
import * as crypto from 'crypto';
import * as multer from 'multer';
import * as GridFsStorage from 'multer-gridfs-storage';
import * as Grid from 'gridfs-stream';
import * as path from 'path';

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
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.send('Welcome to the Common Audio Video Streaming Server !!');
});

const conn = mongoose.connection;

let gfs: any;

conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoUrl,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads',
        };
        resolve(fileInfo);
      });
    });
  },
});
const upload = multer({storage});

// @route POST /upload
// @desc  Uploads file to DB
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({file: req.file});
  //res.redirect('/');
});

// @route GET /files
// @desc  Display all files in JSON
app.get('/files', (req, res) => {
  gfs.files.find().toArray((err: any, files: any) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist',
      });
    }

    // Files exist
    return res.json(files);
  });
});

// @route GET /files/:filename
// @desc  Display single file object
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({filename: req.params.filename}, (err: any, file: any) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists',
      });
    }
    // File exists
    return res.json(file);
  });
});

export default app;
