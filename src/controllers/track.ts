import * as GridFs from 'gridfs-stream';
import {Request, Response, NextFunction} from 'express';
import mongoose from '../db';
import Track from '../models/track';
import * as GridFsStorage from 'multer-gridfs-storage';
import {MONGODB_URI} from '../utils/secrets';
import * as multer from 'multer';
import * as crypto from 'crypto';
import * as path from 'path';
// import * as Grid from 'gridfs-stream';

export const listen = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const gfs = GridFs(mongoose.connection.db, mongoose.mongo);
    gfs.collection('uploads');
    const {trackId} = req.params;

    const track = await Track.findById(trackId);

    if (!track) {
      return res.status(404).send({message: 'Track not found.'});
    }

    gfs.findOne({filename: track.filename}, (err, file) => {
      if (err) {
        throw new Error(err.message);
      }

      const {range} = req.headers;
      const {length} = file;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const startChunk = parseInt(parts[0], 10);
        const endChunk = parts[1] ? parseInt(parts[1], 10) : length - 1;
        const chunkSize = endChunk - startChunk + 1;

        const head = {
          'Content-Range': `bytes ${startChunk}-${endChunk}/${length}`,
          'Content-Length': chunkSize,
          'Accept-Ranges': 'bytes',
          'Content-Type': 'audio/mpeg',
        };
        res.writeHead(206, head);

        const trackReadStream = gfs.createReadStream({
          filename: file.filename,
          range: {
            startPos: startChunk,
            endPos: endChunk,
          },
        });
        trackReadStream.on('open', () => trackReadStream.pipe(res));
        trackReadStream.on('end', () => res.end());
      }
    });
  } catch (err) {
    return next(err);
  }
};

export const upload = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Create storage engine
  const storage = new GridFsStorage({
    url: MONGODB_URI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename =
            buf.toString('hex') + path.extname(file.originalname);
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
  upload.single('file')(req, res, next);
};

export const postAudio = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const track = await new Track({
      title: req.body.title,
      filename: req.file.filename,
      trackBinaryId: req.file.id,
    });
    await track.save();
    return res.json({file: req.file});
  } catch (err) {
    return next(err);
  }
};
