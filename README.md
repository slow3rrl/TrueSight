# TrueSight
# AI-Powered Academic Integrity Management System

## Overview

The **AI-Powered Academic Integrity Management System** is a full-stack web application designed to help educational institutions monitor, analyze, and manage academic submissions using modern artificial intelligence technologies.

The platform provides a centralized environment where students can submit assignments, essays, research documents, and images while allowing instructors and administrators to evaluate the authenticity and originality of submitted work.

The system integrates:
- AI-generated text detection
- AI-generated image detection
- Role-based access management
- Submission tracking and analysis
- Secure file uploads
- Instructor review workflows
- Administrative monitoring tools
- Real-time analysis reporting

This project aims to strengthen academic integrity by leveraging artificial intelligence to identify potentially AI-generated content while maintaining an efficient submission and review process for educational institutions.

---

# Key Features

## Authentication & Security

### Secure User Authentication
- JWT-based authentication system
- Password hashing and protection
- Protected API routes
- Secure session management
- Role-based authorization

### Role-Based Access Control

The platform supports multiple user roles:

#### Student
- Submit assignments and essays
- Upload files and images
- View submission history
- Track analysis status
- Receive instructor feedback

#### Teacher / Instructor
- Create and manage classes
- Review student submissions
- Analyze files for AI-generated content
- View AI probability reports
- Monitor academic integrity violations
- Manage course submissions

#### Administrator
- Manage system-wide users
- Monitor analytics and reports
- Oversee institutional integrity metrics
- Control platform access and permissions
- Manage academic records

---

# AI-Powered Detection System

## AI-Generated Text Detection

The system integrates AI detection APIs to analyze:
- Essays
- Research papers
- Assignment submissions
- Uploaded text documents
- Written responses

### Supported File Types
- TXT
- PDF
- DOCX
- Essay text inputs

### Detection Workflow
1. Student uploads or submits text
2. System extracts textual content
3. Text is processed through AI detection APIs
4. AI probability score is generated
5. Results are stored in the database
6. Teachers can review detailed reports

### Analysis Output
- AI probability percentage
- Human-written probability
- Detection confidence score
- Submission analysis details
- Integrity assessment reports

---

## AI-Generated Image Detection

The platform supports machine learning-based image authenticity detection.

### Supported Image Formats
- PNG
- JPG
- JPEG
- WEBP

### Image Detection Features
- AI-generated image classification
- Deep learning image analysis
- Machine learning inference engine
- Automated authenticity scoring
- Probability-based image evaluation

### Planned Integration
The project utilizes:
- TensorFlow.js
- Teachable Machine-trained models
- Backend inference processing
- Real-time image analysis

---

# Submission Management System

## Assignment Submission Workflow

### Student Features
- Upload assignments
- Submit essays
- Attach files and images
- View submission status
- Track deadlines

### Instructor Features
- Access student submissions
- Review uploaded content
- Trigger AI analysis
- View analysis results
- Provide evaluation feedback

### Submission Tracking

The system records:
- Submission timestamps
- File metadata
- AI analysis results
- Submission status
- Reviewer comments
- Integrity reports

---

# Class Management System

## Teacher Capabilities

### Class Creation
- Create academic classes
- Manage enrolled students
- Organize assignments
- Track submission activity

### Assignment Management
- Publish assignments
- Set deadlines
- Monitor student submissions
- Review integrity reports

### Student Monitoring
- Analyze submission patterns
- Detect suspicious content
- Maintain academic compliance
- Generate class reports

---

# Dashboard & Analytics

## Administrative Dashboard

The system includes a centralized dashboard for monitoring:
- User activity
- Submission metrics
- AI detection statistics
- Integrity violation trends
- Class performance summaries

## Data Visualization
- Submission analytics
- AI probability charts
- Integrity monitoring reports
- User activity insights

---

# System Architecture

## Frontend

The frontend is built using modern web technologies to provide a responsive and user-friendly interface.

### Technologies
- React.js
- TypeScript
- Vite
- React Router
- Axios
- Modern CSS styling

