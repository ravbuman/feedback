# Feedback Application Backend

A comprehensive student feedback system built with Node.js, Express.js, and MongoDB.

## Features

- **Student Feedback Submission**: Students can submit feedback for all subjects and faculty in a single form
- **Admin Management**: Complete CRUD operations for faculty, courses, subjects, and feedback forms
- **Dynamic Form System**: Reusable feedback forms that can be applied across different subjects
- **Response Management**: View, filter, and analyze student responses with comprehensive statistics
- **Authentication**: Secure admin authentication with JWT tokens

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express Validator
- **Security**: bcryptjs for password hashing

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/feedback_app
JWT_SECRET=your_jwt_secret_key_here
ADMIN_EMAIL=admin@staysync.com
ADMIN_PASSWORD=admin123
NODE_ENV=development
```

3. Start the server:
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

## API Endpoints

### Admin Routes (`/api/admin`)

#### Authentication
- `POST /login` - Admin login

#### Faculty Management
- `GET /faculty` - Get all faculty
- `POST /faculty` - Create new faculty
- `PUT /faculty/:id` - Update faculty
- `DELETE /faculty/:id` - Deactivate faculty

#### Course Management
- `GET /courses` - Get all courses
- `POST /courses` - Create new course

#### Subject Management
- `GET /subjects` - Get all subjects
- `POST /subjects` - Create new subject

#### Feedback Form Management
- `GET /feedback-forms` - Get all feedback forms
- `POST /feedback-forms` - Create new feedback form
- `PUT /feedback-forms/:id` - Update feedback form

### Student Routes (`/api/student`)

- `GET /courses` - Get all available courses
- `GET /subjects/:courseId/:year/:semester` - Get subjects for specific course/year/semester
- `GET /feedback-form/:formId` - Get feedback form by ID
- `POST /submit-feedback` - Submit student feedback

### Response Management (`/api/responses`)

- `GET /` - Get all responses with filtering options
- `GET /:id` - Get specific response by ID
- `GET /stats/overview` - Get response statistics
- `GET /export/csv` - Export responses to CSV

## Database Models

### Faculty
- name, phoneNumber, designation, department
- subjects (array of subject references)
- isActive

### Course
- courseName, courseCode
- isActive

### Subject
- subjectName, course, year, semester, faculty
- isActive

### FeedbackForm
- formName, description
- questions (array with questionText, questionType, options, etc.)
- isActive

### Response
- studentName, phoneNumber, rollNumber
- course, year, semester
- feedbackForm, subjectResponses (array)
- submittedAt

### Admin
- email, password (hashed)
- isActive

## Default Admin Credentials

- **Email**: admin@staysync.com
- **Password**: admin123

## Development

The application uses nodemon for development, which automatically restarts the server when files are modified.

## License

© 2024 PydahSoft. All rights reserved.
