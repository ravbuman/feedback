import { useAuth } from '../../contexts/AuthContext';
import { GraduationCap, LogOut } from 'lucide-react';

const Layout = ({ children }) => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
        {/* PydahSoft Branding */}
        <div className="flex items-center">
          <GraduationCap className="h-8 w-8 text-royal-600" />
          <span className="ml-2 text-xl font-bold text-gray-900">PydahSoft</span>
        </div>

        {/* Right side - Admin Dashboard text and logout */}
        <div className="flex items-center gap-x-4">
          {isAuthenticated && (
            <>
              <div className="text-sm font-medium text-gray-900">
                Admin Dashboard
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          )}
        </div>
      </div>

      {/* Page content */}
      <main>
        {children}
      </main>
    </div>
  );
};

export default Layout;
