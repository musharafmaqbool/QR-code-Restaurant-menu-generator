import requests
import sys
import json
from datetime import datetime

class QRMenuAPITester:
    def __init__(self, base_url="https://scanmenu-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.restaurant_id = None
        self.dish_ids = []
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_register(self):
        """Test restaurant registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        restaurant_data = {
            "name": "Bella Vista Restaurant",
            "email": f"test{timestamp}@restaurant.com",
            "password": "test123"
        }
        
        success, response = self.run_test(
            "Restaurant Registration",
            "POST",
            "/auth/register",
            200,
            data=restaurant_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.restaurant_id = response['restaurant']['id']
            print(f"   Restaurant ID: {self.restaurant_id}")
            return True
        return False

    def test_login(self):
        """Test restaurant login with existing account"""
        # First register a new account for login test
        timestamp = datetime.now().strftime('%H%M%S')
        register_data = {
            "name": "Test Login Restaurant",
            "email": f"login{timestamp}@restaurant.com",
            "password": "logintest123"
        }
        
        # Register first
        success, response = self.run_test(
            "Register for Login Test",
            "POST",
            "/auth/register",
            200,
            data=register_data
        )
        
        if not success:
            return False
            
        # Now test login
        login_data = {
            "email": register_data["email"],
            "password": register_data["password"]
        }
        
        success, response = self.run_test(
            "Restaurant Login",
            "POST",
            "/auth/login",
            200,
            data=login_data
        )
        
        return success and 'access_token' in response

    def test_create_dishes(self):
        """Test creating multiple dishes"""
        dishes = [
            {
                "name": "Caesar Salad",
                "category": "Starters",
                "price": 12.99,
                "description": "Fresh romaine lettuce with parmesan and croutons"
            },
            {
                "name": "Grilled Salmon",
                "category": "Main Course",
                "price": 24.99,
                "description": "Atlantic salmon with herbs and vegetables"
            },
            {
                "name": "Fresh Orange Juice",
                "category": "Beverages",
                "price": 4.99,
                "description": "Freshly squeezed orange juice"
            },
            {
                "name": "Chocolate Cake",
                "category": "Desserts",
                "price": 8.99,
                "description": "Rich chocolate cake with berries"
            }
        ]
        
        all_success = True
        for dish in dishes:
            success, response = self.run_test(
                f"Create Dish: {dish['name']}",
                "POST",
                "/dishes",
                200,
                data=dish
            )
            
            if success and 'id' in response:
                self.dish_ids.append(response['id'])
            else:
                all_success = False
                
        return all_success

    def test_get_dishes(self):
        """Test retrieving restaurant dishes"""
        success, response = self.run_test(
            "Get Restaurant Dishes",
            "GET",
            "/dishes",
            200
        )
        
        if success:
            print(f"   Found {len(response)} dishes")
            return len(response) > 0
        return False

    def test_update_dish(self):
        """Test updating a dish"""
        if not self.dish_ids:
            print("❌ No dishes to update")
            return False
            
        dish_id = self.dish_ids[0]
        update_data = {
            "name": "Updated Caesar Salad",
            "category": "Starters",
            "price": 13.99,
            "description": "Updated fresh romaine lettuce with parmesan and croutons"
        }
        
        success, response = self.run_test(
            "Update Dish",
            "PUT",
            f"/dishes/{dish_id}",
            200,
            data=update_data
        )
        
        return success

    def test_delete_dish(self):
        """Test deleting a dish"""
        if len(self.dish_ids) < 2:
            print("❌ Not enough dishes to delete")
            return False
            
        dish_id = self.dish_ids[-1]  # Delete the last dish
        success, response = self.run_test(
            "Delete Dish",
            "DELETE",
            f"/dishes/{dish_id}",
            200
        )
        
        if success:
            self.dish_ids.remove(dish_id)
            
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "/dashboard/stats",
            200
        )
        
        if success:
            expected_keys = ['restaurant_name', 'total_dishes', 'total_categories', 'categories']
            has_all_keys = all(key in response for key in expected_keys)
            print(f"   Stats: {response}")
            return has_all_keys
            
        return False

    def test_qr_generation(self):
        """Test QR code generation"""
        if not self.restaurant_id:
            print("❌ No restaurant ID for QR generation")
            return False
            
        # Test PNG QR code
        success1, _ = self.run_test(
            "Generate QR Code (PNG)",
            "GET",
            f"/qr/{self.restaurant_id}",
            200
        )
        
        # Test Base64 QR code
        success2, response = self.run_test(
            "Generate QR Code (Base64)",
            "GET",
            f"/qr/{self.restaurant_id}/base64",
            200
        )
        
        if success2:
            has_qr_code = 'qr_code' in response and response['qr_code'].startswith('data:image/png;base64,')
            has_menu_url = 'menu_url' in response
            print(f"   QR Code present: {has_qr_code}")
            print(f"   Menu URL: {response.get('menu_url', 'Not found')}")
            return success1 and success2 and has_qr_code and has_menu_url
            
        return False

    def test_public_menu(self):
        """Test public menu access"""
        if not self.restaurant_id:
            print("❌ No restaurant ID for public menu test")
            return False
            
        success, response = self.run_test(
            "Public Menu Access",
            "GET",
            f"/menu/{self.restaurant_id}",
            200
        )
        
        if success:
            has_restaurant = 'restaurant' in response
            has_dishes = 'dishes' in response
            has_categories = 'categories' in response
            
            print(f"   Restaurant info present: {has_restaurant}")
            print(f"   Dishes count: {len(response.get('dishes', []))}")
            print(f"   Categories: {response.get('categories', [])}")
            
            return has_restaurant and has_dishes and has_categories
            
        return False

    def test_invalid_endpoints(self):
        """Test error handling for invalid requests"""
        # Test invalid restaurant ID for public menu
        success, _ = self.run_test(
            "Invalid Restaurant Menu",
            "GET",
            "/menu/invalid-id",
            404
        )
        
        # Test unauthorized access to dishes
        old_token = self.token
        self.token = None
        success2, _ = self.run_test(
            "Unauthorized Dishes Access",
            "GET",
            "/dishes",
            401
        )
        self.token = old_token
        
        return success and success2

def main():
    print("🚀 Starting QR Menu Generator API Tests")
    print("=" * 50)
    
    tester = QRMenuAPITester()
    
    # Run all tests in sequence
    test_results = []
    
    # Authentication tests
    test_results.append(("Registration", tester.test_register()))
    test_results.append(("Login", tester.test_login()))
    
    # Dish management tests
    test_results.append(("Create Dishes", tester.test_create_dishes()))
    test_results.append(("Get Dishes", tester.test_get_dishes()))
    test_results.append(("Update Dish", tester.test_update_dish()))
    test_results.append(("Delete Dish", tester.test_delete_dish()))
    
    # Dashboard and QR tests
    test_results.append(("Dashboard Stats", tester.test_dashboard_stats()))
    test_results.append(("QR Generation", tester.test_qr_generation()))
    test_results.append(("Public Menu", tester.test_public_menu()))
    
    # Error handling tests
    test_results.append(("Error Handling", tester.test_invalid_endpoints()))
    
    # Print final results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 50)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:<20} {status}")
    
    passed_tests = sum(1 for _, result in test_results if result)
    total_tests = len(test_results)
    
    print(f"\nOverall: {passed_tests}/{total_tests} test suites passed")
    print(f"API Calls: {tester.tests_passed}/{tester.tests_run} individual tests passed")
    
    if passed_tests == total_tests:
        print("\n🎉 All backend tests passed! Backend is working correctly.")
        return 0
    else:
        print(f"\n⚠️  {total_tests - passed_tests} test suite(s) failed. Check the logs above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())