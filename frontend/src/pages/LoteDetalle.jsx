import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Sprout, Thermometer, Droplets,
  CheckCircle, AlertTriangle, XCircle, Clock, Wifi, WifiOff,
  TrendingUp, TrendingDown, Minus, Trash2, Download, Sparkles, Info
} from 'lucide-react';
import { SENSOR_AMBIENTAL, ambFueraDeIdeal, formatoAmbiental } from '../config/sensorAmbiental';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import { api } from '../lib/api';

// ── Solo Lote-001 tiene sensores IoT en vivo ──────────────────────────────────
const LOTE_CON_SENSORES = 'Lote-001';

function useIoTEnVivo(loteId) {
  const [data, setData]         = useState([]);
  const [conectado, setConectado] = useState(false);
  const activo = loteId === LOTE_CON_SENSORES;

  useEffect(() => {
    if (!activo) return;
    api.get('/api/sensores/historial')
      .then(h => { setData(h); setConectado(true); })
      .catch(() => setConectado(false));
  }, [activo]);

  useEffect(() => {
    if (!activo) return;
    const id = setInterval(() => {
      api.get('/api/sensores/lecturas')
        .then(l => {
          setConectado(true);
          setData(prev => [...prev.slice(-14), {
            time:        new Date(l.timestamp).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            temperatura: l.temperatura,
            humedad:     l.humedad,
            ambiental:   l.ambiental,
          }]);
        })
        .catch(() => setConectado(false));
    }, 5000);
    return () => clearInterval(id);
  }, [activo]);

  return { data, conectado, activo };
}

// ── Configuración visual ──────────────────────────────────────────────────────

const SALUD_CONFIG = {
  optima:      { label: 'Óptima',      bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500',  border: 'border-green-500', Icono: CheckCircle   },
  advertencia: { label: 'Advertencia', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500',  border: 'border-amber-500', Icono: AlertTriangle },
  critica:     { label: 'Crítica',     bg: 'bg-red-50',   text: 'text-red-700',   dot: 'bg-red-500',    border: 'border-red-500',   Icono: XCircle       },
};

const NIVEL_STYLES = {
  critica:     { bg: 'bg-red-50',   border: 'border-red-400',   badge: 'bg-red-100 text-red-700',     label: 'Crítica'     },
  advertencia: { bg: 'bg-amber-50', border: 'border-amber-400', badge: 'bg-amber-100 text-amber-700', label: 'Advertencia' },
};

const SENSOR_META = {
  temperatura: { label: 'Temperatura', Icono: Thermometer, color: 'text-orange-500' },
  humedad:     { label: 'Humedad',     Icono: Droplets,    color: 'text-blue-500'   },
  ambiental:   { label: SENSOR_AMBIENTAL.labelCorto, Icono: SENSOR_AMBIENTAL.Icono, color: SENSOR_AMBIENTAL.colorClass },
};

const ESTADO_CONFIG = {
  completado: { label: 'Completado', bg: 'bg-green-100', text: 'text-green-700', Icono: CheckCircle },
  en_curso:   { label: 'En curso',   bg: 'bg-blue-100',  text: 'text-blue-700',  Icono: Clock       },
  abandonado: { label: 'Abandonado', bg: 'bg-red-100',   text: 'text-red-700',   Icono: XCircle     },
};

function diasDesde(f) {
  return Math.floor((Date.now() - new Date(f).getTime()) / 86_400_000);
}

function formatRelativo(ts) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60)   return `Hace ${d}s`;
  if (d < 3600) return `Hace ${Math.floor(d / 60)}min`;
  return `Hace ${Math.floor(d / 3600)}h`;
}

function tendencia(data, key) {
  if (data.length < 3) return 'estable';
  const diff = data[data.length - 1][key] - data[data.length - 3][key];
  if (Math.abs(diff) < 0.3) return 'estable';
  return diff > 0 ? 'sube' : 'baja';
}

const TEND = {
  sube:    { Icono: TrendingUp,   color: 'text-red-500'   },
  baja:    { Icono: TrendingDown, color: 'text-blue-500'  },
  estable: { Icono: Minus,        color: 'text-slate-400' },
};

