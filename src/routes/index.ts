import * as express from 'express';
import {upload, postAudio, listen} from '../controllers/track';

const router = express.Router();

router.post('/upload', upload, postAudio);
router.get('/listen/:trackId', listen);

export default router;
