import * as mongoose from 'mongoose';
import {Schema, model, Model, Document} from 'mongoose';

export interface TrackImpl extends Document {
  title: string;
  filename: string;
  trackBinaryId: mongoose.Types.ObjectId;
}

const trackSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  trackBinaryId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
});

const Track: Model<TrackImpl> = model<TrackImpl>('Track', trackSchema);

export default Track;
