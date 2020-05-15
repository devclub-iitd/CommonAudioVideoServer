import * as express from 'express';
import {upload, postAudio} from '../controllers/track';

const router = express.Router();

router.post('/upload', upload, postAudio);

export default router;
