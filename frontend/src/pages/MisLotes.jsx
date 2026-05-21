import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Thermometer, Droplets, FlaskConical, Plus, X, CheckCircle, AlertTriangle, XCircle, ChevronRight, Sprout } from 'lucide-react';
import { api } from '../lib/api';

const SALUD_CONFIG = {
  optima:      { label: 'Óptima',      bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-400', Icono: CheckCircle,   dot: 'bg-green-500'  },
  advertencia: { label: 'Advertencia', bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-400', Icono: AlertTriangle, dot: 'bg-amber-500'  },
  critica:     { label: 'Crítica',     bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-400',   Icono: XCircle,       dot: 'bg-red-500'    },
};

function diasDesde(fechaStr) {
  return Math.floor((Date.now() - new Date(fechaStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function MisLotes() {
  const navigate = useNavigate();
  const [lotes, setLotes]               = useState([]);
  const [cargando, setCargando]         = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando]       = useState(false);
  const [filtro, setFiltro]             = useState('Todos');
  const [error, setError]               = useState('');
  const [form, setForm] = useState({ cultivo: '', ubicacion: '', area: '', etapa: 'Preparación', imagen: '🌱' });

  useEffect(() => {
    api.get('/api/lotes')
      .then(setLotes)
      .catch(() => setError('No se pudo conectar al servidor'))
      .finally(() => setCargando(false));
  }, []);

  const filtrados = lotes.filter(l => {
    if (filtro === 'Óptimos')     return l.salud === 'optima';
    if (filtro === 'Advertencia') return l.salud === 'advertencia';
    if (filtro === 'Críticos')    return l.salud === 'critica';
    return true;
  });

  const agregarLote = async () => {
    if (!form.cultivo || !form.ubicacion || !form.area) return;
    setGuardando(true);
    try {
      const creado = await api.post('/api/lotes', {
        cultivo:      form.cultivo,
        ubicacion:    form.ubicacion,
        area:         parseFloat(form.area),
        etapa:        form.etapa,
        imagen:       form.imagen,
        fechaSiembra: new Date().toISOString().split('T')[0],
      });
      setLotes(prev => [...prev, creado]);
      setForm({ cultivo: '', ubicacion: '', area: '', etapa: 'Preparación', imagen: '🌱' });
      setMostrarModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return (
    <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Cargando lotes…</div>
  );

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Mis Lotes</h1>
          <p className="text-slate-500 mt-1">
            {lotes.length} parcelas registradas · Área total: {lotes.reduce((s, l) => s + (l.area || 0), 0).toFixed(1)} ha
          </p>
        </div>
        <button onClick={() => setMostrarModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
          <Plus size={16} /> Nuevo Lote
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {['Todos', 'Óptimos', 'Advertencia', 'Críticos'].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${filtro === f ? 'bg-green-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
        {filtrados.map(lote => {
          const sc = SALUD_CONFIG[lote.salud] ?? SALUD_CONFIG.optima;
          return (
            <div key={lote.id} className={`bg-white rounded-2xl border-l-4 ${sc.border} border-y border-r border-slate-100 shadow-sm hover:-translate-y-1 transition-transform duration-200`}>
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{lote.imagen}</span>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">{lote.cultivo}</h3>
                      <span className="text-xs text-slate-500 font-medium">{lote.id} · {lote.etapa}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                    <sc.Icono size={12} /> {sc.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
                  <MapPin size={13} />
                  <span>{lote.ubicacion}</span>
                  <span className="mx-1">·</span>
                  <Sprout size={13} />
                  <span>{diasDesde(lote.fechaSiembra)} días</span>
                  <span className="mx-1">·</span>
                  <span>{lote.area} ha</span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <SensorPill icono={<Thermometer size={14} />} valor={`${lote.sensores.temperatura.toFixed(1)}°C`} color="orange" />
                  <SensorPill icono={<Droplets size={14} />}     valor={`${lote.sensores.humedad.toFixed(1)}%`}    color="blue"   />
                  <SensorPill icono={<FlaskConical size={14} />} valor={`pH ${lote.sensores.ph.toFixed(1)}`}       color="purple" />
                </div>

                <button onClick={() => navigate(`/dashboard/lotes/${lote.id}`)}
                  className="w-full flex items-center justify-center gap-1 py-2 text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-xl transition-colors">
                  Ver detalle <ChevronRight size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal nuevo lote */}
      {mostrarModal && (
        <Modal onClose={() => setMostrarModal(false)} title="Registrar Nuevo Lote">
          <div className="space-y-3 text-sm">
            <Field label="Tipo de cultivo" value={form.cultivo}   onChange={v => setForm(p => ({ ...p, cultivo: v }))}   placeholder="Ej: Maíz Amarillo" />
            <Field label="Ubicación"       value={form.ubicacion} onChange={v => setForm(p => ({ ...p, ubicacion: v }))} placeholder="Ej: Sector Norte, Parcela E" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Área (ha)" value={form.area} onChange={v => setForm(p => ({ ...p, area: v }))} placeholder="Ej: 1.5" type="number" />
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Etapa inicial</label>
                <select value={form.etapa} onChange={e => setForm(p => ({ ...p, etapa: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  {['Preparación','Siembra','Germinación','Desarrollo Vegetativo','Floración','Engorde','Cosecha'].map(e => (
                    <option key={e}>{e}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ícono</label>
              <div className="flex gap-2 flex-wrap">
                {['🌽','🫘','🍌','🌿','🥦','🍅','🌾','🫑','🌱'].map(e => (
                  <button key={e} onClick={() => setForm(p => ({ ...p, imagen: e }))}
                    className={`text-xl p-2 rounded-lg border-2 transition-colors ${form.imagen === e ? 'border-green-500 bg-green-50' : 'border-transparent hover:border-slate-200'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={agregarLote} disabled={guardando}
              className="w-full py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors mt-2 disabled:opacity-60">
              {guardando ? 'Registrando…' : 'Registrar Lote'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────

const COLOR_MAP = {
  orange: 'bg-orange-50 text-orange-600',
  blue:   'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
};

function SensorPill({ icono, valor, color }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold ${COLOR_MAP[color]}`}>
      {icono} {valor}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
    </div>
  );
}
