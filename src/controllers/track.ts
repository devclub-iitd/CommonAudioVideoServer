import * as GridFs from 'gridfs-stream';
import {Request, Response, NextFunction} from 'express';
import mongoose from '../db';
import Track from '../models/track';

export const listen = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const gfs = GridFs(mongoose.connection.db, mongoose.mongo);
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

      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range
      const startChunk = Number(
        (range || '').replace(/bytes=/, '').split('-')[0]
      );

      const endChunk = length - 1;
      const chunkSize = endChunk - startChunk + 1;

      res.set({
        'Content-Range': `bytes ${startChunk}-${endChunk}/${length}`,
        'Content-Length': chunkSize,
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
      });

      // Partial Content :- https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/206
      res.status(206);

      const trackReadStream = gfs.createReadStream({
        filename: file.filename,
        range: {
          startPos: startChunk,
          endPos: endChunk,
        },
      });

      trackReadStream.on('open', () => trackReadStream.pipe(res));

      trackReadStream.on('end', () => res.end());
    });
  } catch (err) {
    return next(err);
  }
};
