import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Map, History, Settings, LogOut, Sprout } from 'lucide-react';

const DashboardLayout = () => {
  const navigate = useNavigate();
  // Obtener usuario del estado local
  const userString = localStorage.getItem('conuco_user');
  const user = userString ? JSON.parse(userString) : { nombre: 'Productor' };

  const handleLogout = () => {
    localStorage.removeItem('conuco_token');
    localStorage.removeItem('conuco_user');
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Resumen General', path: '/dashboard/resumen' },
    { icon: Map, label: 'Mis Lotes', path: '/dashboard/lotes' },
    { icon: History, label: 'Historial de Cultivos', path: '/dashboard/historial' },
    { icon: Settings, label: 'Configuración', path: '/dashboard/configuracion' },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      
      {/* Sidebar Lateral */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm hidden md:flex">
        <div className="h-20 flex items-center px-8 border-b border-slate-100">
          <Sprout className="text-green-600 mr-3" size={28} />
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Conuco Tech</h1>
        </div>
        
        <div className="p-6 pb-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Navegación</p>
          <nav className="space-y-1">
            {menuItems.map((item, idx) => (
              <NavLink
                key={idx}
                to={item.path}
                className={({ isActive }) => 
                  `flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-green-50 text-green-700 font-medium' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-green-600'
                  }`
                }
              >
                <item.icon size={20} className="mr-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-100">
          <div className="flex items-center mb-6">
            <div className="h-10 w-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-lg">
              {user.nombre.charAt(0)}
            </div>
            <div className="ml-3">
              <p className="text-sm font-semibold text-slate-800">{user.nombre}</p>
              <p className="text-xs text-slate-500">Sesión Activa</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex w-full items-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut size={20} className="mr-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar Header (Mobile o Breadcrumbs) */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10 w-full">
          <h2 className="text-xl font-bold text-slate-800">Panel de Control</h2>
          <div className="flex items-center space-x-4">
             {/* Notificaciones Mock */}
             <div className="relative cursor-pointer">
               <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white"></div>
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 hover:text-slate-600 transition-colors"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
             </div>
          </div>
        </header>

        {/* Dynamic Outlet para las sub-rutas */}
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>

    </div>
  );
};

export default DashboardLayout;
