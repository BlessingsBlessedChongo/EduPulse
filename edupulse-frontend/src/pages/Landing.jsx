import { useNavigate } from 'react-router-dom';
import { BookOpen, Zap, Users, Shield } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src="/assets/logo.png" alt="EduPulse Logo" className="h-10 object-contain" />
          </div>

          {/* Right-aligned buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-teal-600 hover:text-teal-600 transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-2 bg-gradient-to-r from-blue-900 to-teal-600 text-white font-semibold rounded-lg hover:from-blue-950 hover:to-teal-700 transition-colors"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-900 to-teal-600 text-white py-20 px-4 flex-1">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              The intelligent school management system for the modern era.
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
              Empowering administrators, teachers, students, and parents with seamless communication and real-time analytics.
            </p>
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-3 bg-white text-teal-600 font-bold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Get Started Free
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 border-2 border-white text-white font-bold rounded-lg hover:bg-white hover:text-teal-600 transition-colors"
              >
                Login
              </button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="flex justify-center">
            <img
              src="https://placehold.co/800x500/1e3a8a/ffffff?text=EduPulse+Dashboard+Preview"
              alt="EduPulse Dashboard Preview"
              className="rounded-xl shadow-2xl max-w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">Key Features</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1: Smart Academics */}
            <div className="bg-white rounded-lg p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <BookOpen className="w-12 h-12 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">Smart Academics</h3>
              <p className="text-gray-600 text-center">
                Manage classes, assignments, and grades efficiently.
              </p>
            </div>

            {/* Feature 2: AI Insights */}
            <div className="bg-white rounded-lg p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <Zap className="w-12 h-12 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">AI Insights</h3>
              <p className="text-gray-600 text-center">
                Identify at-risk students and analyze performance using AI.
              </p>
            </div>

            {/* Feature 3: Parent Engagement */}
            <div className="bg-white rounded-lg p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <Users className="w-12 h-12 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">Parent Engagement</h3>
              <p className="text-gray-600 text-center">
                Keep parents in the loop with real-time updates and messaging.
              </p>
            </div>

            {/* Feature 4: Secure & Free */}
            <div className="bg-white rounded-lg p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <Shield className="w-12 h-12 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">Secure & Free</h3>
              <p className="text-gray-600 text-center">
                Enterprise-grade security with no dummy data, entirely connected to our live API.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 mt-auto">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400">
            © 2026 BBC INNOVATIONS – EduPulse. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
