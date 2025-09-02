import requests
import sys
import json
from datetime import datetime

class FinalQRMenuTest:
    def __init__(self, base_url="https://scanmenu-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.restaurant_id = None
        self.created_dishes = []
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ SUCCESS - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def create_test_restaurant(self):
        """Create Final Test Restaurant"""
        timestamp = datetime.now().strftime('%H%M%S')
        restaurant_data = {
            "name": "Final Test Restaurant",
            "email": f"finaltest_{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "Creating Final Test Restaurant",
            "POST",
            "auth/register",
            200,
            data=restaurant_data
        )
        
        if success and 'access_token' in response and 'restaurant' in response:
            self.token = response['access_token']
            self.restaurant_id = response['restaurant']['id']
            print(f"   🏪 Restaurant: {response['restaurant']['name']}")
            print(f"   🆔 ID: {self.restaurant_id}")
            print(f"   📧 Email: {response['restaurant']['email']}")
            return True
        return False

    def create_test_dishes(self):
        """Create the 4 specific test dishes"""
        dishes_data = [
            {
                "name": "Caesar Salad",
                "category": "Starters",
                "price": 12.99,
                "description": "Fresh romaine lettuce with parmesan cheese and croutons"
            },
            {
                "name": "Grilled Salmon",
                "category": "Main Course",
                "price": 24.99,
                "description": "Atlantic salmon grilled to perfection with herbs"
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
                "description": "Rich chocolate cake with chocolate frosting"
            }
        ]
        
        print(f"\n📋 Creating 4 test dishes...")
        created_count = 0
        
        for dish_data in dishes_data:
            success, response = self.run_test(
                f"Creating {dish_data['name']} (${dish_data['price']})",
                "POST",
                "dishes",
                200,
                data=dish_data
            )
            
            if success and 'id' in response:
                self.created_dishes.append(response)
                created_count += 1
                print(f"   ✅ {dish_data['name']} - {dish_data['category']} - ${dish_data['price']}")
        
        print(f"\n📊 Created {created_count}/4 dishes successfully")
        return created_count == 4

    def verify_dishes_created(self):
        """Verify all dishes are accessible via API"""
        success, response = self.run_test(
            "Verifying all dishes created",
            "GET",
            "dishes",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   📋 Total dishes found: {len(response)}")
            for dish in response:
                print(f"   - {dish['name']} ({dish['category']}) - ${dish['price']}")
            return len(response) >= 4
        return False

    def test_qr_code_generation(self):
        """Test QR code generation and verify URL"""
        # Test Base64 QR code
        success, response = self.run_test(
            "Generating QR Code",
            "GET",
            f"qr/{self.restaurant_id}/base64",
            200
        )
        
        if success and 'qr_code' in response and 'menu_url' in response:
            menu_url = response['menu_url']
            qr_valid = response['qr_code'].startswith('data:image/png;base64,')
            
            print(f"   🔗 Menu URL: {menu_url}")
            print(f"   📱 QR Code: {'✅ Valid PNG Base64' if qr_valid else '❌ Invalid format'}")
            
            # Test PNG download
            png_success, _ = self.run_test(
                "Testing QR PNG download",
                "GET",
                f"qr/{self.restaurant_id}",
                200
            )
            
            return success and qr_valid and png_success
        
        return False

    def test_public_menu_with_data(self):
        """Test public menu displays all created data correctly"""
        success, response = self.run_test(
            "Testing Public Menu with Data",
            "GET",
            f"menu/{self.restaurant_id}",
            200
        )
        
        if success and 'restaurant' in response and 'dishes' in response:
            restaurant = response['restaurant']
            dishes = response['dishes']
            categories = response.get('categories', [])
            
            print(f"   🏪 Restaurant: {restaurant['name']}")
            print(f"   📋 Dishes: {len(dishes)} items")
            print(f"   🏷️  Categories: {categories}")
            
            # Verify specific dishes
            dish_names = [dish['name'] for dish in dishes]
            expected_dishes = ["Caesar Salad", "Grilled Salmon", "Fresh Orange Juice", "Chocolate Cake"]
            
            print(f"\n   📝 Verifying specific dishes:")
            all_found = True
            for expected in expected_dishes:
                found = expected in dish_names
                print(f"   {'✅' if found else '❌'} {expected}")
                if not found:
                    all_found = False
            
            # Verify categories
            expected_categories = ["Starters", "Main Course", "Beverages", "Desserts"]
            categories_found = all(cat in categories for cat in expected_categories)
            print(f"\n   🏷️  All categories present: {'✅' if categories_found else '❌'}")
            
            return len(dishes) >= 4 and all_found and categories_found
        
        return False

    def test_dashboard_stats(self):
        """Test dashboard stats show correct data"""
        success, response = self.run_test(
            "Testing Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success:
            print(f"   🏪 Restaurant: {response.get('restaurant_name')}")
            print(f"   📊 Total Dishes: {response.get('total_dishes')}")
            print(f"   🏷️  Total Categories: {response.get('total_categories')}")
            print(f"   📋 Categories: {response.get('categories')}")
            
            return (response.get('total_dishes', 0) >= 4 and 
                   response.get('total_categories', 0) >= 4)
        return False

def main():
    print("🚀 FINAL QR MENU GENERATOR COMPREHENSIVE TEST")
    print("=" * 60)
    print("Testing complete user journey with actual data creation")
    print("=" * 60)
    
    tester = FinalQRMenuTest()
    
    # Test sequence following the exact requirements
    print("\n🎯 STEP 1: Create Test Restaurant with Dishes")
    print("-" * 50)
    
    if not tester.create_test_restaurant():
        print("❌ Failed to create test restaurant. Stopping tests.")
        return 1
    
    if not tester.create_test_dishes():
        print("❌ Failed to create all test dishes. Stopping tests.")
        return 1
    
    if not tester.verify_dishes_created():
        print("❌ Failed to verify dishes creation. Stopping tests.")
        return 1
    
    print("\n🎯 STEP 2: Test QR Code Generation")
    print("-" * 50)
    
    if not tester.test_qr_code_generation():
        print("❌ QR code generation failed.")
        return 1
    
    print("\n🎯 STEP 3: Test Public Menu with Data")
    print("-" * 50)
    
    if not tester.test_public_menu_with_data():
        print("❌ Public menu test failed.")
        return 1
    
    print("\n🎯 STEP 4: Verify Backend API Functionality")
    print("-" * 50)
    
    if not tester.test_dashboard_stats():
        print("❌ Dashboard stats test failed.")
        return 1
    
    # Final Results
    print("\n" + "=" * 60)
    print("🎉 FINAL TEST RESULTS")
    print("=" * 60)
    print(f"✅ All backend APIs working correctly")
    print(f"✅ Test restaurant created: Final Test Restaurant")
    print(f"✅ 4 dishes created across 4 categories")
    print(f"✅ QR code generation working")
    print(f"✅ Public menu displaying all data correctly")
    
    print(f"\n📊 API Test Summary:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    print(f"\n🔗 Test Data URLs:")
    print(f"   Restaurant ID: {tester.restaurant_id}")
    print(f"   Public Menu: https://scanmenu-1.preview.emergentagent.com/menu/{tester.restaurant_id}")
    print(f"   Dashboard: https://scanmenu-1.preview.emergentagent.com/")
    
    print(f"\n✅ Backend is fully functional and ready for frontend testing!")
    return 0

if __name__ == "__main__":
    sys.exit(main())