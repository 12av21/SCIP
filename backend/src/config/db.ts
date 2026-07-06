import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    console.log('Attempting to connect to MongoDB with URI:', mongoURI ? 'URI_PROVIDED' : 'URI_MISSING'); // Log URI presence
    if (!mongoURI) {
      throw new Error('mongoURI is not defined in environment variables.');
    }
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected...');
  } catch (err: any) {
    console.error(err.message);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;