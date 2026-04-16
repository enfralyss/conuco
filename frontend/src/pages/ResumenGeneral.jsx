import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Thermometer, Droplets, FlaskConical } from 'lucide-react';

/**
 * Hook para simular la data (como pediste para la tesis), pero con capacidad de conectar real luego
 */
function useIoTData() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Inicialización del histórico simulado
    const initialData = Array.from({ length: 8 }).map((_, i) => ({
      time: `10:${i * 5 + 10}`,
      temperatura: 25.5 + Math.random() * 2,
      humedad: 65 - Math.random() * 5,
      ph: 6.5 + (Math.random() * 0.2 - 0.1)
    }));
    
    setData(initialData);

    const interval = setInterval(async () => {
      try {
        // En tu fase final aquí harás: const res = await fetch('http://localhost:3001/api/sensores/lecturas')
        // const actual = await res.json()
        
        // Simulación en el cliente para la demostración
        setData(prevData => {
          const last = prevData[prevData.length - 1];
          const newData = [...prevData.slice(1)];
          const now = new Date();
          
          newData.push({
            time: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
            temperatura: last.temperatura + (Math.random() * 1.5 - 0.75),
            humedad: last.humedad + (Math.random() * 1.5 - 0.75),
            ph: last.ph + (Math.random() * 0.1 - 0.05)
          });
          return newData;
        });
      } catch (err) {
        console.error("Error en telemetría", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return data;
}

const ResumenGeneral = () => {
  const sensorData = useIoTData();
  const ultimaLectura = sensorData.length > 0 ? sensorData[sensorData.length - 1] : { temperatura: 0, humedad: 0, ph: 0 };
  
  // Estado global simulado
  const loteActivo = { 
    id: 'Lote 001', 
    cultivo: 'Maíz Amarillo', 
    etapa: 'Siembra Tardía',
    salud: 'Óptima'
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Estado del Conuco</h1>
          <p className="text-slate-500 mt-2 text-lg">
             Monitorización en tiempo real del <strong className="text-green-600 font-semibold">{loteActivo.id} - {loteActivo.cultivo}</strong>
          </p>
        </div>
        <div className="mt-4 md:mt-0 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-200 inline-flex items-center">
           <span className="relative flex h-3 w-3 mr-3">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
           </span>
           <span className="text-sm font-medium text-slate-700">Sensores Conectados</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KpiCard 
          title="Temp. Ambiente" 
          value={`${ultimaLectura.temperatura.toFixed(1)}°C`} 
          icon={<Thermometer size={24} />} 
          colorClass="text-orange-500" 
          bgClass="bg-orange-50"
          borderClass="border-orange-500"
        />
        <KpiCard 
          title="Humedad del Suelo" 
          value={`${ultimaLectura.humedad.toFixed(1)}%`} 
          icon={<Droplets size={24} />} 
          colorClass="text-blue-500"
          bgClass="bg-blue-50"
          borderClass="border-blue-500"
        />
        <KpiCard 
          title="Nivel de pH" 
          value={`${ultimaLectura.ph.toFixed(2)}`} 
          icon={<FlaskConical size={24} />} 
          colorClass="text-purple-500"
          bgClass="bg-purple-50"
          borderClass="border-purple-500"
        />
      </div>

      {/* Gráficos con Tailwind styling */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Gráfico 1 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-96">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Tendencia Climática</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sensorData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickMargin={10} axisLine={false} />
                <YAxis yAxisId="left" stroke="#f97316" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Line yAxisId="left" type="monotone" dataKey="temperatura" stroke="#f97316" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="Temperatura (°C)" />
                <Line yAxisId="right" type="monotone" dataKey="humedad" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="Humedad (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-96">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Evolución del pH Terrestre</h3>
              <span className="text-xs font-semibold px-2 py-1 bg-purple-100 text-purple-700 rounded-lg">Rango Ideal: 6.0 - 7.0</span>
           </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sensorData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorPh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickMargin={10} axisLine={false} />
                <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} stroke="#a855f7" fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                />
                <Area type="monotone" dataKey="ph" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorPh)" name="Nivel pH" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

// Componente Tarjeta KPI
const KpiCard = ({ title, value, icon, colorClass, bgClass, borderClass }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-sm border-l-4 ${borderClass} border-y border-r border-y-slate-100 border-r-slate-100 flex items-center justify-between transition-transform hover:-translate-y-1 duration-300`}>
    <div>
      <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">{title}</p>
      <h4 className={`text-4xl font-extrabold text-slate-800`}>{value}</h4>
    </div>
    <div className={`h-14 w-14 rounded-2xl ${bgClass} ${colorClass} flex items-center justify-center shadow-inner`}>
      {icon}
    </div>
  </div>
);

export default ResumenGeneral;