// ── Motor de Recomendación Heurística (Asistente Agrónomo) ────────────────────
function obtenerRecomendacion(lecturas) {
  if (!lecturas) return null;
  const { temperatura, humedad, ambiental } = lecturas;
  
  if (humedad < 45) {
    return {
      titulo: 'Riego Urgente Requerido',
      dosis: 'Dosis de Riego Alta: 6.0 L/m²',
      analisis: `La humedad del suelo es críticamente baja (${humedad.toFixed(1)}%), estando por debajo del umbral óptimo.`,
      accion: 'Activar sistema de riego de inmediato para evitar estrés hídrico.',
      severidad: 'urgente',
      color: 'from-rose-50 to-red-50/30 border-red-200 text-red-700',
      badgeBg: 'bg-red-100 text-red-800',
      iconColor: 'text-red-500',
    };
  }
  
  if (humedad >= 45 && humedad <= 60 && temperatura > 28) {
    return {
      titulo: 'Riego Preventivo Aconsejado',
      dosis: 'Riego Moderado: 3.5 L/m²',
      analisis: `Humedad de suelo en rango medio (${humedad.toFixed(1)}%) pero con temperatura alta (${temperatura.toFixed(1)}°C), lo que acelera la tasa de evapotranspiración.`,
      accion: 'Aplicar riego moderado para mantener la reserva hídrica óptima.',
      severidad: 'advertencia',
      color: 'from-amber-50 to-yellow-50/30 border-amber-200 text-amber-700',
      badgeBg: 'bg-amber-100 text-amber-800',
      iconColor: 'text-amber-500',
    };
  }
  
  // Reglas del sensor ambiental — DHT22 (humedad del aire)
  if (SENSOR_AMBIENTAL.tipo === 'dht22') {
    if (ambiental > SENSOR_AMBIENTAL.rangoIdeal.max) {
      return {
        titulo: 'Riesgo de Enfermedades Fúngicas',
        dosis: 'Monitoreo Fitosanitario Preventivo',
        analisis: `La humedad ambiental es alta (${formatoAmbiental(ambiental)}), condición que favorece hongos como la roya y el tizón foliar en el maíz.`,
        accion: 'Inspeccionar el follaje, mejorar la ventilación entre hileras y evaluar una aplicación preventiva de fungicida.',
        severidad: 'humedad_alta',
        color: 'from-cyan-50 to-sky-50/30 border-cyan-200 text-cyan-700',
        badgeBg: 'bg-cyan-100 text-cyan-800',
        iconColor: 'text-cyan-500',
      };
    }

    if (ambiental < SENSOR_AMBIENTAL.rangoIdeal.min) {
      return {
        titulo: 'Aire Seco — Alta Evapotranspiración',
        dosis: 'Reforzar Reserva Hídrica',
        analisis: `La humedad ambiental es baja (${formatoAmbiental(ambiental)}), lo que acelera la pérdida de agua por evapotranspiración de la planta y del suelo.`,
        accion: 'Aumentar la frecuencia de riego ligero y considerar acolchado (mulch) para conservar la humedad del suelo.',
        severidad: 'aire_seco',
        color: 'from-indigo-50 to-blue-50/30 border-indigo-200 text-indigo-700',
        badgeBg: 'bg-indigo-100 text-indigo-800',
        iconColor: 'text-indigo-500',
      };
    }
  }

  // Reglas del sensor ambiental — BH1750 (luz solar)
  if (SENSOR_AMBIENTAL.tipo === 'bh1750') {
    if (ambiental < SENSOR_AMBIENTAL.rangoIdeal.min) {
      return {
        titulo: 'Radiación Solar Insuficiente',
        dosis: 'Revisión de Sombreado',
        analisis: `La luz solar registrada es baja (${formatoAmbiental(ambiental)}), lo que reduce la tasa fotosintética del maíz.`,
        accion: 'Verificar sombras de árboles o estructuras cercanas y controlar malezas altas que compitan por luz.',
        severidad: 'luz_baja',
        color: 'from-slate-50 to-blue-50/30 border-slate-200 text-slate-700',
        badgeBg: 'bg-slate-100 text-slate-800',
        iconColor: 'text-slate-500',
      };
    }

    if (ambiental > SENSOR_AMBIENTAL.rangoIdeal.max) {
      return {
        titulo: 'Radiación Solar Intensa',
        dosis: 'Vigilar Estrés por Calor',
        analisis: `La radiación solar es muy intensa (${formatoAmbiental(ambiental)}), lo que puede provocar estrés térmico e hídrico en horas pico.`,
        accion: 'Reforzar el riego en la mañana y vigilar signos de enrollamiento de hojas al mediodía.',
        severidad: 'luz_alta',
        color: 'from-amber-50 to-yellow-50/30 border-amber-200 text-amber-700',
        badgeBg: 'bg-amber-100 text-amber-800',
        iconColor: 'text-amber-500',
      };
    }
  }

  return {
    titulo: 'Condiciones de Cultivo Óptimas',
    dosis: 'Sin riego necesario',
    analisis: `Humedad de suelo estable (${humedad.toFixed(1)}%) y ${SENSOR_AMBIENTAL.label.toLowerCase()} en rango (${formatoAmbiental(ambiental)}) bajo temperatura templada (${temperatura.toFixed(1)}°C).`,
    accion: 'Mantener monitoreo pasivo. Los niveles actuales garantizan un crecimiento saludable.',
    severidad: 'optima',
    color: 'from-emerald-50 to-teal-50/30 border-emerald-200 text-emerald-700',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    iconColor: 'text-emerald-500',
  };
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function LoteDetalle() {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [lote, setLote]           = useState(null);
  const [cultivos, setCultivos]   = useState([]);
  const [alertas, setAlertas]     = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState('');

  const { data: iotData, conectado, activo: tieneIoT } = useIoTEnVivo(id);
  const ultima = iotData.at(-1) ?? null;

  useEffect(() => {
    Promise.all([
      api.get(`/api/lotes/${id}`),
      api.get(`/api/cultivos?loteId=${id}`),
      api.get(`/api/alertas?loteId=${id}`),
    ])
      .then(([l, c, a]) => { setLote(l); setCultivos(c); setAlertas(a); })
      .catch(() => setError('No se pudo cargar la información del lote'))
      .finally(() => setCargando(false));
  }, [id]);

  // Polling de alertas cada 10s
  useEffect(() => {
    const t = setInterval(() =>
      api.get(`/api/alertas?loteId=${id}`).then(setAlertas).catch(() => {}),
    10_000);
    return () => clearInterval(t);
  }, [id]);

  const reconocerAlerta = async (alertaId) => {
    await api.put(`/api/alertas/${alertaId}/reconocer`);
    setAlertas(prev => prev.map(a => a.id === alertaId ? { ...a, reconocida: true } : a));
  };

  const eliminarLote = async () => {
    if (!confirm(`¿Eliminar ${lote.cultivo} (${lote.id})?`)) return;
    await api.delete(`/api/lotes/${id}`);
    navigate('/dashboard/lotes');
  };

  const handleExport = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    window.open(`${API_URL}/api/lotes/${id}/exportar`, '_blank');
  };

  if (cargando) return (
    <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
      Cargando lote…
    </div>
  );

  if (error || !lote) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
      <p className="text-sm">{error || 'Lote no encontrado'}</p>
      <button onClick={() => navigate('/dashboard/lotes')} className="text-green-600 text-sm font-semibold hover:underline">
        ← Volver a Mis Lotes
      </button>
    </div>
  );

  const sc = SALUD_CONFIG[lote.salud] ?? SALUD_CONFIG.optima;
  const alertasPendientes = alertas.filter(a => !a.reconocida).length;

  // Lecturas a mostrar: IoT en vivo (Lote-001) o estáticas del lote
  const lecturas = ultima
    ? { temperatura: ultima.temperatura, humedad: ultima.humedad, ambiental: ultima.ambiental }
    : lote.sensores;

  return (
    <div className="w-full space-y-6">

      {/* ── Navegación ── */}
      <button onClick={() => navigate('/dashboard/lotes')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={16} /> Mis Lotes
      </button>

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{lote.imagen}</span>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-extrabold text-slate-900">{lote.cultivo}</h1>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                  <span className={`h-2 w-2 rounded-full ${sc.dot}`} />
                  {sc.label}
                </span>
              </div>
              <p className="text-slate-500 text-sm mt-1 font-medium">{lote.id} · {lote.etapa}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1"><MapPin size={12} /> {lote.ubicacion}</span>
                <span className="flex items-center gap-1"><Sprout size={12} /> {diasDesde(lote.fechaSiembra)} días sembrado</span>
                <span>{lote.area} ha</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {tieneIoT && (
              <>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-50 text-green-700">
                  {conectado ? <Wifi size={13} /> : <WifiOff size={13} />}
                  {conectado ? 'IoT en vivo' : 'Sin señal'}
                </span>
                <button onClick={handleExport}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
                  title="Exportar reporte de telemetría a Excel">
                  <Download size={13} />
                  <span>Exportar Excel</span>
                </button>
              </>
            )}
            <button onClick={eliminarLote}
              className="p-2 rounded-xl text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Eliminar lote">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Sensores ── */}
      <div>
        <SectionTitle
          title="Sensores"
          badge={tieneIoT && conectado ? 'En vivo' : 'Última lectura registrada'}
          badgeColor={tieneIoT && conectado ? 'green' : 'slate'}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <SensorCard
            title="Temperatura"   value={`${lecturas.temperatura.toFixed(1)}°C`}
            icono={<Thermometer size={22} />}
            tend={tieneIoT ? tendencia(iotData, 'temperatura') : 'estable'}
            colorClass="text-orange-500" bgClass="bg-orange-50" borderClass="border-orange-500"
            rango="Ideal: 20–28°C"
            alerta={lecturas.temperatura > 28}
          />
          <SensorCard
            title="Humedad del Suelo" value={`${lecturas.humedad.toFixed(1)}%`}
            icono={<Droplets size={22} />}
            tend={tieneIoT ? tendencia(iotData, 'humedad') : 'estable'}
            colorClass="text-blue-500" bgClass="bg-blue-50" borderClass="border-blue-500"
            rango="Ideal: 55–75%"
            alerta={lecturas.humedad < 50}
          />
          <SensorCard
            title={SENSOR_AMBIENTAL.label}   value={formatoAmbiental(lecturas.ambiental)}
            icono={<SENSOR_AMBIENTAL.Icono size={22} />}
            tend={tieneIoT ? tendencia(iotData, 'ambiental') : 'estable'}
            colorClass={SENSOR_AMBIENTAL.colorClass} bgClass={SENSOR_AMBIENTAL.bgClass} borderClass={SENSOR_AMBIENTAL.borderClass}
            rango={SENSOR_AMBIENTAL.rangoTexto}
            alerta={ambFueraDeIdeal(lecturas.ambiental)}
          />
        </div>

        {/* Gráfica — solo para lotes con IoT activo */}
        {tieneIoT && iotData.length > 1 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mt-4" style={{ height: 300 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">Tendencia en tiempo real</h3>
              <span className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded-lg font-semibold">
                {ultima?.time}
              </span>
            </div>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={iotData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickMargin={6} axisLine={false} interval="preserveStartEnd" />
                <YAxis yAxisId="left"  stroke="#f97316" fontSize={10} axisLine={false} tickLine={false} domain={['auto','auto']} />
                <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={10} axisLine={false} tickLine={false} domain={['auto','auto']} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0/0.1)', fontSize: 11 }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '8px', fontSize: 11 }} />
                <Line yAxisId="left"  type="monotone" dataKey="temperatura" stroke="#f97316" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Temp (°C)" />
                <Line yAxisId="right" type="monotone" dataKey="humedad"     stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Humedad (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Asistente Agrónomo (Motor Heurístico) ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <SectionTitle
          title="Asistente Agrónomo Virtual"
          badge="Motor Heurístico Inteligente"
          badgeColor="green"
        />
        {(() => {
          const rec = obtenerRecomendacion(lecturas);
          if (!rec) return null;
          return (
            <div className={`mt-4 bg-gradient-to-br ${rec.color} rounded-2xl border p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group`}>
              {/* Elemento decorativo de fondo */}
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-6 translate-y-6 scale-150 pointer-events-none group-hover:scale-125 transition-transform duration-700">
                <Sprout size={160} />
              </div>
              
              <div className="flex flex-col md:flex-row gap-5 items-start md:items-center justify-between relative z-10">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 h-12 w-12 rounded-2xl flex items-center justify-center bg-white shadow-md flex-shrink-0`}>
                    <Sparkles size={22} className={rec.iconColor} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${rec.badgeBg} uppercase tracking-wider`}>
                        {rec.titulo}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Info size={12} /> Análisis de telemetría en tiempo real
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-800 mt-2">
                      {rec.dosis}
                    </h3>
                    <p className="mt-1.5 text-sm text-slate-600 font-medium leading-relaxed max-w-2xl">
                      {rec.analisis}
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-xs font-bold text-slate-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      <span>Recomendación:</span>
                      <span className="text-slate-700">{rec.accion}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0 self-end md:self-center">
                  <div className="bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-slate-100/50 shadow-sm text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Dato Clave
                    </p>
                    <p className="text-sm font-extrabold text-slate-700 mt-0.5">
                      Hum: {lecturas.humedad.toFixed(1)}% | {SENSOR_AMBIENTAL.labelCorto}: {formatoAmbiental(lecturas.ambiental)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Historial de cultivos ── */}
      <div>
        <SectionTitle title="Historial de cultivos" badge={`${cultivos.length} ciclos`} />

        {cultivos.length === 0 ? (
          <EmptyState msg="No hay ciclos registrados para este lote" />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Cultivo</th>
                    <th className="px-4 py-3 text-left">Etapa</th>
                    <th className="px-4 py-3 text-left">Siembra</th>
                    <th className="px-4 py-3 text-left">Cosecha</th>
                    <th className="px-4 py-3 text-left">Rendimiento</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {cultivos.map(c => {
                    const ec = ESTADO_CONFIG[c.estado] ?? ESTADO_CONFIG.en_curso;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-800">{c.cultivo}</td>
                        <td className="px-4 py-3 text-slate-500">{c.etapa}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{c.fechaSiembra}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{c.fechaCosecha ?? '—'}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700">
                          {c.rendimiento != null ? `${c.rendimiento} ${c.unidad}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${ec.bg} ${ec.text}`}>
                            <ec.Icono size={11} /> {ec.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Alertas ── */}
      <div>
        <SectionTitle
          title="Alertas de esta parcela"
          badge={alertasPendientes > 0 ? `${alertasPendientes} activas` : 'Sin alertas activas'}
          badgeColor={alertasPendientes > 0 ? 'red' : 'green'}
        />

        {alertas.length === 0 ? (
          <EmptyState msg="Sin alertas registradas para este lote" icono={<CheckCircle size={36} className="text-green-300" />} />
        ) : (
          <div className="space-y-3 mt-3">
            {alertas.slice(0, 10).map(alerta => {
              const s    = NIVEL_STYLES[alerta.nivel] ?? NIVEL_STYLES.advertencia;
              const meta = SENSOR_META[alerta.sensor] ?? { label: alerta.sensor, Icono: AlertTriangle, color: 'text-slate-500' };
              return (
                <div key={alerta.id}
                  className={`flex items-start gap-4 p-4 rounded-2xl border-l-4 ${s.bg} ${s.border} border-y border-r border-y-transparent border-r-transparent ${alerta.reconocida ? 'opacity-50' : ''}`}>
                  <div className={`mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center bg-white shadow-sm flex-shrink-0 ${meta.color}`}>
                    <meta.Icono size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
                      <span className="text-xs font-semibold text-slate-500">{meta.label}</span>
                      {alerta.sensorId && (
                        <span className="text-xs font-mono text-slate-300">{alerta.sensorId}</span>
                      )}
                      {alerta.reconocida && (
                        <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                          <CheckCircle size={11} /> Reconocida
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{alerta.msg}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatRelativo(alerta.timestamp)}</p>
                  </div>
                  {!alerta.reconocida && (
                    <button onClick={() => reconocerAlerta(alerta.id)}
                      className="flex-shrink-0 p-2 rounded-xl text-slate-300 hover:bg-white hover:text-green-600 transition-colors"
                      title="Reconocer">
                      <CheckCircle size={18} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function SectionTitle({ title, badge, badgeColor = 'slate' }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-500',
    green: 'bg-green-100 text-green-700',
    red:   'bg-red-100   text-red-700',
  };
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-extrabold text-slate-800">{title}</h2>
      {badge && (
        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${colors[badgeColor]}`}>{badge}</span>
      )}
    </div>
  );
}

function SensorCard({ title, value, icono, tend, colorClass, bgClass, borderClass, rango, alerta }) {
  const { Icono: TendIcono, color: tendColor } = TEND[tend];
  return (
    <div className={`bg-white p-5 rounded-2xl shadow-sm border-l-4 ${borderClass} border-y border-r ${alerta ? 'border-y-red-100 border-r-red-100' : 'border-y-slate-100 border-r-slate-100'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{rango}</p>
        </div>
        <div className={`h-10 w-10 rounded-xl ${bgClass} ${colorClass} flex items-center justify-center`}>
          {icono}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <h4 className={`text-3xl font-extrabold ${alerta ? 'text-red-600' : 'text-slate-800'}`}>{value}</h4>
        <span className={`flex items-center gap-1 text-xs font-semibold ${tendColor}`}>
          <TendIcono size={13} />
          {tend === 'estable' ? 'Estable' : tend === 'sube' ? 'Subiendo' : 'Bajando'}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ msg, icono }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400 mt-3">
      {icono ?? <Sprout size={36} className="text-slate-200 mb-2" />}
      <p className="text-sm mt-2">{msg}</p>
    </div>
  );
}
