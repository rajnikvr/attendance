import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, UserPlus, Camera, Users, FileText } from 'lucide-react';

const Layout = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/register', label: 'Register Student', icon: UserPlus },
    { path: '/attendance', label: 'Mark Attendance', icon: Camera },
    { path: '/students', label: 'View Students', icon: Users },
    { path: '/records', label: 'Attendance Records', icon: FileText },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 fixed h-full">
        <div className="p-6 border-b border-zinc-200">
          <h1 className="text-2xl font-black tracking-tight" data-testid="app-title">FACE ATTEND</h1>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Recognition System</p>
        </div>
        
        <nav className="p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex items-center gap-3 px-4 py-3 mb-2 transition-colors duration-200 ${
                  isActive
                    ? 'bg-black text-white font-bold'
                    : 'text-black hover:bg-zinc-100 font-medium'
                }`}
              >
                <Icon size={20} />
                <span className="text-sm uppercase tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8">
        <Outlet />
      </main>

      {/* Noise Overlay */}
      <div className="noise-overlay" />
    </div>
  );
};

export default Layout;