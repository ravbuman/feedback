import { Link } from 'react-router-dom';
import {
  GraduationCap,
  ArrowRight,
  CheckCircle,
  Users,
  BookOpen,
  BarChart3,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  Workflow,
  ThumbsUp,
  Globe,
  Layers
} from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useState, useEffect } from 'react';
import api from '../services/api';

const Home = () => {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await api.get('/health');
        setHealth(response.data);
      } catch (err) {
        setError(err.message);
      }
    };
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-royal-50">
      {/* Hero Section */}
      <div className="min-h-screen flex items-center pt-16 pb-8 lg:pt-0 lg:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Content */}
            <div className="space-y-8 order-2 lg:order-none text-center lg:text-left">
              <div className="space-y-6">
                <div className="flex items-center justify-center lg:justify-start space-x-3">
                  <GraduationCap className="h-10 w-10 sm:h-12 sm:w-12 text-royal-600" />
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                    PydahSoft
                  </h1>
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
                  Student Feedback System
                </h2>
                <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
                  A comprehensive platform designed to streamline student feedback collection
                  and management across all subjects and faculty members.
                </p>

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
            <div className="relative w-full h-80 lg:h-[500px] order-1 hidden lg:flex items-center justify-center">
              <DotLottieReact
                src="https://lottie.host/ed34085d-9f26-4ca0-a3f9-4bbbda695ae3/nL1UbSYj1o.lottie"
                loop
                autoplay
                className="w-full h-full object-contain"
              />


              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-royal-100 rounded-full opacity-20"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-royal-200 rounded-full opacity-10"></div>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-4xl font-bold text-gray-900">About Our System</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Our Student Feedback System is designed with both administrators and students in mind.
            It aims to enhance transparency, streamline communication, and provide meaningful insights
            for better decision-making in education.
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-royal-50">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <h2 className="text-3xl font-bold text-center text-gray-900">Key Benefits</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: ShieldCheck, title: "Secure & Reliable", desc: "Data privacy and security at every level." },
              { icon: Sparkles, title: "User-Friendly", desc: "Simple, intuitive interface for all users." },
              { icon: Globe, title: "Accessible Anywhere", desc: "Cloud-based access for students and admins." },
              { icon: ThumbsUp, title: "Actionable Insights", desc: "Detailed reports for better decision-making." },
              { icon: MessageSquare, title: "Open Communication", desc: "Encourages dialogue between students & faculty." },
              { icon: Layers, title: "Scalable Design", desc: "Easily adapts to institutions of all sizes." }
            ].map((item, idx) => (
              <div key={idx} className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
                <item.icon className="h-10 w-10 text-royal-600 mb-4" />
                <h4 className="text-xl font-semibold text-gray-900">{item.title}</h4>
                <p className="text-gray-600 mt-2">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <h2 className="text-3xl font-bold text-center text-gray-900">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            {[
              { step: "01", title: "Student Feedback", desc: "Students submit feedback easily online." },
              { step: "02", title: "Secure Processing", desc: "System collects and stores securely." },
              { step: "03", title: "Data Analysis", desc: "Automated reports & insights generated." },
              { step: "04", title: "Action & Improvement", desc: "Faculty & admin use insights to improve." }
            ].map((item, idx) => (
              <div key={idx} className="p-6 bg-royal-50 rounded-lg shadow-sm">
                <div className="text-royal-600 font-bold text-2xl mb-2">{item.step}</div>
                <h4 className="text-xl font-semibold text-gray-900">{item.title}</h4>
                <p className="text-gray-600 mt-2">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-royal-50">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-12">
          <h2 className="text-3xl font-bold text-gray-900">What People Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { quote: "This system has transformed the way we collect feedback.", name: "Dr. A. Kumar", role: "Principal" },
              { quote: "As a student, I feel my opinions actually matter now.", name: "Riya Sharma", role: "Student" },
              { quote: "The analytics dashboard saves us countless hours.", name: "Prof. R. Mehta", role: "Faculty" }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
                <p className="text-gray-700 italic">“{item.quote}”</p>
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-900">{item.name}</h4>
                  <p className="text-sm text-gray-600">{item.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-white text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-4xl font-bold text-gray-900">Ready to Get Started?</h2>
          <p className="text-lg text-gray-600">
            Empower your institution with a smart, secure, and scalable student feedback system.
          </p>
          <Link
            to="/admin/login"
            className="btn btn-primary btn-lg inline-flex items-center group"
          >
            Launch Admin Panel
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;