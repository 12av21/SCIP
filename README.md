# SCIP - Smart Community Intelligence Platform

The Smart Community Intelligence Platform (SCIP) is a comprehensive web application designed to streamline community complaint management, provide insightful analytics, and leverage artificial intelligence for enhanced decision-making. It features a user-friendly citizen portal for reporting issues and an administrative dashboard for efficient management and analysis.

## Features

### Backend

The backend is built with Node.js and TypeScript, providing a robust and scalable API.

-   **User Authentication:** Secure registration and login processes using JWT (JSON Web Tokens) for session management.
-   **Role-Based Access Control (RBAC):** Differentiates user access based on roles (`citizen`, `admin`, `super_admin`).
-   **User Management:** Administrative functionalities for managing user accounts.
-   **Database Integration:** Utilizes MongoDB with Mongoose ODM for flexible and scalable data storage.
-   **Google Gemini AI:** Integration with Google Gemini API for potential AI-powered analytics, recommendations, and insights.
-   **RESTful API:** Provides a well-structured API for frontend communication.
-   **Error Handling:** Centralized error handling for consistent API responses.

### Frontend

The frontend is a React application developed with TypeScript, offering an intuitive user experience.

-   **React Router:** Manages client-side navigation and routing.
-   **Protected Routes:** Ensures only authenticated users with appropriate roles can access specific sections.
-   **Authentication Context:** Global state management for user authentication status, roles, and loading states.
-   **Citizen Portal:** Allows citizens to submit complaints, view their complaint history, and receive notifications.
-   **Admin Dashboard:** Provides administrators with an overview of complaints, analytics, AI tools, user management, and reporting features.
-   **Responsive UI:** Built with modern React components and styling (likely Tailwind CSS, inferred from class names).
-   **Toast Notifications:** Uses `react-hot-toast` for user feedback.

### Database

-   **MongoDB Atlas:** Cloud-hosted NoSQL database for storing application data.
-   **Mongoose ODM:** Provides schema validation and simplifies interactions with MongoDB.
-   **SQLite (Not in Use):** While SQLite setup files (`database/setup.js`, `database/schema.sql`, `database/seed.sql`) are present in the repository, the current backend implementation uses MongoDB for user authentication and data persistence.

## Technologies Used

### Backend

-   **Node.js**
-   **Express.js**
-   **TypeScript**
-   **Mongoose**
-   **MongoDB Atlas**
-   **bcrypt:** For password hashing.
-   **jsonwebtoken:** For JWT generation and verification.
-   **dotenv:** For environment variable management.
-   **@google/genai:** Google Gemini API client.

### Frontend

-   **React**
-   **TypeScript**
-   **React Router DOM:** For routing.
-   **Axios:** For API requests.
-   **react-hot-toast:** For notifications.
-   **jwt-decode:** For decoding JWTs on the client-side.
-   **Lucide React:** For icons.
-   **Recharts:** For data visualization (charts).
-   **Framer Motion:** For animations.
-   **Tailwind CSS:** (Inferred) For utility-first CSS styling.

## Setup Instructions

### Prerequisites

-   Node.js (v18 or higher recommended)
-   npm or Yarn package manager
-   MongoDB Atlas account (or a local MongoDB instance/Docker setup)
-   Docker (optional, for running local MongoDB)

### 1. Backend Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd SCIP
    ```
2.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    # or yarn install
    ```
4.  **Create a `.env` file:**
    Create a file named `.env` in the `e:\projects\SCIP\backend` directory with the following content. Replace placeholders with your actual values.
    ```dotenv
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY
    JWT_SECRET=YOUR_STRONG_JWT_SECRET
    PORT=5000
    MONGODB_URI="mongodb+srv://YOUR_DB_USERNAME:YOUR_DB_PASSWORD@your-cluster-url/your_database_name?retryWrites=true&w=majority"
    ```
    *   **`MONGODB_URI`**: Obtain this from your MongoDB Atlas dashboard. Ensure the username, password, cluster URL, and database name are correct. Make sure your IP address is whitelisted in Atlas Network Access.
    *   **`JWT_SECRET`**: A long, random string for signing JWTs.
    *   **`GEMINI_API_KEY`**: Your API key for Google Gemini.
5.  **Compile TypeScript:**
    ```bash
    npx tsc
    ```
6.  **Start the backend server:**
    *   For development (with auto-reloading):
        ```bash
        npm run dev
        ```
    *   For production (running compiled JavaScript):
        ```bash
        npm start
        ```
    Verify the console output shows "MongoDB Connected..." and "Server running on port 5000".

### 2. Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd ../frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or yarn install
    ```
3.  **Start the frontend development server:**
    ```bash
    npm start
    ```
    This will typically open the application in your web browser at `http://localhost:3000`.

## Usage

1.  **Access the application:** Open your web browser and navigate to `http://localhost:3000`.
2.  **Register a new user:** Use the registration page to create a new citizen account.
3.  **Login as Admin:** Use the seeded admin account (`admin@scip.gov` / `Admin@123`) to access the admin dashboard.
4.  **Login as Citizen:** Log in with your newly registered citizen account to access the citizen portal.

## Folder Structure

-   `backend/`: Contains the Node.js/Express.js API.
    -   `src/`: TypeScript source code for controllers, services, models, config, and middleware.
-   `frontend/`: Contains the React.js application.
    -   `src/`: React components, pages, context, and utilities.
-   `database/`: Contains SQLite setup and seed scripts (not actively used by the Mongoose backend).
```
<!--
[PROMPT_SUGGESTION]How can I implement password reset functionality in `auth.service.ts` and `auth.controller.ts` including token generation and verification?[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Add email verification functionality to the registration process, including sending a verification email and handling the verification link.[/PROMPT_SUGGESTION]
