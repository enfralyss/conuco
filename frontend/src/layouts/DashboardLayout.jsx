import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Map, History, Settings, LogOut, Sprout, Menu, X, Bell, 
  ThermometerSun, Droplets, FlaskConical, AlertTriangle, CheckCircle, Check, BellOff 
} from 'lucide-react';
import { api } from '../lib/api';

const SENSOR_ICONS = {
  temperatura: ThermometerSun,
  humedad: Droplets,
  ph: FlaskConical,
};

const NIVEL_COLORS = {
  critica: 'text-red-500 bg-red-50 hover:bg-red-100',
  advertencia: 'text-amber-500 bg-amber-50 hover:bg-amber-100',
};

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertas, setAlertas] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  const userString = localStorage.getItem('conuco_user');
  const user = userString ? JSON.parse(userString) : { nombre: 'Productor' };

  const handleLogout = () => {
    localStorage.removeItem('conuco_token');
    localStorage.removeItem('conuco_user');
    navigate('/login');
  };

  // Cargar alertas desde la base de datos
  const cargarAlertas = () => {
    api.get('/api/alertas')
      .then(setAlertas)
      .catch(() => {});
  };

  useEffect(() => {
    cargarAlertas();
    const interval = setInterval(cargarAlertas, 5000); // Polling cada 5s
    return () => clearInterval(interval);
  }, []);

  // Clic fuera del panel de notificaciones para cerrarlo
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const unreadAlertas = alertas.filter(a => !a.reconocida);
  const pendientes = unreadAlertas.length;

  const reconocerAlerta = async (e, id) => {
    e.stopPropagation(); // Evita que se cierre el menú
    try {
      await api.put(`/api/alertas/${id}/reconocer`);
      setAlertas(prev => prev.map(a => a.id === id ? { ...a, reconocida: true } : a));
    } catch (err) {}
  };

  const reconocerTodasAlertas = async (e) => {
    e.stopPropagation();
    try {
      await api.put('/api/alertas/reconocer-todas');
      setAlertas(prev => prev.map(a => ({ ...a, reconocida: true })));
    } catch (err) {}
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Resumen General', path: '/dashboard/resumen' },
    { icon: Bell,            label: 'Alertas',         path: '/dashboard/alertas', badgeCount: pendientes },
    { icon: Map,             label: 'Mis Lotes',       path: '/dashboard/lotes' },
    { icon: History,         label: 'Historial',       path: '/dashboard/historial' },
    { icon: Settings,        label: 'Configuración',   path: '/dashboard/configuracion' },
  ];

  const formatRelativo = (ts) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60)   return `Hace ${diff}s`;
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)}min`;
    return `Hace ${Math.floor(diff / 3600)}h`;
  };

  const SidebarContent = () => (
    <>
      <div className="h-20 flex items-center px-8 border-b border-slate-100">
        <Sprout className="text-green-600 mr-3 animate-pulse" size={28} />
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Conuco Tech</h1>
      </div>

      <div className="p-6 pb-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Navegación</p>
        <nav className="space-y-1">
          {menuItems.map((item, idx) => (
            <NavLink
              key={idx}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-green-50 text-green-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-green-600'
                }`
              }
            >
              <div className="relative mr-4">
                <item.icon size={20} />
                {item.badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-[9px] text-white font-bold">
                    {item.badgeCount}
                  </span>
                )}
              </div>
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
    </>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">

      {/* Sidebar — desktop */}
      <aside className="w-72 bg-white border-r border-slate-200 flex-col shadow-sm hidden md:flex">
        <SidebarContent />
      </aside>

      {/* Drawer overlay — mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Drawer — mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-white flex flex-col shadow-xl transform transition-transform duration-300 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:bg-slate-100"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={20} />
        </button>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 w-full">
          {/* Hamburger — solo mobile */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          <h2 className="text-xl font-bold text-slate-800 hidden md:block">Panel de Control</h2>

          <div className="flex items-center space-x-4">
            {/* Campana de Notificaciones Dinámica */}
            <div className="relative" ref={bellRef}>
              <button 
                onClick={() => setBellOpen(!bellOpen)}
                className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all duration-200 focus:outline-none"
              >
                <Bell size={24} className={pendientes > 0 ? "animate-swing" : ""} />
                {pendientes > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-5 w-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] text-white font-black animate-bounce shadow-md">
                    {pendientes}
                  </span>
                )}
              </button>

              {/* Panel Desplegable (Dropdown) de Alertas */}
              {bellOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
                  {/* Encabezado */}
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Alertas Activas</h3>
                      <p className="text-[11px] text-slate-400">{pendientes} pendientes por revisar</p>
                    </div>
                    {pendientes > 0 && (
                      <button 
                        onClick={reconocerTodasAlertas}
                        className="text-xs font-semibold text-green-600 hover:text-green-700 flex items-center gap-1 transition-colors"
                      >
                        <BellOff size={12} />
                        Marcar todo
                      </button>
                    )}
                  </div>

                  {/* Listado */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {unreadAlertas.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center">
                        <CheckCircle size={32} className="text-green-500 mb-2" />
                        <p className="text-xs font-semibold">¡Todo bajo control!</p>
                        <p className="text-[10px] mt-0.5">No hay alertas pendientes en tus lotes.</p>
                      </div>
                    ) : (
                      unreadAlertas.slice(0, 5).map(alerta => {
                        const SensorIcon = SENSOR_ICONS[alerta.sensor] || AlertTriangle;
                        const colorStyle = NIVEL_COLORS[alerta.nivel] || 'text-slate-400 bg-slate-50';

                        return (
                          <div 
                            key={alerta.id} 
                            onClick={async () => {
                              // Marcar automáticamente como reconocida al hacer clic
                              try {
                                await api.put(`/api/alertas/${alerta.id}/reconocer`);
                                setAlertas(prev => prev.map(a => a.id === alerta.id ? { ...a, reconocida: true } : a));
                              } catch (err) {}

                              // Redirigir al lote
                              if (alerta.loteId) {
                                navigate(`/dashboard/lotes/${alerta.loteId}`);
                              } else {
                                navigate('/dashboard/alertas');
                              }
                              setBellOpen(false);
                            }}
                            className="p-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <div className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${colorStyle}`}>
                              <SensorIcon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${alerta.nivel === 'critica' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {alerta.nivel}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  {formatRelativo(alerta.timestamp)}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-700 mt-1 truncate">{alerta.msg}</p>
                              {alerta.loteId && (
                                <p className="text-[9px] text-slate-400 font-medium mt-0.5">Lote: {alerta.loteId}</p>
                              )}
                            </div>
                            <button 
                              onClick={(e) => reconocerAlerta(e, alerta.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors self-center flex-shrink-0"
                              title="Marcar como leída"
                            >
                              <Check size={16} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Ver más */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                    <button 
                      onClick={() => {
                        navigate('/dashboard/alertas');
                        setBellOpen(false);
                      }}
                      className="text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors w-full block py-1"
                    >
                      Ver todas las alertas ({alertas.length})
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>

    </div>
  );
};

export default DashboardLayout;

