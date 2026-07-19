import { useState, useEffect } from 'react';
import { User, Bell, Sliders, Save, CheckCircle, MapPin, Globe } from 'lucide-react';
import { api } from '../lib/api';
import { SENSOR_AMBIENTAL } from '../config/sensorAmbiental';

const userStored = (() => {
  try { return JSON.parse(localStorage.getItem('conuco_user')) || {}; }
  catch { return {}; }
})();

const DEFAULTS = {
  temp_advertencia_alto: 28, temp_critico_alto:    32,
  temp_advertencia_bajo: 18, temp_critico_bajo:    14,
  hum_advertencia_alto:  75, hum_critico_alto:     85,
  hum_advertencia_bajo:  45, hum_critico_bajo:     30,
  amb_advertencia_alto:  70, amb_critico_alto:     80,
  amb_advertencia_bajo:  40, amb_critico_bajo:     30,
};

export default function Configuracion() {
  const [perfil, setPerfil]       = useState({ nombre: userStored.nombre || '', email: userStored.email || '' });
  const [lotes, setLotes]         = useState([]);
  const [loteSelec, setLoteSelec] = useState(null);          // null = global
  const [umbrales, setUmbrales]   = useState(null);
  const [notif, setNotif]         = useState({ alertasCriticas: true, alertasAdvertencia: true, resumenDiario: false });
  const [guardado, setGuardado]   = useState(false);
  const [error, setError]         = useState('');

  // Cargar lista de lotes para el selector
  useEffect(() => {
    api.get('/api/lotes').then(setLotes).catch(() => {});
  }, []);

  // Cargar umbrales cuando cambia el lote seleccionado
  useEffect(() => {
    setUmbrales(null);
    const query = loteSelec ? `?loteId=${loteSelec}` : '';
    api.get(`/api/configuracion/umbrales${query}`)
      .then(data => setUmbrales(data))
      .catch(() => setUmbrales({ ...DEFAULTS }));
  }, [loteSelec]);

  const setU = (key, val) => setUmbrales(p => ({ ...p, [key]: parseFloat(val) }));

  const guardar = async () => {
    setError('');
    try {
      await api.put('/api/configuracion/umbrales', {
        ...umbrales,
        loteId: loteSelec,
      });
      localStorage.setItem('conuco_user', JSON.stringify({ ...userStored, nombre: perfil.nombre }));
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch (err) {
      setError(err.message);
    }
  };

  const loteActual = lotes.find(l => l.id === loteSelec);

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Configuración</h1>
        <p className="text-slate-500 mt-1">Preferencias del sistema y umbrales de alerta</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">{error}</div>
      )}

      {/* Perfil */}
      <Section icono={<User size={18} />} titulo="Perfil de Usuario">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre completo"    value={perfil.nombre} onChange={v => setPerfil(p => ({ ...p, nombre: v }))} />
          <Field label="Correo electrónico" value={perfil.email}  onChange={v => setPerfil(p => ({ ...p, email: v }))} type="email" />
        </div>
        <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-500 font-medium">
          El cambio de contraseña se habilitará en la próxima versión.
        </div>
      </Section>

      {/* Umbrales — selector de scope */}
      <Section icono={<Sliders size={18} />} titulo="Umbrales de Sensores">

        {/* Selector de lote */}
        <div className="mb-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Configurando umbrales para</p>
          <div className="flex flex-wrap gap-2">
            {/* Opción global */}
            <button
              onClick={() => setLoteSelec(null)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
                loteSelec === null
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Globe size={14} /> Todos los lotes
            </button>

            {/* Un botón por cada lote */}
            {lotes.map(l => (
              <button
                key={l.id}
                onClick={() => setLoteSelec(l.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
                  loteSelec === l.id
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{l.imagen}</span> {l.id}
              </button>
            ))}
          </div>

          {/* Indicador del scope activo */}
          <div className="mt-3 flex items-center gap-2 text-xs">
            {loteSelec === null ? (
              <span className="inline-flex items-center gap-1.5 text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg font-medium">
                <Globe size={12} />
                Umbral global — aplica a todos los lotes sin configuración propia
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-green-700 bg-green-50 px-3 py-1.5 rounded-lg font-medium">
                <MapPin size={12} />
                {loteActual?.imagen} {loteActual?.cultivo} ({loteSelec}) — umbral específico de esta parcela
              </span>
            )}
          </div>
        </div>

        {!umbrales ? (
          <div className="text-center py-8 text-slate-400 text-sm">Cargando umbrales…</div>
        ) : (
          <>
            <p className="text-xs text-slate-500 mb-4">
              Define los rangos que disparan alertas automáticas en el Centro de Alertas.
              {loteSelec && ' Los valores aquí reemplazan los umbrales globales solo para esta parcela.'}
            </p>

            <UmbralGroup titulo="🌡 Temperatura (°C)">
              <UmbralRow label="Advertencia alta"  color="amber" valor={umbrales.temp_advertencia_alto} onChange={v => setU('temp_advertencia_alto', v)} min={15} max={40} step={0.5} />
              <UmbralRow label="Crítico alto"       color="red"   valor={umbrales.temp_critico_alto}    onChange={v => setU('temp_critico_alto', v)}     min={15} max={45} step={0.5} />
              <UmbralRow label="Advertencia baja"  color="amber" valor={umbrales.temp_advertencia_bajo} onChange={v => setU('temp_advertencia_bajo', v)} min={0}  max={25} step={0.5} />
              <UmbralRow label="Crítico bajo"       color="red"   valor={umbrales.temp_critico_bajo}    onChange={v => setU('temp_critico_bajo', v)}     min={0}  max={20} step={0.5} />
            </UmbralGroup>

            <UmbralGroup titulo="💧 Humedad del Suelo (%)">
              <UmbralRow label="Advertencia alta"  color="amber" valor={umbrales.hum_advertencia_alto}  onChange={v => setU('hum_advertencia_alto', v)}  min={50} max={100} step={1} />
              <UmbralRow label="Crítico alto"       color="red"   valor={umbrales.hum_critico_alto}      onChange={v => setU('hum_critico_alto', v)}      min={60} max={100} step={1} />
              <UmbralRow label="Advertencia baja"  color="amber" valor={umbrales.hum_advertencia_bajo}  onChange={v => setU('hum_advertencia_bajo', v)}  min={10} max={60}  step={1} />
              <UmbralRow label="Crítico bajo"       color="red"   valor={umbrales.hum_critico_bajo}      onChange={v => setU('hum_critico_bajo', v)}      min={0}  max={50}  step={1} />
            </UmbralGroup>

            <UmbralGroup titulo={`💨 ${SENSOR_AMBIENTAL.label} (${SENSOR_AMBIENTAL.unidad.trim()})`}>
              <UmbralRow label="Advertencia alta"  color="amber" valor={umbrales.amb_advertencia_alto}  onChange={v => setU('amb_advertencia_alto', v)}  min={SENSOR_AMBIENTAL.sliders.advAlto.min}  max={SENSOR_AMBIENTAL.sliders.advAlto.max}  step={SENSOR_AMBIENTAL.sliders.step} />
              <UmbralRow label="Crítico alto"       color="red"   valor={umbrales.amb_critico_alto}      onChange={v => setU('amb_critico_alto', v)}      min={SENSOR_AMBIENTAL.sliders.critAlto.min} max={SENSOR_AMBIENTAL.sliders.critAlto.max} step={SENSOR_AMBIENTAL.sliders.step} />
              <UmbralRow label="Advertencia baja"  color="amber" valor={umbrales.amb_advertencia_bajo}  onChange={v => setU('amb_advertencia_bajo', v)}  min={SENSOR_AMBIENTAL.sliders.advBajo.min}  max={SENSOR_AMBIENTAL.sliders.advBajo.max}  step={SENSOR_AMBIENTAL.sliders.step} />
              <UmbralRow label="Crítico bajo"       color="red"   valor={umbrales.amb_critico_bajo}      onChange={v => setU('amb_critico_bajo', v)}      min={SENSOR_AMBIENTAL.sliders.critBajo.min} max={SENSOR_AMBIENTAL.sliders.critBajo.max} step={SENSOR_AMBIENTAL.sliders.step} />
            </UmbralGroup>
          </>
        )}
      </Section>

      {/* Notificaciones */}
      <Section icono={<Bell size={18} />} titulo="Notificaciones">
        <div className="space-y-3">
          <Toggle label="Alertas críticas"       sub="Notificar cuando un sensor supere un umbral crítico"  checked={notif.alertasCriticas}    onChange={v => setNotif(p => ({ ...p, alertasCriticas: v }))} />
          <Toggle label="Alertas de advertencia" sub="Notificar en rangos de precaución"                    checked={notif.alertasAdvertencia} onChange={v => setNotif(p => ({ ...p, alertasAdvertencia: v }))} />
          <Toggle label="Resumen diario"          sub="Recibir un reporte diario del estado del conuco"      checked={notif.resumenDiario}      onChange={v => setNotif(p => ({ ...p, resumenDiario: v }))} />
        </div>
      </Section>

      {/* Guardar */}
      <div className="flex items-center gap-3 pb-4">
        <button onClick={guardar} disabled={!umbrales}
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50">
          <Save size={16} />
          {loteSelec ? `Guardar para ${loteSelec}` : 'Guardar umbrales globales'}
        </button>
        {guardado && (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600">
            <CheckCircle size={16} /> Guardado correctamente
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function Section({ icono, titulo, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
        <span className="text-green-600">{icono}</span>
        <h2 className="font-bold text-slate-800">{titulo}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function UmbralGroup({ titulo, children }) {
  return (
    <div className="mb-5 last:mb-0">
      <p className="text-sm font-bold text-slate-700 mb-3">{titulo}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function UmbralRow({ label, color, valor, onChange, min, max, step }) {
  const badge = color === 'red' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
  return (
    <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${badge}`}>{label}</span>
      <div className="flex items-center gap-2">
        <input type="range" min={min} max={max} step={step} value={valor}
          onChange={e => onChange(e.target.value)} className="w-20 accent-green-600" />
        <span className="text-sm font-bold text-slate-700 w-10 text-right">{valor}</span>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" />
    </div>
  );
}

function Toggle({ label, sub, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
      </div>
      <div onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${checked ? 'bg-green-500' : 'bg-slate-200'}`}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
    </label>
  );
}
