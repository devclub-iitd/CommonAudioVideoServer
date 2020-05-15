import * as mongoose from 'mongoose';
import {MONGODB_URI} from '../utils/secrets';

// Connect to MongoDB
const mongoUrl: string = MONGODB_URI;
mongoose
  .connect(mongoUrl, {useNewUrlParser: true, useUnifiedTopology: true})
  .then(() => console.log('Connected to MongoDB'))
  .catch((): void => {
    throw new Error('Cannot Connect To MongoDB');
  });

export default mongoose;
