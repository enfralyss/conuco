import { useState, useEffect } from 'react';
import { AlertTriangle, ThermometerSun, Droplets, CheckCircle, BellOff, MapPin } from 'lucide-react';
import { api } from '../lib/api';
import { SENSOR_AMBIENTAL } from '../config/sensorAmbiental';

// ── Hook: alertas desde el backend (polling) ──────────────────────────────────
function useAlertas() {
  const [alertas, setAlertas] = useState([]);

  const cargar = () =>
    api.get('/api/alertas')
      .then(setAlertas)
      .catch(() => {});

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 8000);
    return () => clearInterval(interval);
  }, []);

  const reconocer = async (id) => {
    await api.put(`/api/alertas/${id}/reconocer`);
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, reconocida: true } : a));
  };

  const reconocerTodas = async () => {
    await api.put('/api/alertas/reconocer-todas');
    setAlertas(prev => prev.map(a => ({ ...a, reconocida: true })));
  };

  return { alertas, reconocer, reconocerTodas };
}

// ─── Utilidades de presentación ───────────────────────────────────────────────

const NIVEL_STYLES = {
  critica:     { bg: 'bg-red-50',   border: 'border-red-400',   badge: 'bg-red-100 text-red-700',     dot: 'bg-red-500',   label: 'Crítica'     },
  advertencia: { bg: 'bg-amber-50', border: 'border-amber-400', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', label: 'Advertencia' },
};

const SENSOR_META = {
  temperatura: { label: 'Temperatura', Icono: ThermometerSun, iconColor: 'text-orange-500' },
  humedad:     { label: 'Humedad',     Icono: Droplets,       iconColor: 'text-blue-500'   },
  ambiental:   { label: SENSOR_AMBIENTAL.labelCorto, Icono: SENSOR_AMBIENTAL.Icono, iconColor: SENSOR_AMBIENTAL.colorClass },
};

function formatRelativo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)   return `Hace ${diff}s`;
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)}min`;
  return `Hace ${Math.floor(diff / 3600)}h`;
}

const FILTROS = ['Todas', 'Críticas', 'Advertencias', 'Reconocidas'];

// ─── Componente principal ──────────────────────────────────────────────────────

export default function Alertas() {
  const { alertas, reconocer, reconocerTodas } = useAlertas();
  const [filtro, setFiltro] = useState('Todas');
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  const pendientes = alertas.filter(a => !a.reconocida).length;

  const alertasFiltradas = alertas.filter(a => {
    if (filtro === 'Críticas')     return a.nivel === 'critica'     && !a.reconocida;
    if (filtro === 'Advertencias') return a.nivel === 'advertencia' && !a.reconocida;
    if (filtro === 'Reconocidas')  return a.reconocida;
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
        <StatCard label="Total"        value={alertas.length}                                              color="slate" />
        <StatCard label="Críticas"     value={alertas.filter(a => a.nivel === 'critica'     && !a.reconocida).length} color="red"   />
        <StatCard label="Advertencias" value={alertas.filter(a => a.nivel === 'advertencia' && !a.reconocida).length} color="amber" />
        <StatCard label="Reconocidas"  value={alertas.filter(a => a.reconocida).length}                   color="green" />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {FILTROS.map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
              filtro === f ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {alertas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <CheckCircle size={48} className="mb-3 text-green-400" />
            <p className="font-semibold text-lg">Sin alertas registradas aún</p>
            <p className="text-sm">El simulador genera alertas automáticamente cuando los sensores cruzan umbrales</p>
          </div>
        ) : alertasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <CheckCircle size={48} className="mb-3 text-green-400" />
            <p className="font-semibold text-lg">Sin alertas activas</p>
            <p className="text-sm">Todos los sensores operando dentro del rango normal</p>
          </div>
        ) : (
          alertasFiltradas.map(alerta => (
            <AlertaCard key={alerta.id} alerta={alerta} onReconocer={() => reconocer(alerta.id)} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function AlertaCard({ alerta, onReconocer }) {
  const s    = NIVEL_STYLES[alerta.nivel] ?? NIVEL_STYLES.advertencia;
  const meta = SENSOR_META[alerta.sensor] ?? { label: alerta.sensor, Icono: AlertTriangle, iconColor: 'text-slate-500' };
  const { Icono, iconColor } = meta;

  return (
    <div className={`flex items-start gap-4 p-4 rounded-2xl border-l-4 ${s.bg} ${s.border} border-y border-r border-y-transparent border-r-transparent transition-opacity ${alerta.reconocida ? 'opacity-50' : ''}`}>
      <div className={`mt-0.5 h-10 w-10 rounded-xl flex items-center justify-center bg-white shadow-sm flex-shrink-0 ${iconColor}`}>
        <Icono size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
          <span className="text-xs font-semibold text-slate-500">{meta.label}</span>
          {alerta.loteId && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              <MapPin size={10} /> {alerta.loteId}
            </span>
          )}
          {alerta.sensorId && (
            <span className="text-xs font-mono text-slate-300">{alerta.sensorId}</span>
          )}
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
        <button onClick={onReconocer}
          className="flex-shrink-0 p-2 rounded-xl text-slate-400 hover:bg-white hover:text-green-600 transition-colors"
          title="Reconocer alerta">
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
