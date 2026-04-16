import { useState, useRef } from 'react';
import { Search, Upload, Download, Filter, CheckCircle, Clock, XCircle, TrendingUp, ChevronUp, ChevronDown } from 'lucide-react';

const HISTORIAL_MOCK = [
  { id: 1, lote: 'Lote-001', cultivo: 'Maíz Amarillo',      etapa: 'Cosechado',    fechaSiembra: '2025-09-01', fechaCosecha: '2026-01-15', rendimiento: 4.2, unidad: 'ton/ha', estado: 'completado', notas: 'Excelente rendimiento, condiciones ideales.' },
  { id: 2, lote: 'Lote-002', cultivo: 'Habichuelas Rojas',   etapa: 'Cosechado',    fechaSiembra: '2025-08-20', fechaCosecha: '2025-12-10', rendimiento: 1.8, unidad: 'ton/ha', estado: 'completado', notas: 'Afectado por humedad baja en etapa de engorde.' },
  { id: 3, lote: 'Lote-003', cultivo: 'Plátano Barahonero',  etapa: 'En curso',     fechaSiembra: '2025-11-05', fechaCosecha: null,          rendimiento: null, unidad: 'ton/ha', estado: 'en_curso',   notas: 'Floración en progreso.' },
  { id: 4, lote: 'Lote-001', cultivo: 'Yuca Blanca',         etapa: 'Cosechado',    fechaSiembra: '2025-06-15', fechaCosecha: '2025-11-30', rendimiento: 12.5, unidad: 'ton/ha', estado: 'completado', notas: '' },
  { id: 5, lote: 'Lote-004', cultivo: 'Batata Amarilla',     etapa: 'Abandonado',   fechaSiembra: '2025-07-01', fechaCosecha: '2025-09-20', rendimiento: 0,    unidad: 'ton/ha', estado: 'abandonado', notas: 'Plaga de áfidos. Cultivo perdido.' },
  { id: 6, lote: 'Lote-002', cultivo: 'Maíz Amarillo',      etapa: 'Cosechado',    fechaSiembra: '2025-03-10', fechaCosecha: '2025-07-25', rendimiento: 3.9,  unidad: 'ton/ha', estado: 'completado', notas: '' },
  { id: 7, lote: 'Lote-003', cultivo: 'Ají Caballero',       etapa: 'En curso',     fechaSiembra: '2026-01-20', fechaCosecha: null,          rendimiento: null, unidad: 'ton/ha', estado: 'en_curso',   notas: 'Desarrollo vegetativo normal.' },
  { id: 8, lote: 'Lote-001', cultivo: 'Sorgo',               etapa: 'Cosechado',    fechaSiembra: '2024-11-01', fechaCosecha: '2025-03-15', rendimiento: 5.1,  unidad: 'ton/ha', estado: 'completado', notas: 'Rotación de cultivo exitosa.' },
];

const ESTADO_CONFIG = {
  completado: { label: 'Completado', bg: 'bg-green-100', text: 'text-green-700', Icono: CheckCircle },
  en_curso:   { label: 'En curso',   bg: 'bg-blue-100',  text: 'text-blue-700',  Icono: Clock       },
  abandonado: { label: 'Abandonado', bg: 'bg-red-100',   text: 'text-red-700',   Icono: XCircle     },
};

export default function Historial() {
  const [registros] = useState(HISTORIAL_MOCK);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [ordenCol, setOrdenCol] = useState('fechaSiembra');
  const [ordenDir, setOrdenDir] = useState('desc');
  const [importando, setImportando] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const fileRef = useRef();

  const mostrarToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);
    // Simular procesamiento
    setTimeout(() => {
      setImportando(false);
      mostrarToast(`✅ "${file.name}" procesado — 0 registros nuevos (demo)`);
    }, 1800);
    e.target.value = '';
  };

  const toggleOrden = (col) => {
    if (ordenCol === col) setOrdenDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setOrdenCol(col); setOrdenDir('asc'); }
  };

  const filtrados = registros
    .filter(r => {
      const q = busqueda.toLowerCase();
      const matchBusqueda = r.cultivo.toLowerCase().includes(q) || r.lote.toLowerCase().includes(q);
      const matchEstado = filtroEstado === 'Todos' || r.estado === filtroEstado.toLowerCase().replace(' ', '_');
      return matchBusqueda && matchEstado;
    })
    .sort((a, b) => {
      let va = a[ordenCol] ?? '';
      let vb = b[ordenCol] ?? '';
      if (ordenDir === 'asc') return va > vb ? 1 : -1;
      return va < vb ? 1 : -1;
    });

  const completados = registros.filter(r => r.estado === 'completado');
  const rendPromedio = completados.length
    ? (completados.reduce((s, r) => s + r.rendimiento, 0) / completados.length).toFixed(1)
    : 0;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Historial de Cultivos</h1>
          <p className="text-slate-500 mt-1">Registro histórico de todas las temporadas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importando}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors disabled:opacity-60"
          >
            <Upload size={16} />
            {importando ? 'Procesando...' : 'Importar Excel'}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            <Download size={16} /> Exportar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiMini label="Total registros"  value={registros.length}                                  color="slate"  />
        <KpiMini label="Completados"       value={registros.filter(r => r.estado === 'completado').length} color="green"  />
        <KpiMini label="En curso"          value={registros.filter(r => r.estado === 'en_curso').length}   color="blue"   />
        <KpiMini label="Rend. promedio"    value={`${rendPromedio} t/ha`}                            color="purple" icon={<TrendingUp size={16} />} />
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por cultivo o lote..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400" />
          {['Todos', 'Completado', 'En curso', 'Abandonado'].map(f => (
            <button key={f} onClick={() => setFiltroEstado(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${filtroEstado === f ? 'bg-green-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {[
                  { col: 'lote',         label: 'Lote' },
                  { col: 'cultivo',      label: 'Cultivo' },
                  { col: 'etapa',        label: 'Etapa' },
                  { col: 'fechaSiembra', label: 'Siembra' },
                  { col: 'fechaCosecha', label: 'Cosecha' },
                  { col: 'rendimiento',  label: 'Rendimiento' },
                  { col: 'estado',       label: 'Estado' },
                ].map(({ col, label }) => (
                  <th key={col}
                    onClick={() => toggleOrden(col)}
                    className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-800 select-none whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      {label}
                      {ordenCol === col
                        ? (ordenDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                        : <span className="w-3" />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Sin resultados para esa búsqueda</td></tr>
              ) : filtrados.map(r => {
                const ec = ESTADO_CONFIG[r.estado];
                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 font-semibold text-slate-700">{r.lote}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.cultivo}</td>
                    <td className="px-4 py-3 text-slate-500">{r.etapa}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.fechaSiembra}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.fechaCosecha ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {r.rendimiento != null ? `${r.rendimiento} ${r.unidad}` : '—'}
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
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400 font-medium">
          Mostrando {filtrados.length} de {registros.length} registros
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold z-50 animate-fade-in">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

function KpiMini({ label, value, color, icon }) {
  const colors = {
    slate:  'bg-slate-50  border-slate-200  text-slate-700',
    green:  'bg-green-50  border-green-200  text-green-700',
    blue:   'bg-blue-50   border-blue-200   text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-1.5">
        {icon && <span className="opacity-70">{icon}</span>}
        <p className="text-xl font-extrabold">{value}</p>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider mt-1 opacity-60">{label}</p>
    </div>
  );
}
