import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, Eye, EyeOff, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(formData);
      if (result.success) {
        toast.success('Login successful!');
        navigate('/admin', { replace: true });
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      {/* Left Column: Animation (Desktop Only) */}
      <div className="relative hidden lg:flex items-end justify-center">
        <DotLottieReact
          src="https://lottie.host/75decb28-7de4-4dc2-87e3-b0bd4a8a9377/M9YJerHvJi.lottie"
          loop
          autoplay
          className="w-full h-full object-contain object-bottom"
        />
      </div>

      {/* Right Column: Form (and full mobile view) */}
      <div className="relative flex items-center justify-center p-6 h-screen">
        {/* Form Container */}
        <div className="relative z-10 max-w-md w-full space-y-8">
          <div className="text-center">
            {/* Mobile-only Animation */}
            <div className="hidden w-48 h-48 mx-auto mb-4">
              <DotLottieReact
                src="https://lottie.host/75decb28-7de4-4dc2-87e3-b0bd4a8a9377/M9YJerHvJi.lottie"
                loop
                autoplay
                className="w-full h-full object-contain"
              />
            </div>

            {/* Desktop-only Header */}
            <div className="hidden lg:block">
              <div className="flex justify-center mb-4">
                <GraduationCap className="h-12 w-12 text-royal-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900">
                Admin Login
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Sign in to your admin account
              </p>
            </div>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="label text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input mt-1"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="password" className="label text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="input pr-10"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg w-full"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
          <div className="text-center">
            <Link to="/" className="text-sm text-gray-600 hover:text-royal-600">
              <Home className="inline-block h-4 w-4 mr-1" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;