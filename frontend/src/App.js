import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Components
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const categories = [
  'Starters',
  'Main Course', 
  'Beverages',
  'Desserts',
  'Soups',
  'Salads',
  'Sides'
];

// Auth Context
const AuthContext = React.createContext(null);

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login/Register Component
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const data = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, data);
      
      login(response.data.access_token, response.data.restaurant);
      toast.success(isLogin ? 'Login successful!' : 'Registration successful!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-800">
              QR Menu Generator
            </CardTitle>
            <CardDescription>
              {isLogin ? 'Sign in to your restaurant account' : 'Create your restaurant account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <Label htmlFor="name">Restaurant Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              onClick={handleSubmit} 
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={loading}
            >
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-orange-600 hover:text-orange-700"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [dishes, setDishes] = useState([]);
  const [stats, setStats] = useState(null);
  const [qrCode, setQrCode] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    image_url: ''
  });
  const [editingDish, setEditingDish] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dishes');
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchDishes();
    fetchStats();
    fetchQRCode();
  }, []);

  const fetchDishes = async () => {
    try {
      const response = await axios.get(`${API}/dishes`);
      setDishes(response.data);
    } catch (error) {
      toast.error('Failed to fetch dishes');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch stats');
    }
  };

  const fetchQRCode = async () => {
    try {
      const response = await axios.get(`${API}/qr/${user.id}/base64`);
      setQrCode(response.data.qr_code);
    } catch (error) {
      toast.error('Failed to generate QR code');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const dishData = {
        ...formData,
        price: parseFloat(formData.price)
      };

      if (editingDish) {
        await axios.put(`${API}/dishes/${editingDish.id}`, dishData);
        toast.success('Dish updated successfully!');
      } else {
        await axios.post(`${API}/dishes`, dishData);
        toast.success('Dish added successfully!');
      }

      setFormData({ name: '', category: '', price: '', description: '', image_url: '' });
      setEditingDish(null);
      setIsDialogOpen(false);
      fetchDishes();
      fetchStats();
    } catch (error) {
      toast.error('Failed to save dish');
    }
  };

  const handleEdit = (dish) => {
    setEditingDish(dish);
    setFormData({
      name: dish.name,
      category: dish.category,
      price: dish.price.toString(),
      description: dish.description || '',
      image_url: dish.image_url || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (dishId) => {
    if (window.confirm('Are you sure you want to delete this dish?')) {
      try {
        await axios.delete(`${API}/dishes/${dishId}`);
        toast.success('Dish deleted successfully!');
        fetchDishes();
        fetchStats();
      } catch (error) {
        toast.error('Failed to delete dish');
      }
    }
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `${user.name}-qr-menu.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">QR Menu Dashboard</h1>
              <p className="text-gray-600">{user?.name}</p>
            </div>
            <Button onClick={logout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Total Dishes</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_dishes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                      <path fillRule="evenodd" d="M3 8a2 2 0 012-2v9a2 2 0 104 0V6a2 2 0 012-2v9a2 2 0 104 0V6a2 2 0 012-2v9a2 2 0 104 0V8a2 2 0 00-2-2H5a2 2 0 00-2 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Categories</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_categories}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Menu Link</p>
                    <p className="text-xs text-gray-500">QR Ready</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/90 backdrop-blur-sm">
            <TabsTrigger value="dishes">Manage Dishes</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
          </TabsList>

          <TabsContent value="dishes" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Dish Form */}
              <Card className="bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Add New Dish</CardTitle>
                  <CardDescription>
                    Add dishes to your restaurant menu
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-orange-600 hover:bg-orange-700">
                        Add New Dish
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          {editingDish ? 'Edit Dish' : 'Add New Dish'}
                        </DialogTitle>
                        <DialogDescription>
                          {editingDish ? 'Update dish information' : 'Add a new dish to your menu'}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="name">Dish Name</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(category => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="price">Price ($)</Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            required
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="mt-1"
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="image_url">Image URL</Label>
                          <Input
                            id="image_url"
                            type="url"
                            value={formData.image_url}
                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                            className="mt-1"
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                            {editingDish ? 'Update Dish' : 'Add Dish'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              {/* Dishes List */}
              <div className="lg:col-span-2">
                <Card className="bg-white/90 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Your Menu Items</CardTitle>
                    <CardDescription>
                      Manage your restaurant's dishes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dishes.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No dishes added yet. Start by adding your first dish!
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {dishes.map(dish => (
                          <div key={dish.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                            {dish.image_url && (
                              <img
                                src={dish.image_url}
                                alt={dish.name}
                                className="w-16 h-16 object-cover rounded-lg"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-gray-900">{dish.name}</h3>
                                <Badge variant="secondary">{dish.category}</Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{dish.description}</p>
                              <p className="text-lg font-bold text-orange-600 mt-2">${dish.price}</p>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(dish)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(dish.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="qr" className="space-y-6">
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader className="text-center">
                <CardTitle>Your Restaurant QR Code</CardTitle>
                <CardDescription>
                  Customers can scan this QR code to view your menu
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                {qrCode ? (
                  <div className="space-y-6">
                    <div className="flex justify-center">
                      <div className="p-4 bg-white rounded-lg shadow-md">
                        <img
                          src={qrCode}
                          alt="QR Code"
                          className="w-64 h-64 mx-auto"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Menu URL: {BACKEND_URL}/menu/{user?.id}
                      </p>
                      <div className="flex justify-center space-x-4">
                        <Button onClick={downloadQR} className="bg-orange-600 hover:bg-orange-700">
                          Download QR Code
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => window.open(`${BACKEND_URL}/menu/${user?.id}`, '_blank')}
                        >
                          Preview Menu
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-gray-500">
                    Loading QR code...
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Public Menu Component
const PublicMenu = () => {
  const [menu, setMenu] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const restaurantId = window.location.pathname.split('/')[2];

  useEffect(() => {
    fetchMenu();
  }, [restaurantId]);

  const fetchMenu = async () => {
    try {
      const response = await axios.get(`${API}/menu/${restaurantId}`);
      setMenu(response.data);
    } catch (error) {
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const filteredDishes = menu?.dishes.filter(dish => 
    selectedCategory === 'all' || dish.category === selectedCategory
  ) || [];

  const sampleImages = [
    'https://images.unsplash.com/photo-1600891964599-f61ba0e24092',
    'https://images.unsplash.com/photo-1651440204227-a9a5b9d19712',
    'https://images.unsplash.com/photo-1657053460900-3a12f32b592f',
    'https://images.unsplash.com/photo-1550367363-ea12860cc124',
    'https://images.unsplash.com/photo-1696805566858-fe4a670d5df3',
    'https://images.unsplash.com/photo-1645066803695-f0dbe2c33e42'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Menu Not Found</h2>
            <p className="text-gray-600">The requested restaurant menu could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{menu.restaurant.name}</h1>
          <p className="text-gray-600">Digital Menu</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Image */}
        <div className="mb-8">
          <img
            src={sampleImages[0]}
            alt="Restaurant"
            className="w-full h-64 object-cover rounded-xl shadow-lg"
          />
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
              className={selectedCategory === 'all' ? 'bg-orange-600 hover:bg-orange-700' : ''}
            >
              All Items
            </Button>
            {menu.categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? 'bg-orange-600 hover:bg-orange-700' : ''}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredDishes.map((dish, index) => (
            <Card key={dish.id} className="bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-0">
                <div className="flex">
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{dish.name}</h3>
                      <Badge variant="secondary" className="ml-2">
                        {dish.category}
                      </Badge>
                    </div>
                    {dish.description && (
                      <p className="text-gray-600 text-sm mb-4">{dish.description}</p>
                    )}
                    <p className="text-2xl font-bold text-orange-600">${dish.price}</p>
                  </div>
                  <div className="w-32 h-32">
                    <img
                      src={dish.image_url || sampleImages[index % sampleImages.length]}
                      alt={dish.name}
                      className="w-full h-full object-cover rounded-r-lg"
                      onError={(e) => {
                        e.target.src = sampleImages[index % sampleImages.length];
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredDishes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No dishes found in this category.</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 py-8 border-t border-gray-200">
          <p className="text-gray-600">Powered by QR Menu Generator</p>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            <Route path="/menu/:restaurantId" element={<PublicMenu />} />
            <Route path="/auth" element={<AuthRedirect />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          </Routes>
          <Toaster />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

// Auth Redirect Component
const AuthRedirect = () => {
  const { user } = useAuth();
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <AuthPage />;
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/auth" />;
};

export default App;