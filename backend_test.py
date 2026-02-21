#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class ProvaNoteAPITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.student_token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.passed_tests = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            self.passed_tests.append(name)
            print(f"✅ {name}")
        else:
            self.failed_tests.append({"test": name, "details": details})
            print(f"❌ {name} - {details}")

    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            
            success = response.status_code == expected_status
            return success, response
            
        except Exception as e:
            return False, str(e)

    def test_register_student(self):
        """Test student registration - should always create student role"""
        test_data = {
            "email": "testuser@test.com",
            "password": "testpass123",
            "name": "Test User",
            "role": "admin"  # This should be ignored
        }
        
        success, response = self.make_request('POST', 'auth/register', test_data, expected_status=200)
        
        if success:
            data = response.json()
            if data.get('user', {}).get('role') == 'student':
                self.log_test("Register Student (role ignored)", True)
                self.student_token = data.get('token')
                return True
            else:
                self.log_test("Register Student (role ignored)", False, f"Expected student role, got {data.get('user', {}).get('role')}")
        else:
            # User might already exist, try login
            login_success, login_response = self.make_request('POST', 'auth/login', {
                "email": "testuser@test.com", 
                "password": "testpass123"
            })
            if login_success:
                data = login_response.json()
                self.student_token = data.get('token')
                self.log_test("Register Student (existing user login)", True)
                return True
            else:
                self.log_test("Register Student (role ignored)", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")
        
        return False

    def test_register_admin(self):
        """Test admin registration via whitelist"""
        test_data = {
            "email": "seuemail@gmail.com",
            "password": "admin123456",
            "name": "Admin User"
        }
        
        success, response = self.make_request('POST', 'auth/register', test_data, expected_status=200)
        
        if success:
            data = response.json()
            if data.get('user', {}).get('role') == 'admin':
                self.log_test("Register Admin (whitelist)", True)
                self.admin_token = data.get('token')
                return True
            else:
                self.log_test("Register Admin (whitelist)", False, f"Expected admin role, got {data.get('user', {}).get('role')}")
        else:
            # Admin might already exist, try login
            login_success, login_response = self.make_request('POST', 'auth/login', {
                "email": "seuemail@gmail.com", 
                "password": "admin123456"
            })
            if login_success:
                data = login_response.json()
                self.admin_token = data.get('token')
                self.log_test("Register Admin (existing admin login)", True)
                return True
            else:
                self.log_test("Register Admin (whitelist)", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")
        
        return False

    def test_metadata_endpoints(self):
        """Test metadata endpoints"""
        # Test subjects endpoint
        success, response = self.make_request('GET', 'metadata/subjects', token=self.student_token)
        if success:
            data = response.json()
            if 'subjects' in data and isinstance(data['subjects'], list):
                self.log_test("GET /metadata/subjects", True)
            else:
                self.log_test("GET /metadata/subjects", False, "Missing subjects array")
        else:
            self.log_test("GET /metadata/subjects", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

        # Test filters endpoint
        success, response = self.make_request('GET', 'metadata/filters', token=self.student_token)
        if success:
            data = response.json()
            required_fields = ['subjects', 'sources', 'education_levels', 'difficulties', 'total_questions']
            missing_fields = [field for field in required_fields if field not in data]
            if not missing_fields:
                self.log_test("GET /metadata/filters", True)
            else:
                self.log_test("GET /metadata/filters", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test("GET /metadata/filters", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

    def test_simulation_generation(self):
        """Test simulation generation"""
        if not self.student_token:
            self.log_test("Simulation Generation", False, "No student token available")
            return None

        test_data = {
            "subjects": ["Matemática"],
            "education_level": "vestibular",
            "difficulty": "medium",
            "limit": 5,
            "type": "custom"
        }
        
        success, response = self.make_request('POST', 'simulations/generate', test_data, token=self.student_token, expected_status=200)
        
        if success:
            data = response.json()
            if 'id' in data and 'question_count' in data:
                self.log_test("POST /simulations/generate", True)
                return data['id']
            else:
                self.log_test("POST /simulations/generate", False, "Missing id or question_count in response")
        else:
            self.log_test("POST /simulations/generate", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")
        
        return None

    def test_my_simulations(self):
        """Test getting user's simulations"""
        if not self.student_token:
            self.log_test("My Simulations", False, "No student token available")
            return

        success, response = self.make_request('GET', 'simulations/my', token=self.student_token)
        
        if success:
            data = response.json()
            if isinstance(data, list):
                self.log_test("GET /simulations/my", True)
            else:
                self.log_test("GET /simulations/my", False, "Response is not a list")
        else:
            self.log_test("GET /simulations/my", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

    def test_simulation_questions(self, simulation_id):
        """Test getting simulation questions without correct answers"""
        if not simulation_id or not self.student_token:
            self.log_test("Simulation Questions", False, "No simulation ID or student token")
            return

        success, response = self.make_request('GET', f'simulations/{simulation_id}/questions', token=self.student_token)
        
        if success:
            data = response.json()
            if isinstance(data, list):
                # Check that correct_answer is not present
                has_correct_answer = any('correct_answer' in q for q in data)
                if not has_correct_answer:
                    self.log_test("GET /simulations/{id}/questions (no correct_answer)", True)
                else:
                    self.log_test("GET /simulations/{id}/questions (no correct_answer)", False, "correct_answer field present")
            else:
                self.log_test("GET /simulations/{id}/questions", False, "Response is not a list")
        else:
            self.log_test("GET /simulations/{id}/questions", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

    def test_simulation_attempt(self, simulation_id):
        """Test creating simulation attempt"""
        if not simulation_id or not self.student_token:
            self.log_test("Simulation Attempt", False, "No simulation ID or student token")
            return None

        success, response = self.make_request('POST', f'simulations/{simulation_id}/attempt', token=self.student_token)
        
        if success:
            data = response.json()
            if 'id' in data and data.get('mode') == 'generated':
                self.log_test("POST /simulations/{id}/attempt", True)
                return data['id']
            else:
                self.log_test("POST /simulations/{id}/attempt", False, f"Missing id or wrong mode: {data.get('mode')}")
        else:
            self.log_test("POST /simulations/{id}/attempt", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")
        
        return None

    def test_attempt_submission(self, attempt_id):
        """Test submitting attempt"""
        if not attempt_id or not self.student_token:
            self.log_test("Attempt Submission", False, "No attempt ID or student token")
            return

        success, response = self.make_request('POST', f'attempts/{attempt_id}/submit', token=self.student_token)
        
        if success:
            data = response.json()
            if 'score' in data and data.get('status') == 'completed':
                self.log_test("POST /attempts/{id}/submit", True)
            else:
                self.log_test("POST /attempts/{id}/submit", False, f"Missing score or wrong status: {data.get('status')}")
        else:
            self.log_test("POST /attempts/{id}/submit", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

    def test_admin_import_questions(self):
        """Test admin question import with hash detection"""
        if not self.admin_token:
            self.log_test("Admin Import Questions", False, "No admin token available")
            return

        test_questions = {
            "questions": [
                {
                    "statement": "Qual é a capital do Brasil?",
                    "alternatives": [
                        {"letter": "A", "text": "São Paulo"},
                        {"letter": "B", "text": "Rio de Janeiro"},
                        {"letter": "C", "text": "Brasília"},
                        {"letter": "D", "text": "Salvador"},
                        {"letter": "E", "text": "Belo Horizonte"}
                    ],
                    "correct_answer": "C",
                    "difficulty": "easy",
                    "subject": "Geografia",
                    "topic": "Capitais",
                    "education_level": "escola",
                    "source_exam": "ENEM",
                    "year": 2023
                }
            ]
        }
        
        success, response = self.make_request('POST', 'admin/import/questions', test_questions, token=self.admin_token)
        
        if success:
            data = response.json()
            if 'inserted' in data:
                self.log_test("POST /admin/import/questions", True)
                
                # Test duplicate detection by importing same question again
                success2, response2 = self.make_request('POST', 'admin/import/questions', test_questions, token=self.admin_token)
                if success2:
                    data2 = response2.json()
                    if data2.get('skipped_duplicates', 0) > 0:
                        self.log_test("Question Hash Duplicate Detection", True)
                    else:
                        self.log_test("Question Hash Duplicate Detection", False, "No duplicates detected on re-import")
                else:
                    self.log_test("Question Hash Duplicate Detection", False, "Second import failed")
            else:
                self.log_test("POST /admin/import/questions", False, "Missing inserted count")
        else:
            self.log_test("POST /admin/import/questions", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

    def test_non_admin_access(self):
        """Test that non-admin users get 403 on admin routes"""
        if not self.student_token:
            self.log_test("Non-admin Access Control", False, "No student token available")
            return

        success, response = self.make_request('GET', 'admin/exams', token=self.student_token, expected_status=403)
        
        if success:
            self.log_test("Non-admin Access Control (403)", True)
        else:
            self.log_test("Non-admin Access Control (403)", False, f"Expected 403, got {response.status_code if hasattr(response, 'status_code') else response}")

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        if not self.student_token:
            self.log_test("Dashboard Stats", False, "No student token available")
            return

        success, response = self.make_request('GET', 'stats/dashboard', token=self.student_token)
        
        if success:
            data = response.json()
            expected_fields = ['total_completed', 'average_score', 'simulations_created']
            missing_fields = [field for field in expected_fields if field not in data]
            if not missing_fields:
                self.log_test("GET /stats/dashboard", True)
            else:
                self.log_test("GET /stats/dashboard", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test("GET /stats/dashboard", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting ProvaNota API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        # Authentication Tests
        print("\n📝 Authentication & Security Tests")
        self.test_register_student()
        self.test_register_admin()
        self.test_non_admin_access()

        # Metadata Tests
        print("\n📊 Metadata Tests")
        self.test_metadata_endpoints()

        # Simulation Tests
        print("\n🎯 Simulation Tests")
        simulation_id = self.test_simulation_generation()
        self.test_my_simulations()
        
        if simulation_id:
            self.test_simulation_questions(simulation_id)
            attempt_id = self.test_simulation_attempt(simulation_id)
            if attempt_id:
                self.test_attempt_submission(attempt_id)

        # Admin Tests
        print("\n👑 Admin Tests")
        self.test_admin_import_questions()

        # Dashboard Tests
        print("\n📈 Dashboard Tests")
        self.test_dashboard_stats()

        # Results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        if self.passed_tests:
            print(f"\n✅ Passed Tests: {len(self.passed_tests)}")
            for test in self.passed_tests:
                print(f"  - {test}")

        return self.tests_passed == self.tests_run

def main():
    tester = ProvaNoteAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())