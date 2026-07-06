import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
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