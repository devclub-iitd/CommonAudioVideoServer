import * as dotenv from 'dotenv';
import * as fs from 'fs';

if (fs.existsSync('src/.env')) {
  dotenv.config({path: 'src/.env'});
}

export const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://admin:admin1234@cluster0-d1xui.gcp.mongodb.net/test';