### Frontend Features
- Responsive design
- Dynamic routing
- Real-time API communication
- Secure authentication flow
- User-friendly dashboards

---

## Backend

The backend provides API services, authentication, AI processing integration, and database management.

### Technologies
- Node.js
- Express.js
- JWT Authentication
- Multer
- REST APIs

### Backend Features
- RESTful API architecture
- Secure route protection
- AI analysis processing
- File handling and storage
- Database integration
- Submission management

---

## Database

### Database System
- PostgreSQL

### Database Responsibilities
- User management
- Submission records
- AI analysis results
- Role management
- Academic records
- File metadata storage

---

# AI Integration Workflow

## Text Detection Pipeline

```text
Student Submission
        ↓
File/Text Extraction
        ↓
AI Text Detection API
        ↓
Probability Scoring
        ↓
Database Storage
        ↓
Instructor Review Dashboard
```

---

## Image Detection Pipeline

```text
Image Upload
      ↓
Image Preprocessing
      ↓
TensorFlow.js Model Inference
      ↓
AI Probability Analysis
      ↓
Result Storage
      ↓
Teacher Review Interface
```

---

# Core Functionalities

## User Management
- Registration system
- Login authentication
- Role assignment
- Profile management

## File Management
- Secure file uploads
- Multi-format support
- File validation
- Submission tracking

## AI Analysis
- Automated text analysis
- Image authenticity detection
- AI probability reporting
- Integrity monitoring

## Academic Monitoring
- Submission history
- Integrity reports
- Instructor reviews
- Analytics dashboard

---

# Technologies Used

## Frontend
- React.js
- TypeScript
- Vite
- HTML5
- CSS3
- Axios

## Backend
- Node.js
- Express.js
- JWT
- Multer
- REST APIs

## Database
- PostgreSQL

## AI & Machine Learning
- GPTZero API
- TensorFlow.js
- Google Teachable Machine

## Additional Tools
- Git
- GitHub
- VS Code
- Postman

---

# Installation Guide

## Clone Repository

```bash
git clone <repository-url>
```

---

## Backend Setup

```bash
cd backend
npm install
```

### Configure Environment Variables

Create a `.env` file inside the backend folder:

```env
PORT=5000
DATABASE_URL=your_database_url
JWT_SECRET=your_secret_key
GPTZERO_API_KEY=your_api_key
GPTZERO_API_URL=https://api.gptzero.me/v2/predict/text
```

### Start Backend Server

```bash
npm run dev
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

# Project Structure

```text
project-root/
│
├── backend/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── uploads/
│   ├── models/
│   └── server.js
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── App.tsx
│
└── README.md
```

---

# Future Enhancements

## Planned Features
- Real-time AI analysis
- Advanced plagiarism detection
- OCR text extraction
- Multi-language support
- Mobile application support
- Notification system
- Cloud deployment
- Performance optimization
- Advanced reporting tools
- Faculty-wide analytics

---

# Security Features

- Encrypted authentication
- Protected API endpoints
- Secure file uploads
- Role-based access restriction
- Input validation
- Error handling
- Secure database interactions

---

# Capstone Project Significance

This project addresses the growing concern regarding the misuse of generative AI tools in academic environments.

By combining artificial intelligence detection systems with modern educational management tools, the platform provides institutions with a scalable and practical solution for maintaining academic honesty and improving submission monitoring processes.

The system demonstrates the practical application of:
- Artificial Intelligence
- Machine Learning
- Full-Stack Web Development
- Database Systems
- API Integration
- Academic Technology Solutions

---

# Developers

### Capstone Project Team
AI-Powered Academic Integrity Management System Developers

---

# License

This project is developed for educational and academic purposes.

---

# Conclusion

The AI-Powered Academic Integrity Management System represents a modern approach to maintaining educational honesty through intelligent automation and machine learning technologies.

By integrating AI-generated content detection with a secure academic workflow system, the platform empowers educational institutions to adapt to emerging technological challenges while promoting fairness, originality, and accountability in academic submissions.
