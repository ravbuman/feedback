import { useAuth } from '../../contexts/AuthContext';
import { TrendingUp, LogOut } from 'lucide-react';

const Layout = ({ children }) => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="sticky top-0 z-40 flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-gray-200 sm:bg-white bg-white/40 backdrop-blur-sm px-4 shadow-sm sm:px-6 lg:px-8">
        {/* PydahSoft Branding */}
        <div className="flex items-center">
          <TrendingUp  className="h-5 w-5 sm:h-7 sm:w-7 text-royal-600" />
          <span className="ml-2 text-sm sm:text-lg md:text-2xl font-bold text-gray-900">
            Feeder
          </span>

        </div>

        {/* Right side - Admin Dashboard text and logout */}
        <div className="flex items-center gap-x-4">
          {isAuthenticated && (
            <>

              <button
                onClick={logout}
                className="flex items-center  text-base text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-4 w-6" />
                <span className='hidden sm:inline'>Logout</span>
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
