import requests
import sys
import json
from datetime import datetime

class OpportuneAITester:
    def __init__(self, base_url="https://opportunity-track.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_result(self, test_name, passed, details=""):
        """Log test result"""
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            self.failed_tests.append({"test": test_name, "details": details})
            print(f"❌ {test_name} - FAILED: {details}")
        if details:
            print(f"   Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            response_data = {}
            try:
                response_data = response.json()
            except:
                pass

            if success:
                self.log_result(name, True, f"Status: {response.status_code}")
                return True, response_data
            else:
                self.log_result(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}")
                return False, response_data

        except Exception as e:
            self.log_result(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_auth_signup_unique(self):
        """Test user signup with unique email for this test run"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')  # More unique timestamp
        test_user = {
            "name": f"Test User {timestamp}",
            "email": f"testuser_{timestamp}@example.com",
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "Auth: Signup (Unique)", "POST", "auth/signup", 200, test_user
        )
        
        if success and 'access_token' in response and 'user' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.test_email = test_user['email']
            self.test_password = test_user['password']
            return True
        return False

    def test_auth_login(self):
        """Test user login with existing credentials"""
        if not hasattr(self, 'test_email'):
            # Use provided test credentials
            login_data = {
                "email": "test@example.com",
                "password": "testpass123"
            }
        else:
            login_data = {
                "email": self.test_email,
                "password": self.test_password
            }
        
        success, response = self.run_test(
            "Auth: Login", "POST", "auth/login", 200, login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_auth_me(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Auth: Get Me", "GET", "auth/me", 200
        )
        return success and 'id' in response

    def test_profile_get(self):
        """Test getting user profile"""
        success, response = self.run_test(
            "Profile: Get", "GET", "profile", 200
        )
        return success

    def test_profile_update(self):
        """Test updating user profile"""
        profile_data = {
            "name": "Updated Test User",
            "education_college": "Test University",
            "education_degree": "B.Tech Computer Science",
            "education_year": "2026",
            "skills": ["python", "javascript", "react"],
            "target_roles": ["Software Engineer Intern"],
            "preferred_locations": ["Berlin", "London"],
            "internship_type": "remote"
        }
        
        success, response = self.run_test(
            "Profile: Update", "PUT", "profile/update", 200, profile_data
        )
        return success and 'skills' in response

    def test_internships_get(self):
        """Test fetching internships from Multi-API (Arbeitnow + Remotive) with compatibility_score"""
        success, response = self.run_test(
            "Internships: Get", "GET", "internships", 200, {"page": 1}
        )
        
        if success and 'internships' in response:
            internships = response.get('internships', [])
            
            # NEW: Verify sources array contains both APIs
            sources = response.get('sources', [])
            expected_sources = ['Arbeitnow', 'Remotive']
            if not all(src in sources for src in expected_sources):
                self.log_result("Internships: Get", False, f"Expected sources {expected_sources}, got {sources}")
                return False
            
            if len(internships) > 0:
                # Store first internship for bookmark/application tests
                self.sample_internship = internships[0]
                
                # NEW: Verify compatibility_score exists (not match_score/readiness_score)
                intern = internships[0]
                if 'compatibility_score' not in intern:
                    self.log_result("Internships: Get", False, "No compatibility_score in internship response")
                    return False
                    
                # Verify no old scoring fields
                old_fields = ['match_score', 'readiness_score']
                if any(field in intern for field in old_fields):
                    self.log_result("Internships: Get", False, f"Old scoring fields found: {[f for f in old_fields if f in intern]}")
                    return False
                
                return True
            else:
                self.log_result("Internships: Get", False, "No internships returned")
                return False
        return False

    def test_internships_search(self):
        """Test searching internships"""
        success, response = self.run_test(
            "Internships: Search", "GET", "internships", 200, 
            {"search": "python", "page": 1}
        )
        return success

    def test_internships_filter(self):
        """Test filtering internships"""
        success, response = self.run_test(
            "Internships: Filter", "GET", "internships", 200,
            {"location": "berlin", "remote": "true", "page": 1}
        )
        return success

    def test_bookmark_create(self):
        """Test creating a bookmark"""
        if not hasattr(self, 'sample_internship'):
            self.log_result("Bookmark: Create", False, "No sample internship available")
            return False
        
        bookmark_data = {
            "internship_id": self.sample_internship.get('internship_id'),
            "title": self.sample_internship.get('title'),
            "company": self.sample_internship.get('company'),
            "location": self.sample_internship.get('location'),
            "url": self.sample_internship.get('apply_url', 'http://example.com'),
            "description": self.sample_internship.get('description', ''),
            "tags": self.sample_internship.get('tags', []),
            "remote": self.sample_internship.get('remote', False)
        }
        
        success, response = self.run_test(
            "Bookmark: Create", "POST", "bookmarks", 200, bookmark_data
        )
        
        if success and 'id' in response:
            self.bookmark_id = response['id']
            return True
        return False

    def test_bookmarks_get(self):
        """Test getting bookmarks"""
        success, response = self.run_test(
            "Bookmarks: Get", "GET", "bookmarks", 200
        )
        return success and 'bookmarks' in response

    def test_bookmark_delete(self):
        """Test deleting a bookmark"""
        if not hasattr(self, 'sample_internship'):
            self.log_result("Bookmark: Delete", False, "No sample internship available")
            return False
        
        success, response = self.run_test(
            "Bookmark: Delete", "DELETE", 
            f"bookmarks/{self.sample_internship.get('internship_id')}", 200
        )
        return success

    def test_application_create(self):
        """Test creating an application"""
        if not hasattr(self, 'sample_internship'):
            self.log_result("Application: Create", False, "No sample internship available")
            return False
        
        app_data = {
            "internship_id": self.sample_internship.get('internship_id'),
            "title": self.sample_internship.get('title'),
            "company": self.sample_internship.get('company'),
            "location": self.sample_internship.get('location'),
            "url": self.sample_internship.get('apply_url', 'http://example.com'),
            "status": "applied"
        }
        
        success, response = self.run_test(
            "Application: Create", "POST", "applications", 200, app_data
        )
        
        if success and 'id' in response:
            self.application_id = response['id']
            return True
        return False

    def test_applications_get(self):
        """Test getting applications"""
        success, response = self.run_test(
            "Applications: Get", "GET", "applications", 200
        )
        return success and 'applications' in response

    def test_application_update(self):
        """Test updating application status"""
        if not hasattr(self, 'application_id'):
            self.log_result("Application: Update", False, "No application ID available")
            return False
        
        success, response = self.run_test(
            "Application: Update", "PUT", 
            f"applications/{self.application_id}", 200,
            {"status": "interviewing"}
        )
        return success

    def test_dashboard_stats(self):
        """Test getting dashboard statistics"""
        success, response = self.run_test(
            "Dashboard: Stats", "GET", "dashboard/stats", 200
        )
        
        if success:
            expected_fields = ['total_applications', 'applied', 'interviewing', 'accepted', 'rejected', 'bookmarks_count']
            has_all_fields = all(field in response for field in expected_fields)
            if not has_all_fields:
                self.log_result("Dashboard: Stats", False, f"Missing fields in response: {list(response.keys())}")
                return False
            return True
        return False

    def test_recommendations_analyze(self):
        """Test skill gap analysis - NEW: compatibility_score instead of match_score/readiness_score"""
        analysis_data = {
            "required_skills": ["python", "javascript", "machine learning", "docker"],
            "title": "Software Engineer Intern",
            "location": "Berlin"
        }
        
        success, response = self.run_test(
            "Recommendations: Analyze", "POST", "recommendations/analyze", 200, analysis_data
        )
        
        if success:
            # NEW: Check for compatibility_score and component percentages (50% skill + 30% role + 20% location)
            expected_fields = ['compatibility_score', 'skill_match_pct', 'role_match_pct', 'location_match_pct', 'learning_paths']
            has_fields = all(field in response for field in expected_fields)
            if not has_fields:
                self.log_result("Recommendations: Analyze", False, f"Missing fields in response: {list(response.keys())}")
                return False
                
            # Verify no old fields exist
            old_fields = ['match_score', 'readiness_score']
            has_old_fields = any(field in response for field in old_fields)
            if has_old_fields:
                self.log_result("Recommendations: Analyze", False, f"Old fields still present: {[f for f in old_fields if f in response]}")
                return False
                
            # Verify learning_paths have courses with platform, name, url
            learning_paths = response.get('learning_paths', [])
            if learning_paths:
                for lp in learning_paths[:2]:  # Check first 2 learning paths
                    courses = lp.get('courses', [])
                    if courses:
                        course = courses[0]
                        course_fields = ['platform', 'name', 'url']
                        if not all(field in course for field in course_fields):
                            self.log_result("Recommendations: Analyze", False, f"Course missing fields: {list(course.keys())}")
                            return False
            
            return True
        return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting OpportuneAI Backend Testing...")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)

        # Auth Tests
        print("\n📋 Testing Authentication...")
        if not self.test_auth_signup_unique():
            print("⚠️  Unique signup failed, trying login with existing credentials...")
            if not self.test_auth_login():
                print("❌ Both signup and login failed. Cannot proceed.")
                return self.generate_summary()
        
        self.test_auth_me()

        # Profile Tests
        print("\n👤 Testing Profile Management...")
        self.test_profile_get()
        self.test_profile_update()

        # Internships Tests
        print("\n💼 Testing Internships...")
        if self.test_internships_get():
            self.test_internships_search()
            self.test_internships_filter()

        # Bookmark Tests
        print("\n🔖 Testing Bookmarks...")
        if hasattr(self, 'sample_internship'):
            self.test_bookmark_create()
            self.test_bookmarks_get()
            self.test_bookmark_delete()

        # Application Tests
        print("\n📝 Testing Applications...")
        if hasattr(self, 'sample_internship'):
            self.test_application_create()
            self.test_applications_get()
            self.test_application_update()

        # Dashboard & Recommendations
        print("\n📊 Testing Dashboard & Analytics...")
        self.test_dashboard_stats()
        self.test_recommendations_analyze()

        return self.generate_summary()

    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Failed: {len(self.failed_tests)}/{self.tests_run}")
        
        if self.failed_tests:
            print("\n🚨 Failed Tests:")
            for fail in self.failed_tests:
                print(f"   • {fail['test']}: {fail['details']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n📊 Success Rate: {success_rate:.1f}%")
        
        return {
            "total_tests": self.tests_run,
            "passed": self.tests_passed,
            "failed": len(self.failed_tests),
            "success_rate": success_rate,
            "failed_tests": self.failed_tests
        }

def main():
    tester = OpportuneAITester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if results["failed"] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())