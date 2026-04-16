import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import ResumenGeneral from './pages/ResumenGeneral';
import Alertas from './pages/Alertas';
import MisLotes from './pages/MisLotes';
import Historial from './pages/Historial';
import Configuracion from './pages/Configuracion';

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta base redirige a login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Autenticación */}
        <Route path="/login" element={<Login />} />

        {/* Panel de Control Privado */}
        <Route path="/dashboard" element={<DashboardLayout />}>
           <Route path="resumen" element={<ResumenGeneral />} />
           <Route path="alertas" element={<Alertas />} />
           <Route path="lotes" element={<MisLotes />} />
           <Route path="historial" element={<Historial />} />
           <Route path="configuracion" element={<Configuracion />} />
        </Route>

        {/* Fallback 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
