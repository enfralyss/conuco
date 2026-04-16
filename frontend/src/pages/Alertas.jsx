import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, ThermometerSun, Droplets, FlaskConical, CheckCircle, BellOff, Bell } from 'lucide-react';

// Umbrales por sensor
const UMBRALES = {
  temperatura: {
    critico_alto: 32, advertencia_alto: 28,
    advertencia_bajo: 18, critico_bajo: 14,
    unidad: '°C', icono: ThermometerSun, color: 'orange'
  },
  humedad: {
    critico_alto: 85, advertencia_alto: 75,
    advertencia_bajo: 45, critico_bajo: 30,
    unidad: '%', icono: Droplets, color: 'blue'
  },
  ph: {
    critico_alto: 7.5, advertencia_alto: 7.0,
    advertencia_bajo: 5.5, critico_bajo: 5.0,
    unidad: '', icono: FlaskConical, color: 'purple'
  }
};

function evaluarSensor(nombre, valor) {
  const u = UMBRALES[nombre];
  if (valor >= u.critico_alto)   return { nivel: 'critica',     msg: `${nombre} muy alta: ${valor.toFixed(2)}${u.unidad}` };
  if (valor <= u.critico_bajo)   return { nivel: 'critica',     msg: `${nombre} muy baja: ${valor.toFixed(2)}${u.unidad}` };
  if (valor >= u.advertencia_alto) return { nivel: 'advertencia', msg: `${nombre} elevada: ${valor.toFixed(2)}${u.unidad}` };
  if (valor <= u.advertencia_bajo) return { nivel: 'advertencia', msg: `${nombre} baja: ${valor.toFixed(2)}${u.unidad}` };
  return null;
}

