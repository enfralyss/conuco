import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import ResumenGeneral from './pages/ResumenGeneral';
import Alertas from './pages/Alertas';

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
           {/* Mock de las siguientes páginas para evitar errores 404 */}
           <Route path="lotes" element={<div className="p-8"><h1>Mis Lotes en Desarrollo...</h1></div>} />
           <Route path="historial" element={<div className="p-8"><h1>Historial en Desarrollo...</h1></div>} />
           <Route path="configuracion" element={<div className="p-8"><h1>Configuración en Desarrollo...</h1></div>} />
        </Route>

        {/* Fallback 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
