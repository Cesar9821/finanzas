'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, TrendingDown, Wallet, Trash2, 
  Plus, Coffee, Home, Car, ShoppingBag, Heart,
  PieChart as PieChartIcon,
  LayoutDashboard, History, Settings, LogOut,
  Target, Calendar, Bell, ChevronLeft, ChevronRight,
  Search, PiggyBank, X, ArrowDownLeft, ArrowUpRight,
  Zap, BarChart3, ShieldCheck, Menu
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CATEGORIAS = [
  { id: 'comida', nombre: 'Comida', icono: <Coffee size={14}/>, color: '#f97316' },
  { id: 'vivienda', nombre: 'Vivienda', icono: <Home size={14}/>, color: '#3b82f6' },
  { id: 'transporte', nombre: 'Transporte', icono: <Car size={14}/>, color: '#a855f7' },
  { id: 'compras', nombre: 'Compras', icono: <ShoppingBag size={14}/>, color: '#ec4899' },
  { id: 'salud', nombre: 'Salud', icono: <Heart size={14}/>, color: '#ef4444' },
  { id: 'varios', nombre: 'Varios', icono: <Plus size={14}/>, color: '#64748b' },
];

export default function VaultEliteFinal() {
  const [vista, setVista] = useState<'dashboard' | 'historial' | 'metas' | 'ajustes'>('dashboard');
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [metas, setMetas] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Estado para menú móvil
  
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [tipo, setTipo] = useState<'Gasto' | 'Ingreso' | 'Ahorro'>('Gasto');
  const [categoria, setCategoria] = useState('varios');
  const [metaDestino, setMetaDestino] = useState('');
  const [esRetiro, setEsRetiro] = useState(false);

  const [notificacion, setNotificacion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fechaFiltro, setFechaFiltro] = useState(new Date());
  const [busqueda, setBusqueda] = useState('');
  const [modalMeta, setModalMeta] = useState(false);

  const [nuevaMeta, setNuevaMeta] = useState({ nombre: '', objetivo: '', color: '#10b981' });

  useEffect(() => {
    fetchMovimientos();
    fetchMetas();
  }, [fechaFiltro]);

  const triggerToast = (msg: string) => {
    setNotificacion(msg);
    setTimeout(() => setNotificacion(null), 3000);
  };

  const formatInputMoneda = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, "");
    return onlyNumbers.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMonto(formatInputMoneda(e.target.value));
  };

  const fetchMovimientos = async () => {
    setLoading(true);
    const primerDia = new Date(fechaFiltro.getFullYear(), fechaFiltro.getMonth(), 1).toISOString();
    const ultimoDia = new Date(fechaFiltro.getFullYear(), fechaFiltro.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const { data, error } = await supabase
      .from('movimientos')
      .select('*')
      .gte('created_at', primerDia)
      .lte('created_at', ultimoDia)
      .order('created_at', { ascending: false });
    if (!error) setMovimientos(data || []);
    setLoading(false);
  };

  const fetchMetas = async () => {
    const { data, error } = await supabase.from('metas').select('*').order('created_at', { ascending: true });
    if (!error) {
      setMetas(data || []);
      if (data && data.length > 0 && !metaDestino) setMetaDestino(data[0].id);
    }
  };

  const agregarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNumerico = parseInt(monto.replace(/\./g, ""));
    if (!montoNumerico || !concepto) return;
    
    let tipoDB = tipo;
    let conceptoFinal = concepto;
    if (tipo === 'Ahorro') {
      tipoDB = esRetiro ? 'Ingreso' : 'Gasto';
      conceptoFinal = esRetiro ? `📤 Retiro: ${concepto}` : `✨ Ahorro: ${concepto}`;
    }

    const { data, error } = await supabase.from('movimientos').insert([{ 
      concepto: conceptoFinal, 
      monto: montoNumerico, 
      tipo: tipoDB, 
      categoria: tipo === 'Ahorro' ? 'ahorro' : categoria 
    }]).select();

    if (!error) {
      if (tipo === 'Ahorro' && metaDestino) {
        const metaObj = metas.find(m => m.id === metaDestino);
        const nuevoActual = esRetiro 
          ? (metaObj.actual || 0) - montoNumerico 
          : (metaObj.actual || 0) + montoNumerico;
        await supabase.from('metas').update({ actual: Math.max(0, nuevoActual) }).eq('id', metaDestino);
        fetchMetas();
      }
      setConcepto('');
      setMonto(''); 
      fetchMovimientos(); 
      triggerToast(esRetiro ? "Fondos retirados" : "Registro exitoso");
    }
  };

  const crearNuevaMeta = async () => {
    const obj = parseInt(nuevaMeta.objetivo.replace(/\./g, ""));
    if (!nuevaMeta.nombre || !obj) return;
    const { error } = await supabase.from('metas').insert([{
      nombre: nuevaMeta.nombre,
      objetivo: obj,
      actual: 0,
      color: nuevaMeta.color
    }]);
    if (!error) {
      setModalMeta(false);
      setNuevaMeta({ nombre: '', objetivo: '', color: '#10b981' });
      fetchMetas();
      triggerToast("Nueva meta establecida");
    }
  };

  const eliminarMovimiento = async (id: string) => {
    const { error } = await supabase.from('movimientos').delete().eq('id', id);
    if (!error) {
      fetchMovimientos();
      triggerToast("Registro eliminado");
    }
  };

  const cambiarMes = (offset: number) => {
    setFechaFiltro(new Date(fechaFiltro.getFullYear(), fechaFiltro.getMonth() + offset, 1));
  };

  const ingresos = movimientos.filter(m => m.tipo === 'Ingreso').reduce((a, b) => a + Number(b.monto), 0);
  const gastos = movimientos.filter(m => m.tipo === 'Gasto').reduce((a, b) => a + Number(b.monto), 0);
  const balance = ingresos - gastos;
  const tasaAhorro = ingresos > 0 ? Math.round(((ingresos - gastos) / ingresos) * 100) : 0;
  const dataPie = CATEGORIAS.map(cat => ({
    name: cat.nombre,
    value: movimientos
      .filter(m => m.categoria === cat.id && m.tipo === 'Gasto')
      .reduce((acc, curr) => acc + Number(curr.monto), 0),
    color: cat.color
  })).filter(d => d.value > 0);

  const moneda = (v: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v);

  const navItems = [
    { id: 'dashboard', n: 'Dashboard', i: <LayoutDashboard size={18}/> },
    { id: 'historial', n: 'Historial', i: <History size={18}/> },
    { id: 'metas', n: 'Metas Ahorro', i: <Target size={18}/> },
    { id: 'ajustes', n: 'Analisis', i: <Zap size={18}/> },
  ];

  return (
    <div className="flex min-h-screen bg-[#05070a] text-slate-400 font-sans selection:bg-emerald-500/30">
      
      {notificacion && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[150] bg-emerald-500 text-black px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl animate-in fade-in slide-in-from-top-4">
          {notificacion}
        </div>
      )}

      {/* MODAL CREAR META */}
      {modalMeta && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#161b2c] w-full max-w-md p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 shadow-2xl relative">
            <button onClick={() => setModalMeta(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={20}/></button>
            <h3 className="text-white font-black italic text-xl uppercase mb-8 tracking-tighter">Nueva Meta de Ahorro</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Nombre del Objetivo</label>
                <input type="text" value={nuevaMeta.nombre} onChange={e => setNuevaMeta({...nuevaMeta, nombre: e.target.value})} className="w-full bg-[#0b0f1a] border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500 text-white" placeholder="Ej: Viaje a Japón" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Monto Objetivo</label>
                <input type="text" value={nuevaMeta.objetivo} onChange={e => setNuevaMeta({...nuevaMeta, objetivo: formatInputMoneda(e.target.value)})} className="w-full bg-[#0b0f1a] border border-white/5 p-4 rounded-2xl outline-none focus:border-emerald-500 text-emerald-400 font-mono font-bold" placeholder="0" />
              </div>
              <div className="flex flex-wrap gap-3">
                {['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'].map(c => (
                  <button key={c} onClick={() => setNuevaMeta({...nuevaMeta, color: c})} className={`w-10 h-10 rounded-full border-4 ${nuevaMeta.color === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
              <button onClick={crearNuevaMeta} className="w-full py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-500 transition-colors">Crear Objetivo</button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR (Desktop) */}
      <aside className="w-72 border-r border-white/5 bg-[#0b0f1a] hidden lg:flex flex-col p-8 sticky top-0 h-screen">
        <div className="flex items-center gap-4 mb-14">
          <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Wallet size={20} className="text-black" />
          </div>
          <div>
            <h2 className="text-white font-black tracking-tight text-xl italic">Finanzas</h2>
            <p className="text-[8px] font-bold text-slate-600 tracking-[0.3em] uppercase">Personales</p>
          </div>
        </div>
        <nav className="flex-1 space-y-3">
          {navItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => setVista(item.id as any)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all group ${vista === item.id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner' : 'hover:bg-white/5 text-slate-500 hover:text-slate-300'}`}
            >
              {item.i} {item.n}
            </button>
          ))}
        </nav>
      </aside>

      {/* NAV MÓVIL (Bottom) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-[#0b0f1a]/80 backdrop-blur-xl border-t border-white/5 px-4 pb-6 pt-3 flex justify-around">
        {navItems.map((item) => (
          <button 
            key={item.id} 
            onClick={() => setVista(item.id as any)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${vista === item.id ? 'text-emerald-400' : 'text-slate-600'}`}
          >
            {item.i}
            <span className="text-[8px] font-black uppercase tracking-tighter">{item.n.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      <main className="flex-1 p-4 md:p-12 pb-32 lg:pb-12 max-w-7xl mx-auto w-full overflow-hidden">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 gap-6">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic">
            {vista === 'ajustes' ? 'Analisis Inteligente' : vista}
          </h1>

          <div className="flex items-center bg-[#161b2c] p-1.5 rounded-2xl border border-white/5 w-full md:w-auto justify-between md:justify-start">
            <button onClick={() => cambiarMes(-1)} className="p-2 hover:bg-white/5 rounded-xl transition-all text-emerald-500"><ChevronLeft size={18}/></button>
            <div className="px-4 text-center min-w-[140px]">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Periodo Actual</p>
              <p className="text-xs font-bold text-white uppercase italic">{fechaFiltro.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</p>
            </div>
            <button onClick={() => cambiarMes(1)} className="p-2 hover:bg-white/5 rounded-xl transition-all text-emerald-500"><ChevronRight size={18}/></button>
          </div>
        </div>

        {/* --- DASHBOARD --- */}
        {vista === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10">
              {[
                { label: 'Balance Neto', val: balance, color: 'text-emerald-400', bg: 'bg-emerald-400/5' },
                { label: 'Ingresos', val: ingresos, color: 'text-white', bg: 'bg-white/5' },
                { label: 'Gastos', val: gastos, color: 'text-rose-500', bg: 'bg-rose-500/5' },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} border border-white/5 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] backdrop-blur-md relative overflow-hidden`}>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">{s.label}</p>
                  <p className={`text-2xl md:text-3xl font-mono font-black ${s.color}`}>{moneda(s.val)}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8 space-y-10">
                <div className="bg-[#0b0f1a] rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-white/5 shadow-2xl">
                  <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] mb-8 md:mb-12">Distribución de Gastos</h3>
                  <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                    <div className="w-full h-48 md:h-64 md:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={dataPie} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                            {dataPie.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#05070a', borderRadius: '15px', border: '1px solid #1e293b', fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full md:w-1/2 grid grid-cols-1 gap-3">
                      {dataPie.map(d => (
                        <div key={d.name} className="flex justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase">{d.name}</span>
                          </div>
                          <span className="text-xs font-mono font-black text-white">{moneda(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest px-4">Actividad Reciente</h3>
                  <div className="space-y-4">
                    {movimientos.slice(0, 5).map((m) => {
                      const cat = CATEGORIAS.find(c => c.id === m.categoria) || { nombre: 'Ahorro', icono: <PiggyBank size={14}/> };
                      return (
                        <div key={m.id} className="bg-[#0b0f1a] p-5 md:p-6 rounded-[2rem] border border-white/5 flex justify-between items-center transition-all group hover:border-white/10">
                          <div className="flex items-center gap-4 md:gap-6">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#05070a] border border-white/5 flex items-center justify-center text-emerald-400">
                              {cat.icono}
                            </div>
                            <div className="max-w-[120px] md:max-w-none truncate">
                              <p className="text-sm md:text-base font-bold text-white uppercase italic truncate">{m.concepto}</p>
                              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{cat.nombre}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 md:gap-6">
                            <p className={`text-sm md:text-lg font-mono font-black ${m.tipo === 'Gasto' ? 'text-slate-400' : 'text-emerald-400'}`}>
                              {m.tipo === 'Gasto' ? '-' : '+'}{moneda(m.monto)}
                            </p>
                            <button onClick={() => eliminarMovimiento(m.id)} className="p-2 text-slate-800 hover:text-rose-500 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-10">
                <div className="bg-[#161b2c] rounded-[2rem] md:rounded-[3rem] p-8 md:p-10 border border-white/5 shadow-2xl">
                  <h2 className="text-2xl font-black text-white mb-8 md:mb-10 tracking-tight leading-tight uppercase italic">Nueva<br/>Transacción</h2>
                  <form onSubmit={agregarMovimiento} className="space-y-6 md:space-y-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-600 uppercase ml-2 tracking-widest">Concepto</label>
                      <input type="text" value={concepto} onChange={(e)=>setConcepto(e.target.value)} className="w-full bg-[#0b0f1a] border border-white/5 p-4 md:p-5 rounded-2xl outline-none focus:border-emerald-500 text-white text-sm" placeholder="Ej. Depósito" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-600 uppercase ml-2 tracking-widest">Monto</label>
                      <input type="text" value={monto} onChange={handleMontoChange} className="w-full bg-[#0b0f1a] border border-white/5 p-4 md:p-5 rounded-2xl outline-none focus:border-emerald-500 text-emerald-400 font-mono font-black text-2xl md:text-3xl" placeholder="0" />
                    </div>
                    <div className="flex gap-1 p-1.5 bg-[#0b0f1a] rounded-2xl border border-white/5">
                      {['Gasto', 'Ingreso', 'Ahorro'].map(t => (
                        <button key={t} type="button" onClick={() => setTipo(t as any)} className={`flex-1 py-3 md:py-4 rounded-xl text-[8px] md:text-[9px] font-black uppercase transition-all ${tipo === t ? 'bg-emerald-500 text-black' : 'text-slate-600'}`}>{t}</button>
                      ))}
                    </div>

                    {tipo === 'Ahorro' ? (
                      <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="flex bg-[#0b0f1a] p-1 rounded-2xl border border-white/5">
                           <button type="button" onClick={() => setEsRetiro(false)} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[8px] font-black uppercase transition-all ${!esRetiro ? 'bg-emerald-500 text-black' : 'text-slate-600'}`}><ArrowDownLeft size={12}/> Depositar</button>
                           <button type="button" onClick={() => setEsRetiro(true)} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[8px] font-black uppercase transition-all ${esRetiro ? 'bg-rose-500 text-white' : 'text-slate-600'}`}><ArrowUpRight size={12}/> Retirar</button>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-emerald-500 uppercase ml-2 tracking-widest">Meta de Ahorro</label>
                          <select value={metaDestino} onChange={(e) => setMetaDestino(e.target.value)} className="w-full bg-[#0b0f1a] border border-white/10 p-4 rounded-2xl text-white text-xs font-bold outline-none focus:border-emerald-500">
                            {metas.map(m => (<option key={m.id} value={m.id}>{m.nombre} ({moneda(m.actual)})</option>))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 md:gap-3">
                        {CATEGORIAS.map(cat => (
                          <button key={cat.id} type="button" onClick={() => setCategoria(cat.id)} className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${categoria === cat.id ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400' : 'border-white/5 text-slate-700'}`}>
                            {cat.icono}
                            <span className="text-[7px] font-black uppercase">{cat.nombre}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <button className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl transition-all ${tipo === 'Ahorro' && esRetiro ? 'bg-rose-500 text-white shadow-rose-500/10' : 'bg-emerald-500 text-black shadow-emerald-500/10'}`}>
                      {tipo === 'Ahorro' ? (esRetiro ? 'Confirmar Retiro' : 'Confirmar Depósito') : 'Registrar'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- HISTORIAL (Responsive Table) --- */}
        {vista === 'historial' && (
          <div className="animate-in fade-in duration-500">
             <div className="mb-8 relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input type="text" placeholder="     Buscar movimientos..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-[#161b2c] border border-white/5 p-4 md:p-5 pl-12 rounded-2xl outline-none text-white text-sm" />
            </div>
            <div className="bg-[#0b0f1a] rounded-[2rem] border border-white/5 overflow-hidden overflow-x-auto">
              <table className="w-full text-left min-w-[500px]">
                <thead className="border-b border-white/5 bg-white/[0.02]">
                  <tr>
                    <th className="p-6 text-[10px] font-black uppercase text-slate-500">Fecha</th>
                    <th className="p-6 text-[10px] font-black uppercase text-slate-500">Concepto</th>
                    <th className="p-6 text-[10px] font-black uppercase text-slate-500 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {movimientos.filter(m => m.concepto.toLowerCase().includes(busqueda.toLowerCase())).map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.01]">
                      <td className="p-6 text-xs font-mono">{new Date(m.created_at).toLocaleDateString()}</td>
                      <td className="p-6 text-sm font-bold text-white uppercase italic">{m.concepto}</td>
                      <td className={`p-6 text-right font-mono font-black ${m.tipo === 'Gasto' ? 'text-rose-500' : 'text-emerald-400'}`}>
                        {m.tipo === 'Gasto' ? '-' : '+'}{moneda(m.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- METAS --- */}
        {vista === 'metas' && (
          <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {metas.map((m) => {
                const porcentaje = Math.min(Math.round((m.actual / m.objetivo) * 100), 100);
                return (
                  <div key={m.id} className="bg-[#0b0f1a] rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 border border-white/5 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 opacity-5 text-white"><Target size={120} /></div>
                    <div className="relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1 italic" style={{ color: m.color }}>Meta de Ahorro</p>
                      <h3 className="text-xl md:text-2xl font-black text-white italic tracking-tighter mb-8">{m.nombre}</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Actual</p>
                            <p className="text-lg md:text-xl font-mono font-black text-white">{moneda(m.actual)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl md:text-2xl font-black italic" style={{ color: m.color }}>{porcentaje}%</p>
                          </div>
                        </div>
                        <div className="w-full h-3 bg-black rounded-full overflow-hidden p-0.5 border border-white/5">
                          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${porcentaje}%`, backgroundColor: m.color, boxShadow: `0 0 15px ${m.color}66` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Objetivo: {moneda(m.objetivo)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setModalMeta(true)} className="bg-[#161b2c] rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 border border-dashed border-white/10 flex flex-col items-center justify-center text-center group hover:border-emerald-500/30 transition-all min-h-[200px]">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                  <Plus size={24} className="text-slate-500 group-hover:text-emerald-500" />
                </div>
                <h4 className="text-white font-black uppercase tracking-widest text-[10px] md:text-xs">Añadir Objetivo</h4>
              </button>
            </div>
          </div>
        )}

        {/* --- INSIGHTS & ESTADÍSTICAS --- */}
        {vista === 'ajustes' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
              
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[2rem] p-6 md:p-8 text-black relative overflow-hidden shadow-2xl">
                   <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <Zap size={16} fill="black" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Analisis IA</h3>
                    </div>
                    <div className="space-y-4">
                      {balance >= 0 ? (
                        <div className="bg-white/10 p-5 rounded-[1.5rem] backdrop-blur-md border border-white/10">
                          <p className="text-xs font-black italic mb-1">🚀 Salud Óptima</p>
                          <p className="text-[10px] font-bold leading-relaxed">
                            Mantienes un superávit de {moneda(balance)}. Tu tasa de ahorro es del {tasaAhorro}%. Sugerencia: Automatiza {moneda(balance * 0.3)} a inversión.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-rose-500/20 p-5 rounded-[1.5rem] backdrop-blur-md border border-white/10">
                          <p className="text-xs font-black italic mb-1 text-white">⚠️ Alerta de Flujo</p>
                          <p className="text-[10px] font-bold leading-relaxed text-white/90">
                            Estás gastando más de lo que ingresas. Reduce gastos en "{dataPie[0]?.name || 'Varios'}" para recuperar balance.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <BarChart3 className="absolute -right-8 -bottom-8 opacity-10 text-black" size={160} />
                </div>

                <div className="bg-[#0b0f1a] rounded-[2rem] p-6 md:p-8 border border-white/5">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Tasa de Ahorro Real</p>
                  <div className="flex items-end gap-3">
                    <p className="text-4xl md:text-5xl font-mono font-black text-white">{tasaAhorro}%</p>
                    <p className="text-[10px] font-bold text-emerald-500 mb-2 uppercase italic">Eficiencia</p>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full mt-6 overflow-hidden">
                    <div className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981]" style={{ width: `${Math.max(0, tasaAhorro)}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6 md:space-y-8">
                <div className="bg-[#0b0f1a] rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-white/5">
                  <h4 className="text-white font-black italic uppercase tracking-tighter text-lg md:text-xl mb-8">Mapa de Gastos</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {CATEGORIAS.map(cat => {
                      const valor = movimientos.filter(m => m.categoria === cat.id && m.tipo === 'Gasto').reduce((a, b) => a + Number(b.monto), 0);
                      const porc = gastos > 0 ? (valor / gastos) * 100 : 0;
                      return (
                        <div key={cat.id} className="bg-white/[0.02] p-5 rounded-3xl border border-white/5 hover:border-emerald-500/20 transition-all group">
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 rounded-2xl bg-[#05070a] border border-white/5 text-slate-500 group-hover:text-emerald-500">{cat.icono}</div>
                            <span className="text-[9px] font-mono font-black text-slate-600">{Math.round(porc)}%</span>
                          </div>
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{cat.nombre}</p>
                          <p className="text-sm md:text-base font-mono font-black text-white">{moneda(valor)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#161b2c] rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="space-y-2">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Sustentabilidad</p>
                      <p className="text-xl md:text-2xl font-mono font-black text-emerald-400">{moneda(balance)}</p>
                      <p className="text-[8px] font-bold text-slate-600 uppercase">Fondo libre</p>
                   </div>
                   <div className="space-y-2 md:border-l border-white/5 md:pl-8">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Promedio Diario</p>
                      <p className="text-xl md:text-2xl font-mono font-black text-white">{moneda(gastos / (new Date().getDate()))}</p>
                      <p className="text-[8px] font-bold text-slate-600 uppercase">Mes actual</p>
                   </div>
                   <div className="space-y-2 md:border-l border-white/5 md:pl-8">
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">Autonomía</p>
                      <p className="text-xl md:text-2xl font-mono font-black text-blue-400">
                        {gastos > 0 ? Math.floor(balance / (gastos / new Date().getDate())) : '∞'} 
                        <span className="text-xs ml-2 opacity-40">días</span>
                      </p>
                      <p className="text-[8px] font-bold text-slate-600 uppercase">Vida financiera</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}