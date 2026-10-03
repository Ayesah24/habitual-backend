# Habitual

## Title:
Habitual - Habit Tracker and Personal Productivity Dashboard

## Objectives of the app or website:
- Help users track daily habits consistently.
- Encourage better routines and productivity through simple habit management.
- Allow users to monitor progress, streaks, and weekly summaries.
- Provide a secure login and account system so personal records stay separate for each user.

## Features:
- User registration and login system
- Password reset functionality
- Habit creation, editing, and deletion
- Weekly scheduling for habits (Monday to Sunday)
- Daily completion tracking with streak calculation
- Dashboard overview with today's progress and weekly completion charts
- Progress and history pages for user activity review
- Theme toggle for dark and light modes
- Responsive design for desktop and mobile devices

## Web Technologies /Tools Used:
### Front End:
- HTML5
- CSS3
- JavaScript
- Responsive web design principles

### Backend:
- Node.js
- Express.js
- JWT (JSON Web Token) for authentication
- bcryptjs for password hashing
- File-based data storage using JSON
- REST API endpoints

## Limitations:
- The app currently uses JSON file storage instead of a full database, so it is better suited for small projects and demos.
- There is no real email delivery system for password reset messages.
- The application does not yet include advanced analytics or data charts beyond the basic dashboard summary.
- Real-time multi-user collaboration is not implemented.

## Suggested improvements of the system:
- Replace JSON file storage with MongoDB or PostgreSQL for better scalability.
- Add email verification and password recovery emails.
- Implement admin user management and role-based access.
- Add charts for monthly and annual habit trends.
- Add push notifications or reminders for habit tracking.
- Improve search and filtering features for habit categories and dates.
- Add deployment to a cloud service such as Render, Railway, or Vercel.

## Local run instructions:
1. Open the project folder.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and update values if needed.
4. Start the server with `npm start`.
5. Open `http://localhost:5000` in your browser.

## Local deployment URL:
- http://localhost:5000

## Notes:
This project is ready for local deployment and can be hosted in the cloud for public access with a deployment service.
