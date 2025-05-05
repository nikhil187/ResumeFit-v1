# ResumeFit

ResumeFit is a comprehensive application that helps job seekers match their resumes with job descriptions, providing detailed feedback on skill matches, generating quiz questions, and offering insights to improve job compatibility.

## Features

* Resume analysis against job descriptions
* Skills matching and gap analysis
* Learning roadmap generation
* Technical quiz assessment
* Report saving and management
* Interview question generation
* User authentication with email verification
* MongoDB integration for storing analysis reports
* Detailed match analysis with visual charts

## Project Structure

The project consists of two main components:

1. **Frontend**: Located in `frontend`
2. **Backend API**: Located in `resume-matcher-api`

## Setup and Running

### Manual Setup

#### Backend Setup

1. Navigate to the backend directory:
   ```
   cd resume-matcher-api
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   MONGODB_URI=mongodb+srv://your_mongodb_username:your_mongodb_password@cluster0.mongodb.net/resumeFit?retryWrites=true&w=majority
   PORT=5005
   OPENAI_API_KEY=your_openai_api_key
   ```
   Replace the MongoDB URI and OpenAI API key with your actual credentials.

4. Start the backend server:
   ```
   npm start
   ```

#### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the required environment variables

4. Start the frontend development server:
   ```
   npm start
   ```

## Testing the Connection

After starting both the backend and frontend servers, you can test the connection by navigating to:

```
http://localhost:3000/test-connection
```

This will display a page showing whether the frontend can connect to the backend API.

## Technologies Used

* React.js with Material-UI
* Node.js with Express
* Firebase (Authentication, Functions, Hosting)
* MongoDB
* OpenAI API

## Contact

For any questions or feedback, please contact the repository owner.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 