function useAlertas() {
  const [alertas, setAlertas] = useState(() => {
    // Alertas históricas iniciales para poblar la vista
    const ahora = Date.now();
    return [
      { id: 1, nivel: 'critica',     sensor: 'temperatura', msg: 'Temperatura muy alta: 33.2°C',  timestamp: ahora - 1000 * 60 * 18, reconocida: false },
      { id: 2, nivel: 'advertencia', sensor: 'humedad',     msg: 'Humedad baja: 44.8%',           timestamp: ahora - 1000 * 60 * 11, reconocida: false },
      { id: 3, nivel: 'advertencia', sensor: 'ph',          msg: 'pH elevado: 7.1',               timestamp: ahora - 1000 * 60 * 6,  reconocida: true  },
      { id: 4, nivel: 'critica',     sensor: 'ph',          msg: 'pH muy bajo: 4.9',              timestamp: ahora - 1000 * 60 * 2,  reconocida: false },
    ];
  });

  const contadorRef = useRef(5);

  useEffect(() => {
    const interval = setInterval(() => {
      // Simular lectura de sensores
      const lectura = {
        temperatura: 25 + (Math.random() * 14 - 4),  // 21 – 35
        humedad:     60 + (Math.random() * 50 - 20), // 40 – 90
        ph:          6.2 + (Math.random() * 3 - 1.5) // 4.7 – 7.7
      };

      Object.entries(lectura).forEach(([sensor, valor]) => {
        const resultado = evaluarSensor(sensor, valor);
        if (resultado) {
          setAlertas(prev => [{
            id: contadorRef.current++,
            nivel: resultado.nivel,
            sensor,
            msg: resultado.msg.charAt(0).toUpperCase() + resultado.msg.slice(1),
            timestamp: Date.now(),
            reconocida: false
          }, ...prev].slice(0, 50)); // máximo 50 alertas
        }
      });
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const reconocer = (id) =>
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, reconocida: true } : a));

  const reconocerTodas = () =>
    setAlertas(prev => prev.map(a => ({ ...a, reconocida: true })));

  return { alertas, reconocer, reconocerTodas };
}

// ─── Utilidades de presentación ───────────────────────────────────────────────

const NIVEL_STYLES = {
  critica:     { bg: 'bg-red-50',     border: 'border-red-400',    badge: 'bg-red-100 text-red-700',    dot: 'bg-red-500',    label: 'Crítica'     },
  advertencia: { bg: 'bg-amber-50',   border: 'border-amber-400',  badge: 'bg-amber-100 text-amber-700',dot: 'bg-amber-500',  label: 'Advertencia' },
};

const SENSOR_META = {
  temperatura: { label: 'Temperatura', Icono: ThermometerSun, iconColor: 'text-orange-500' },
  humedad:     { label: 'Humedad',     Icono: Droplets,       iconColor: 'text-blue-500'   },
  ph:          { label: 'pH',          Icono: FlaskConical,   iconColor: 'text-purple-500' },
};

function formatRelativo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)   return `Hace ${diff}s`;
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)}min`;
  return `Hace ${Math.floor(diff / 3600)}h`;
}

// ─── Componente principal ──────────────────────────────────────────────────────

const FILTROS = ['Todas', 'Críticas', 'Advertencias', 'Reconocidas'];

export default function Alertas() {
  const { alertas, reconocer, reconocerTodas } = useAlertas();
  const [filtro, setFiltro] = useState('Todas');
  const [, tick] = useState(0);

  // Re-render cada 15s para actualizar timestamps relativos
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  const pendientes = alertas.filter(a => !a.reconocida).length;

  const alertasFiltradas = alertas.filter(a => {
    if (filtro === 'Críticas')      return a.nivel === 'critica'     && !a.reconocida;
    if (filtro === 'Advertencias')  return a.nivel === 'advertencia' && !a.reconocida;
    if (filtro === 'Reconocidas')   return a.reconocida;
    return true;
  });

  return (
    <div className="w-full">
      {/* Encabezado */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Centro de Alertas</h1>
          <p className="text-slate-500 mt-1">
            Monitoreo automático de umbrales — Lote 001 · Maíz Amarillo
          </p>
        </div>
        {pendientes > 0 && (
          <button
            onClick={reconocerTodas}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            <BellOff size={16} />
            Reconocer todas ({pendientes})
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={alertas.length}                               color="slate" />
        <StatCard label="Críticas"     value={alertas.filter(a => a.nivel === 'critica'     && !a.reconocida).length} color="red"   />
        <StatCard label="Advertencias" value={alertas.filter(a => a.nivel === 'advertencia' && !a.reconocida).length} color="amber" />
        <StatCard label="Reconocidas"  value={alertas.filter(a => a.reconocida).length}                              color="green" />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {FILTROS.map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
              filtro === f
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {alertasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <CheckCircle size={48} className="mb-3 text-green-400" />
            <p className="font-semibold text-lg">Sin alertas activas</p>
            <p className="text-sm">Todos los sensores operando dentro del rango normal</p>
          </div>
        ) : (
          alertasFiltradas.map(alerta => (
            <AlertaCard
              key={alerta.id}
              alerta={alerta}
              onReconocer={() => reconocer(alerta.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function AlertaCard({ alerta, onReconocer }) {
  const s = NIVEL_STYLES[alerta.nivel];
  const meta = SENSOR_META[alerta.sensor];
  const { Icono, iconColor } = meta;

  return (
    <div className={`flex items-start gap-4 p-4 rounded-2xl border-l-4 ${s.bg} ${s.border} border-y border-r border-y-transparent border-r-transparent transition-opacity ${alerta.reconocida ? 'opacity-50' : ''}`}>
      <div className={`mt-0.5 h-10 w-10 rounded-xl flex items-center justify-center bg-white shadow-sm flex-shrink-0 ${iconColor}`}>
        <Icono size={20} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.badge}`}>
            {s.label}
          </span>
          <span className="text-xs font-semibold text-slate-500">{meta.label}</span>
          {alerta.reconocida && (
            <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
              <CheckCircle size={12} /> Reconocida
            </span>
          )}
        </div>
        <p className="mt-1 text-sm font-semibold text-slate-800">{alerta.msg}</p>
        <p className="text-xs text-slate-400 mt-0.5">{formatRelativo(alerta.timestamp)}</p>
      </div>

      {!alerta.reconocida && (
        <button
          onClick={onReconocer}
          className="flex-shrink-0 p-2 rounded-xl text-slate-400 hover:bg-white hover:text-green-600 transition-colors"
          title="Reconocer alerta"
        >
          <CheckCircle size={20} />
        </button>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    slate: 'text-slate-700 bg-slate-50  border-slate-200',
    red:   'text-red-700   bg-red-50    border-red-200',
    amber: 'text-amber-700 bg-amber-50  border-amber-200',
    green: 'text-green-700 bg-green-50  border-green-200',
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wider mt-1 opacity-70">{label}</p>
    </div>
  );
}
