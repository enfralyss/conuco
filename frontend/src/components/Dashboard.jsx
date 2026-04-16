import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import './Dashboard.css'; // Asume estilos personalizados

/**
 * Hook personalizado para simular el consumo de la API local
 * hasta que el Backend exponga los websockets/endpoints finales.
 */
function useMockSensorsData() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Datos históricos simulados de la última hora
    const initialData = Array.from({ length: 10 }).map((_, i) => ({
      time: `10:${i * 5} AM`,
      temperatura: 25 + Math.random() * 5,
      humedad: 60 - Math.random() * 10,
      ph: 6.5 + (Math.random() * 0.5 - 0.25)
    }));
    
    setData(initialData);

    // Simulador de "Streaming" cada 5 segundos
    const interval = setInterval(() => {
      setData(prevData => {
        const last = prevData[prevData.length - 1];
        const newData = [...prevData.slice(1)]; // Mantiene el tamaño visual del chart
        const now = new Date();
        
        newData.push({
          time: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
          temperatura: last.temperatura + (Math.random() * 2 - 1),
          humedad: last.humedad + (Math.random() * 2 - 1),
          ph: last.ph + (Math.random() * 0.1 - 0.05)
        });
        
        return newData;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return data;
}

/**
 * Componente Principal del Dashboard (Conuco Tech)
 */
const Dashboard = () => {
  const sensorData = useMockSensorsData();
  
  // Última lectura para las tarjetas resumen ( KPIs )
  const ultimaLectura = sensorData.length > 0 ? sensorData[sensorData.length - 1] : { temperatura: 0, humedad: 0, ph: 0 };

  return (
    <div className="dashboard-container" style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <header className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: '#2c3e50', fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌾 Conuco Tech Monitor</h1>
        <p style={{ color: '#7f8c8d' }}>Lote 001 - Cultivo Activo: <strong style={{color: '#27ae60'}}>Maíz Amarillo (Desarrollo)</strong></p>
      </header>

      {/* Tarjetas de Resumen (KPIs) */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <KpiCard title="Temperatura Ambiente" value={`${ultimaLectura.temperatura.toFixed(1)}°C`} alert={ultimaLectura.temperatura > 32} color="#e74c3c" />
        <KpiCard title="Humedad del Suelo" value={`${ultimaLectura.humedad.toFixed(1)}%`} alert={ultimaLectura.humedad < 40} color="#3498db" />
        <KpiCard title="Nivel de pH" value={`${ultimaLectura.ph.toFixed(2)}`} alert={ultimaLectura.ph < 5.5} color="#9b59b6" />
      </div>

      {/* Gráficos en Tiempo Real */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        <div className="chart-wrapper" style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '1rem', color: '#34495e' }}>Tendencia de Temperatura y Humedad</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sensorData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ecf0f1" />
              <XAxis dataKey="time" stroke="#95a5a6" />
              <YAxis yAxisId="left" stroke="#e74c3c" />
              <YAxis yAxisId="right" orientation="right" stroke="#3498db" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="temperatura" stroke="#e74c3c" strokeWidth={3} dot={false} name="Temperatura (°C)" />
              <Line yAxisId="right" type="monotone" dataKey="humedad" stroke="#3498db" strokeWidth={3} dot={false} name="Humedad (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-wrapper" style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '1rem', color: '#34495e' }}>Evolución del pH del Suelo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={sensorData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ecf0f1" />
              <XAxis dataKey="time" stroke="#95a5a6" />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="#9b59b6" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="ph" stroke="#9b59b6" fill="#9b59b6" fillOpacity={0.2} name="Nivel pH" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
};

// Sub-componente para las tarjetas
const KpiCard = ({ title, value, alert, color }) => (
  <div style={{
    background: '#fff',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: alert ? `0 0 0 2px ${color}` : '0 4px 6px rgba(0,0,0,0.05)',
    borderLeft: `5px solid ${color}`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  }}>
    <span style={{ color: '#7f8c8d', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase' }}>{title}</span>
    <span style={{ fontSize: '2.5rem', fontWeight: '700', color: '#2c3e50', marginTop: '0.5rem' }}>{value}</span>
    {alert && <span style={{ color: color, fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 'bold' }}>⚠️ Alerta de umbral</span>}
  </div>
);

export default Dashboard;
