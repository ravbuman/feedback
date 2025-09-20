import { Link } from 'react-router-dom';
import { GraduationCap, ArrowRight, CheckCircle, Users, BookOpen, BarChart3 } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-royal-50">
      <div className="min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <GraduationCap className="h-12 w-12 text-royal-600" />
                  <h1 className="text-4xl font-bold text-gray-900">
                    PydahSoft
                  </h1>
                </div>
                <h2 className="text-5xl font-bold text-gray-900 leading-tight">
                  Student Feedback System
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed">
                  A comprehensive platform designed to streamline student feedback collection 
                  and management across all subjects and faculty members.
                </p>
              </div>

              {/* Why Feedback is Important */}
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-gray-900">
                  Why Feedback Matters
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-6 w-6 text-royal-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">
                      <strong>Continuous Improvement:</strong> Regular feedback helps identify 
                      areas for enhancement in teaching methods and course content.
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-6 w-6 text-royal-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">
                      <strong>Student Engagement:</strong> Feedback systems encourage active 
                      participation and create a culture of open communication.
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-6 w-6 text-royal-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">
                      <strong>Quality Assurance:</strong> Systematic feedback collection ensures 
                      consistent quality across all educational programs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Admin Login Button */}
              <div className="pt-6">
                <Link
                  to="/admin/login"
                  className="btn btn-primary btn-lg inline-flex items-center group"
                >
                  Admin Login
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Right Side - Visual Elements */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      System Features
                    </h3>
                    <p className="text-gray-600">
                      Everything you need for effective feedback management
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center space-x-4 p-4 bg-royal-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <Users className="h-8 w-8 text-royal-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Faculty Management</h4>
                        <p className="text-sm text-gray-600">Manage faculty profiles and assignments</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 p-4 bg-royal-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <BookOpen className="h-8 w-8 text-royal-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Course & Subject Management</h4>
                        <p className="text-sm text-gray-600">Organize courses, subjects, and semesters</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 p-4 bg-royal-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <BarChart3 className="h-8 w-8 text-royal-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Analytics & Reports</h4>
                        <p className="text-sm text-gray-600">Comprehensive insights and reporting</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-royal-100 rounded-full opacity-20"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-royal-200 rounded-full opacity-10"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
