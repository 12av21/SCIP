import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './src/config/db'; // Adjusted import path
import authRoutes from './src/routes/auth.routes'; // Adjusted import path

// Load environment variables from .env file
dotenv.config();

// Connect to the database
connectDB();

const app = express();

// Middleware
app.use(express.json()); // For parsing application/json
app.use(cors()); // Enable CORS for all origins (you might want to restrict this in production)

// Define a simple root route
app.get('/', (req, res) => {
  res.send('SCIP Backend API is running!');
});

// API Routes
app.use('/api/auth', authRoutes); // Mount authentication routes

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});