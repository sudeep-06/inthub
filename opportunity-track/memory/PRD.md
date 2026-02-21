# OpportuneAI - Product Requirements Document

## Problem Statement
Build a production-ready AI-powered web platform called OpportuneAI, an Autonomous Internship Hunter platform for students to discover internships in real time, track applications, and receive intelligent recommendations and skill gap analysis.

## Architecture
- **Frontend**: React.js + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python) 
- **Database**: MongoDB (adapted from PostgreSQL requirement)
- **External API**: Arbeitnow API (free, no key required)
- **Auth**: JWT-based custom authentication

## User Personas
- College students seeking internships
- Recent graduates exploring entry-level opportunities
- Career services counselors tracking student progress

## Core Requirements
1. JWT Authentication (signup/login)
2. Student Profile Management (skills, education, resume, preferences)
3. Real-time Internship Fetching from Arbeitnow API
4. Algorithmic Match Scoring (keyword-based)
5. Skill Gap Analysis & Learning Recommendations
6. Bookmark System (save internships)
7. Application Tracking (Applied/Interviewing/Accepted/Rejected)
8. Dashboard Analytics (stat cards, recent activity)
9. Responsive sidebar navigation

## What's Been Implemented (Feb 18, 2026)
- [x] Complete JWT auth system (signup/login/me)
- [x] Student profile CRUD with skills, education, preferences
- [x] Real-time internship fetching from Arbeitnow API (100+ listings per page)
- [x] Keyword-based match scoring algorithm
- [x] Skill gap analysis with learning path recommendations
- [x] Bookmark system (create/read/delete)
- [x] Application tracking with status management
- [x] Dashboard with 6 stat cards + recent activity
- [x] Responsive sidebar layout with mobile sheet
- [x] Dark mode toggle
- [x] Filter system (search, location, remote/onsite)
- [x] Pagination for internship listings
- [x] All backend APIs with proper validation

## Iteration 2 (Feb 19, 2026) - Major Upgrades
- [x] Unified Compatibility Score replacing Match/Readiness (skill 50% + role 30% + location 20%)
- [x] Multi-API Integration: Arbeitnow + Remotive (114+ results, deduplicated)
- [x] Auto-translation: Non-English listings translated via deep-translator
- [x] Real Course Recommendations: Coursera, GeeksforGeeks, freeCodeCamp with direct URLs
- [x] Premium UI Overhaul: Linear/Stripe/Notion inspired, Plus Jakarta Sans, soft shadows
- [x] Color-coded compatibility badges (Green 70-100, Yellow 40-69, Red 0-39)

## Database Collections
- users (id, name, email, password_hash, created_at)
- profiles (user_id, name, email, education, skills, target_roles, preferences)
- bookmarks (id, user_id, internship_id, title, company, location, url, created_at)
- applications (id, user_id, internship_id, title, company, status, applied_date)

## API Endpoints
- POST /api/auth/signup, /api/auth/login, GET /api/auth/me
- GET /api/profile, PUT /api/profile/update
- GET /api/internships, /api/internships/search
- POST /api/bookmarks, GET /api/bookmarks, DELETE /api/bookmarks/{id}
- POST /api/applications, GET /api/applications, PUT /api/applications/{id}, DELETE /api/applications/{id}
- GET /api/dashboard/stats
- POST /api/recommendations/analyze, GET /api/recommendations

## Backlog
### P0 (Critical)
- All P0 items completed

### P1 (Important)
- Resume file upload (currently URL-based)
- Email verification on signup
- Password reset flow
- Internship caching in MongoDB (reduce API calls)

### P2 (Nice to have)
- Advanced filtering (by job type, date range, salary)
- Application deadline reminders
- Export application data (CSV)
- User activity analytics
- Multiple resume support
- AWS deployment configuration files

## Next Tasks
1. Add resume file upload capability
2. Implement internship caching layer
3. Add email verification
4. Create AWS deployment configs (EC2, S3, RDS-equivalent)
5. Add advanced filters and sorting options
