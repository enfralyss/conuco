import { useState } from 'react';
import { User, Bell, Sliders, Save, CheckCircle } from 'lucide-react';

const userRaw = typeof window !== 'undefined' ? localStorage.getItem('conuco_user') : null;
const userStored = userRaw ? JSON.parse(userRaw) : { nombre: 'Randy (Productor)', email: 'admin@lab.com' };

const UMBRALES_DEFAULT = {
  temp_advertencia_alto:  28, temp_critico_alto:    32,
  temp_advertencia_bajo:  18, temp_critico_bajo:    14,
  hum_advertencia_alto:   75, hum_critico_alto:     85,
  hum_advertencia_bajo:   45, hum_critico_bajo:     30,
  ph_advertencia_alto:   7.0, ph_critico_alto:     7.5,
  ph_advertencia_bajo:   5.5, ph_critico_bajo:     5.0,
};

export default function Configuracion() {
  const [perfil, setPerfil] = useState({ nombre: userStored.nombre, email: userStored.email });
  const [umbrales, setUmbrales] = useState(UMBRALES_DEFAULT);
  const [notif, setNotif] = useState({ alertasCriticas: true, alertasAdvertencia: true, resumenDiario: false });
  const [guardado, setGuardado] = useState(false);

  const guardar = () => {
    localStorage.setItem('conuco_user', JSON.stringify({ ...userStored, nombre: perfil.nombre }));
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2500);
  };

  const setU = (key, val) => setUmbrales(p => ({ ...p, [key]: parseFloat(val) }));

  return (
    <div className="w-full max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Configuración</h1>
        <p className="text-slate-500 mt-1">Preferencias del sistema y umbrales de alerta</p>
      </div>

      {/* Perfil */}
      <Section icono={<User size={18} />} titulo="Perfil de Usuario">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre completo" value={perfil.nombre} onChange={v => setPerfil(p => ({ ...p, nombre: v }))} />
          <Field label="Correo electrónico" value={perfil.email} onChange={v => setPerfil(p => ({ ...p, email: v }))} type="email" />
        </div>
        <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-500 font-medium">
          El cambio de contraseña estará disponible cuando se conecte la base de datos.
        </div>
      </Section>

      {/* Umbrales */}
      <Section icono={<Sliders size={18} />} titulo="Umbrales de Sensores">
        <p className="text-xs text-slate-500 mb-4">Define los rangos que disparan alertas automáticas en el Centro de Alertas.</p>

        <UmbralGroup titulo="🌡 Temperatura (°C)">
          <UmbralRow label="Advertencia alta"  color="amber"  valor={umbrales.temp_advertencia_alto} onChange={v => setU('temp_advertencia_alto', v)}  min={15} max={40} step={0.5} />
          <UmbralRow label="Crítico alto"       color="red"    valor={umbrales.temp_critico_alto}    onChange={v => setU('temp_critico_alto', v)}         min={15} max={45} step={0.5} />
          <UmbralRow label="Advertencia baja"  color="amber"  valor={umbrales.temp_advertencia_bajo} onChange={v => setU('temp_advertencia_bajo', v)} min={0}  max={25} step={0.5} />
          <UmbralRow label="Crítico bajo"       color="red"    valor={umbrales.temp_critico_bajo}    onChange={v => setU('temp_critico_bajo', v)}         min={0}  max={20} step={0.5} />
        </UmbralGroup>

        <UmbralGroup titulo="💧 Humedad del Suelo (%)">
          <UmbralRow label="Advertencia alta"  color="amber"  valor={umbrales.hum_advertencia_alto}  onChange={v => setU('hum_advertencia_alto', v)}  min={50} max={100} step={1} />
          <UmbralRow label="Crítico alto"       color="red"    valor={umbrales.hum_critico_alto}      onChange={v => setU('hum_critico_alto', v)}      min={60} max={100} step={1} />
          <UmbralRow label="Advertencia baja"  color="amber"  valor={umbrales.hum_advertencia_bajo}  onChange={v => setU('hum_advertencia_bajo', v)}  min={10} max={60}  step={1} />
          <UmbralRow label="Crítico bajo"       color="red"    valor={umbrales.hum_critico_bajo}      onChange={v => setU('hum_critico_bajo', v)}      min={0}  max={50}  step={1} />
        </UmbralGroup>

        <UmbralGroup titulo="🧪 Nivel de pH">
          <UmbralRow label="Advertencia alta"  color="amber"  valor={umbrales.ph_advertencia_alto}   onChange={v => setU('ph_advertencia_alto', v)}   min={6}  max={9}   step={0.1} />
          <UmbralRow label="Crítico alto"       color="red"    valor={umbrales.ph_critico_alto}       onChange={v => setU('ph_critico_alto', v)}       min={7}  max={10}  step={0.1} />
          <UmbralRow label="Advertencia baja"  color="amber"  valor={umbrales.ph_advertencia_bajo}   onChange={v => setU('ph_advertencia_bajo', v)}   min={4}  max={7}   step={0.1} />
          <UmbralRow label="Crítico bajo"       color="red"    valor={umbrales.ph_critico_bajo}       onChange={v => setU('ph_critico_bajo', v)}       min={3}  max={6}   step={0.1} />
        </UmbralGroup>
      </Section>

      {/* Notificaciones */}
      <Section icono={<Bell size={18} />} titulo="Notificaciones">
        <div className="space-y-3">
          <Toggle label="Alertas críticas"     sub="Notificar cuando un sensor supere un umbral crítico"     checked={notif.alertasCriticas}    onChange={v => setNotif(p => ({ ...p, alertasCriticas: v }))} />
          <Toggle label="Alertas de advertencia" sub="Notificar en rangos de precaución"                      checked={notif.alertasAdvertencia} onChange={v => setNotif(p => ({ ...p, alertasAdvertencia: v }))} />
          <Toggle label="Resumen diario"       sub="Recibir un reporte diario del estado del conuco"          checked={notif.resumenDiario}      onChange={v => setNotif(p => ({ ...p, resumenDiario: v }))} />
        </div>
      </Section>

      {/* Botón guardar */}
      <div className="flex items-center gap-3 pb-4">
        <button
          onClick={guardar}
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-sm"
        >
          <Save size={16} /> Guardar cambios
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
  const badge = color === 'red'
    ? 'bg-red-100 text-red-700'
    : 'bg-amber-100 text-amber-700';
  return (
    <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${badge}`}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range" min={min} max={max} step={step} value={valor}
          onChange={e => onChange(e.target.value)}
          className="w-20 accent-green-600"
        />
        <span className="text-sm font-bold text-slate-700 w-10 text-right">{valor}</span>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
      />
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
      <div
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${checked ? 'bg-green-500' : 'bg-slate-200'}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
    </label>
  );
}
