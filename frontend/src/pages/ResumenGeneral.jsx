import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import { Thermometer, Droplets, FlaskConical, Wifi, TrendingUp, TrendingDown, Minus, Sun, Wind } from 'lucide-react';

// Clamp helper
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

function useIoTData() {
  const [data, setData] = useState(() =>
    Array.from({ length: 10 }).map((_, i) => {
      const now = new Date(Date.now() - (10 - i) * 5000);
      return {
        time: now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        temperatura: clamp(25.5 + (Math.random() * 3 - 1.5), 18, 35),
        humedad:     clamp(65   + (Math.random() * 8 - 4),   30, 90),
        ph:          clamp(6.5  + (Math.random() * 0.4 - 0.2), 5.0, 8.0),
      };
    })
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const last = prev[prev.length - 1];
        const now = new Date();
        const nuevo = {
          time: now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          temperatura: clamp(last.temperatura + (Math.random() * 1.4 - 0.7), 18, 35),
          humedad:     clamp(last.humedad     + (Math.random() * 2   - 1),   30, 90),
          ph:          clamp(last.ph          + (Math.random() * 0.08 - 0.04), 5.0, 8.0),
        };
        return [...prev.slice(-14), nuevo];
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return data;
}

function tendencia(data, key) {
  if (data.length < 3) return 'estable';
  const last = data[data.length - 1][key];
  const prev = data[data.length - 3][key];
  const diff = last - prev;
  if (Math.abs(diff) < 0.3) return 'estable';
  return diff > 0 ? 'sube' : 'baja';
}

const TEND_ICON = {
  sube:   { Icono: TrendingUp,   color: 'text-red-500'   },
  baja:   { Icono: TrendingDown, color: 'text-blue-500'  },
  estable:{ Icono: Minus,        color: 'text-slate-400' },
};

export default function ResumenGeneral() {
  const sensorData = useIoTData();
  const ultima = sensorData.at(-1) ?? { temperatura: 0, humedad: 0, ph: 0 };

  const loteActivo = { id: 'Lote 001', cultivo: 'Maíz Amarillo', etapa: 'Siembra Tardía', diasSembrado: 65 };

  const saludGeneral = (() => {
    if (ultima.temperatura > 32 || ultima.humedad < 35 || ultima.ph < 5.0 || ultima.ph > 7.5)
      return { label: 'Crítica', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' };
    if (ultima.temperatura > 28 || ultima.humedad < 50 || ultima.ph < 5.5 || ultima.ph > 7.0)
      return { label: 'Advertencia', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' };
    return { label: 'Óptima', color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500' };
  })();

  return (
    <div className="w-full space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Estado del Conuco</h1>
          <p className="text-slate-500 mt-1">
            Monitorización en tiempo real · <strong className="text-green-600">{loteActivo.id} — {loteActivo.cultivo}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${saludGeneral.bg} ${saludGeneral.color}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${saludGeneral.dot}`} />
            Salud {saludGeneral.label}
          </span>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-600 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            Sensores Conectados
          </span>
        </div>
      </div>

      {/* Info strip del lote */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoStrip icono={<Sun size={15} />}  label="Etapa"       value={loteActivo.etapa}             color="amber"  />
        <InfoStrip icono={<Wind size={15} />} label="Días sembrado" value={`${loteActivo.diasSembrado} días`} color="blue"   />
        <InfoStrip icono={<Wifi size={15} />} label="Sensores"    value="3 activos"                    color="green"  />
        <InfoStrip icono={<FlaskConical size={15} />} label="Última lectura" value={ultima.time || '—'} color="purple" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <KpiCard
          title="Temp. Ambiente"
          value={`${ultima.temperatura.toFixed(1)}°C`}
          icono={<Thermometer size={22} />}
          tend={tendencia(sensorData, 'temperatura')}
          colorClass="text-orange-500" bgClass="bg-orange-50" borderClass="border-orange-500"
          rango="Ideal: 20–28°C"
          alerta={ultima.temperatura > 28}
        />
        <KpiCard
          title="Humedad del Suelo"
          value={`${ultima.humedad.toFixed(1)}%`}
          icono={<Droplets size={22} />}
          tend={tendencia(sensorData, 'humedad')}
          colorClass="text-blue-500" bgClass="bg-blue-50" borderClass="border-blue-500"
          rango="Ideal: 55–75%"
          alerta={ultima.humedad < 50}
        />
        <KpiCard
          title="Nivel de pH"
          value={ultima.ph.toFixed(2)}
          icono={<FlaskConical size={22} />}
          tend={tendencia(sensorData, 'ph')}
          colorClass="text-purple-500" bgClass="bg-purple-50" borderClass="border-purple-500"
          rango="Ideal: 5.5–7.0"
          alerta={ultima.ph < 5.5 || ultima.ph > 7.0}
        />
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <ChartCard title="Tendencia Climática" badge={`Actualizado ${ultima.time}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sensorData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickMargin={8} axisLine={false} interval="preserveStartEnd" />
              <YAxis yAxisId="left"  stroke="#f97316" fontSize={11} axisLine={false} tickLine={false} domain={['auto','auto']} />
              <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={11} axisLine={false} tickLine={false} domain={['auto','auto']} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0/0.1)', fontSize: 12 }} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: 12 }} />
              <Line yAxisId="left"  type="monotone" dataKey="temperatura" stroke="#f97316" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} name="Temperatura (°C)" />
              <Line yAxisId="right" type="monotone" dataKey="humedad"     stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} name="Humedad (%)" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Evolución del pH" badge="Rango ideal: 5.5 – 7.0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sensorData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradPh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickMargin={8} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={[4.5, 8.5]} stroke="#a855f7" fontSize={11} axisLine={false} tickLine={false} tickCount={5} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0/0.1)', fontSize: 12 }} />
              <ReferenceLine y={5.5} yAxisId={0} stroke="#a855f7" strokeDasharray="4 4" strokeOpacity={0.5} />
              <ReferenceLine y={7.0} yAxisId={0} stroke="#a855f7" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Area type="monotone" dataKey="ph" stroke="#a855f7" strokeWidth={2.5} fillOpacity={1} fill="url(#gradPh)" name="Nivel pH" dot={false} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function KpiCard({ title, value, icono, tend, colorClass, bgClass, borderClass, rango, alerta }) {
  const { Icono: TendIcono, color: tendColor } = TEND_ICON[tend];
  return (
    <div className={`bg-white p-5 rounded-2xl shadow-sm border-l-4 ${borderClass} border-y border-r ${alerta ? 'border-y-red-100 border-r-red-100' : 'border-y-slate-100 border-r-slate-100'} transition-transform hover:-translate-y-1 duration-200`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{rango}</p>
        </div>
        <div className={`h-11 w-11 rounded-xl ${bgClass} ${colorClass} flex items-center justify-center`}>
          {icono}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <h4 className={`text-4xl font-extrabold ${alerta ? 'text-red-600' : 'text-slate-800'}`}>{value}</h4>
        <span className={`flex items-center gap-1 text-xs font-semibold ${tendColor}`}>
          <TendIcono size={14} />
          {tend === 'estable' ? 'Estable' : tend === 'sube' ? 'Subiendo' : 'Bajando'}
        </span>
      </div>
    </div>
  );
}

function ChartCard({ title, badge, children }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col" style={{ height: '340px' }}>
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg">{badge}</span>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function InfoStrip({ icono, label, value, color }) {
  const colors = {
    amber:  'bg-amber-50  text-amber-700',
    blue:   'bg-blue-50   text-blue-700',
    green:  'bg-green-50  text-green-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl ${colors[color]}`}>
      <span className="opacity-70">{icono}</span>
      <div>
        <p className="text-xs font-semibold opacity-60 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}
