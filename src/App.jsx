import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
  PieChart, Pie, Legend,
} from 'recharts';
import {
  LayoutDashboard, ListOrdered, Calendar, Trophy, TrendingUp,
  Target, CheckCircle, AlertCircle, RefreshCw, ChevronDown,
  Building2, User, X, SlidersHorizontal, ArrowUpDown,
} from 'lucide-react';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Troque pelo IP da máquina quando acessar pelo celular na mesma rede
const API_BASE = 'http://127.0.0.1:8000';

// ─── PALETA ───────────────────────────────────────────────────────────────────
const C = {
  bg:        '#07080f',
  surface:   '#0d0f1c',
  card:      '#111326',
  border:    'rgba(255,255,255,0.07)',
  gold:      '#f59e0b',   // ProHair
  purple:    '#8b5cf6',   // ProGrowth
  success:   '#22c55e',
  danger:    '#ef4444',
  text:      '#f1f5f9',
  muted:     '#64748b',
  faint:     '#1e2035',
};

const CORES_GAP = ['#f59e0b','#8b5cf6','#ec4899','#06b6d4','#10b981','#f97316'];

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────
const moeda = (v) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const compacto = (v) =>
  new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short' }).format(v ?? 0);

const primeiroNome = (s = '') => s.split(' ')[0];

const isoParaApi = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const periodoParaApi = (p) => ({
  'Hoje': 'hoje', 'Esta Semana': 'semana', 'Este Mês': 'mes', 'Personalizado': 'personalizado',
}[p] || 'mes');

const STATUS_COR = {
  'Aprovado':          '#6366f1',
  'Preparando envio':  '#f59e0b',
  'Faturado':          '#06b6d4',
  'Pronto para envio': '#8b5cf6',
  'Enviado':           '#10b981',
  'Entregue':          '#22c55e',
};

// ─── COMPONENTES BÁSICOS ──────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'3rem' }}>
      <RefreshCw size={28} color={C.gold} style={{ animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function BadgeEmpresa({ empresa }) {
  const cor = empresa === 'ProHair' ? C.gold : C.purple;
  return (
    <span style={{
      background: cor + '22', color: cor,
      borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700,
      letterSpacing: 0.3, whiteSpace: 'nowrap',
    }}>
      {empresa}
    </span>
  );
}

function BadgeStatus({ situacao }) {
  const cor = STATUS_COR[situacao] ?? C.muted;
  return (
    <span style={{
      background: cor + '22', color: cor,
      borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {situacao}
    </span>
  );
}

function PillDuplo() {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700 }}>
      <span style={{ background: C.gold+'33', color: C.gold, borderRadius:'999px 0 0 999px', padding:'2px 8px' }}>
        ProHair
      </span>
      <span style={{ background: C.purple+'33', color: C.purple, borderRadius:'0 999px 999px 0', padding:'2px 8px' }}>
        ProGrowth
      </span>
    </span>
  );
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, accent, destaque }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${destaque ? accent + '55' : C.border}`,
      borderRadius: 16, padding: '20px 24px', position: 'relative', overflow: 'hidden',
    }}>
      {destaque && (
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:2,
          background: `linear-gradient(90deg, ${accent}, transparent)`,
        }}/>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <div style={{
          background: accent + '22', borderRadius:10, padding:8,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <Icon size={18} color={accent} />
        </div>
        <span style={{ color: C.muted, fontSize:11, fontWeight:600, letterSpacing:1, textTransform:'uppercase' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize:26, fontWeight:800, color: C.text, lineHeight:1.1 }}>{value}</div>
      {sub && <div style={{ color: C.muted, fontSize:12, marginTop:6 }}>{sub}</div>}
    </div>
  );
}

// ─── BARRA DE FILTRO REUTILIZÁVEL ─────────────────────────────────────────────
function FiltroPeriodo({ periodo, setPeriodo, dataInicio, setDataInicio, dataFim, setDataFim, onBuscar }) {
  const [showCal, setShowCal] = useState(false);

  const btns = ['Hoje','Esta Semana','Este Mês'];

  const handlePeriodo = (p) => {
    setPeriodo(p);
    if (p !== 'Personalizado') setShowCal(false);
  };

  return (
    <div style={{ position:'relative', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
      <div style={{
        display:'flex', background: C.surface, border:`1px solid ${C.border}`,
        borderRadius:999, padding:4, gap:2,
      }}>
        {btns.map((p) => (
          <button
            key={p}
            onClick={() => handlePeriodo(p)}
            style={{
              padding:'6px 14px', borderRadius:999, border:'none', cursor:'pointer', fontSize:12,
              fontWeight:700, transition:'all 0.15s',
              background: periodo === p ? C.gold : 'transparent',
              color: periodo === p ? '#000' : C.muted,
            }}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => { handlePeriodo('Personalizado'); setShowCal(s => !s); }}
          style={{
            padding:'6px 10px', borderRadius:999, border:'none', cursor:'pointer',
            background: periodo === 'Personalizado' ? C.gold : 'transparent',
            color: periodo === 'Personalizado' ? '#000' : C.muted,
            display:'flex', alignItems:'center', gap:4,
          }}
        >
          <Calendar size={14} />
        </button>
      </div>

      {showCal && (
        <div style={{
          position:'absolute', top:'calc(100% + 8px)', right:0, zIndex:50,
          background: C.card, border:`1px solid ${C.gold}44`, borderRadius:14,
          padding:16, boxShadow:'0 20px 60px rgba(0,0,0,0.6)',
          display:'flex', flexDirection:'column', gap:10, minWidth:240,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ color: C.text, fontWeight:700, fontSize:13 }}>Período personalizado</span>
            <button onClick={() => setShowCal(false)} style={{ background:'none', border:'none', cursor:'pointer', color: C.muted }}>
              <X size={16} />
            </button>
          </div>
          <label style={{ color: C.muted, fontSize:11, fontWeight:600 }}>
            Data inicial
            <input
              type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              style={{ display:'block', marginTop:4, background: C.faint, border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 10px', color: C.text, fontSize:13, width:'100%' }}
            />
          </label>
          <label style={{ color: C.muted, fontSize:11, fontWeight:600 }}>
            Data final
            <input
              type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              style={{ display:'block', marginTop:4, background: C.faint, border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 10px', color: C.text, fontSize:13, width:'100%' }}
            />
          </label>
          <button
            onClick={() => { onBuscar(); setShowCal(false); }}
            style={{
              background: C.gold, color:'#000', border:'none', borderRadius:8, padding:'8px 0',
              fontWeight:800, fontSize:13, cursor:'pointer',
            }}
          >
            Aplicar filtro
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ABA DASHBOARD ────────────────────────────────────────────────────────────
function DashboardTab() {
  const [periodo, setPeriodo] = useState('Este Mês');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [atualizado, setAtualizado] = useState('');

  const buscar = useCallback(() => {
    setLoading(true);
    let url = `${API_BASE}/api/dashboard?periodo=${periodoParaApi(periodo)}`;
    if (periodo === 'Personalizado') {
      const ini = isoParaApi(dataInicio);
      const fim = isoParaApi(dataFim);
      if (!ini || !fim) { setLoading(false); return; }
      url += `&data_inicio=${ini}&data_fim=${fim}`;
    }
    fetch(url)
      .then(r => r.json())
      .then(d => {
        setDados(d);
        setAtualizado(new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [periodo, dataInicio, dataFim]);

  useEffect(() => {
    buscar();
    const t = setInterval(buscar, 300_000);
    return () => clearInterval(t);
  }, [periodo]);

  if (loading && !dados) return <Spinner />;
  if (!dados) return (
    <div style={{ color: C.danger, textAlign:'center', padding:'4rem' }}>
      <AlertCircle size={40} style={{ marginBottom:12 }} />
      <p>Servidor offline ou sem resposta.</p>
    </div>
  );

  const gapTotal = Math.max(0, dados.meta_empresa - dados.faturamento_geral);
  const perc = dados.meta_empresa > 0 ? (dados.faturamento_geral / dados.meta_empresa) * 100 : 0;

  const dadosGap = dados.ranking
    .map(v => ({ name: primeiroNome(v.nome), value: Math.max(0, v.meta - v.total) }))
    .filter(x => x.value > 0)
    .sort((a,b) => b.value - a.value);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:28 }}>

      {/* Cabeçalho da aba */}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div>
          <h2 style={{ color: C.text, fontSize:22, fontWeight:800, margin:0 }}>Painel Comercial</h2>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
            <PillDuplo />
            {atualizado && (
              <span style={{ color: C.muted, fontSize:11 }}>Atualizado às {atualizado}</span>
            )}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <FiltroPeriodo
            periodo={periodo} setPeriodo={setPeriodo}
            dataInicio={dataInicio} setDataInicio={setDataInicio}
            dataFim={dataFim} setDataFim={setDataFim}
            onBuscar={buscar}
          />
          <button
            onClick={buscar}
            style={{ background: C.faint, border:`1px solid ${C.border}`, borderRadius:10, padding:'8px 10px', cursor:'pointer', color: C.muted, display:'flex', alignItems:'center' }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* KPIs principais */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:14 }}>
        <KpiCard
          icon={TrendingUp} label="Realizado Geral" accent={C.gold} destaque
          value={moeda(dados.faturamento_geral)}
          sub={`${perc.toFixed(1)}% da meta`}
        />
        <KpiCard
          icon={Target} label="Meta Empresa" accent={C.purple}
          value={moeda(dados.meta_empresa)}
          sub="Soma das metas individuais"
        />
        <KpiCard
          icon={AlertCircle} label="GAP (Falta)" accent={C.danger}
          value={moeda(gapTotal)}
          sub="Para atingir a meta"
        />
        <KpiCard
          icon={Trophy} label="Performance" accent={C.success}
          value={`${perc.toFixed(1)}%`}
          sub={`Melhor Vendedora: ${primeiroNome(dados.melhor_vendedora)}`}
        />
      </div>

      {/* KPIs por empresa */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:14 }}>
        <div style={{ background: C.card, border:`1px solid ${C.gold}33`, borderRadius:14, padding:'16px 20px' }}>
          <div style={{ color: C.gold, fontSize:11, fontWeight:700, letterSpacing:1, marginBottom:8 }}>
            ● PROHAIR
          </div>
          <div style={{ color: C.text, fontSize:22, fontWeight:800 }}>
            {moeda(dados.faturamento_prohair ?? 0)}
          </div>
        </div>
        <div style={{ background: C.card, border:`1px solid ${C.purple}33`, borderRadius:14, padding:'16px 20px' }}>
          <div style={{ color: C.purple, fontSize:11, fontWeight:700, letterSpacing:1, marginBottom:8 }}>
            ● PROGROWTH
          </div>
          <div style={{ color: C.text, fontSize:22, fontWeight:800 }}>
            {moeda(dados.faturamento_progrowth ?? 0)}
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:14 }}>

        {/* Barras */}
        <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:20, gridColumn:'span 2', minWidth:0 }}>
          <h3 style={{ color: C.text, fontWeight:700, fontSize:15, marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
            <TrendingUp size={16} color={C.gold} /> Performance Individual
          </h3>
          <div style={{ height:260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados.ranking} margin={{ top:10, right:20, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.faint} />
                <XAxis
                  dataKey="nome" tickFormatter={primeiroNome}
                  axisLine={false} tickLine={false}
                  tick={{ fill: C.muted, fontSize:12, fontWeight:600 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize:11 }} tickFormatter={compacto} />
                <Tooltip
                  cursor={{ fill:'#ffffff', opacity:0.04 }}
                  contentStyle={{ background: C.card, border:`1px solid ${C.gold}44`, borderRadius:10, color: C.text }}
                  itemStyle={{ color: C.gold }}
                  formatter={(v) => [moeda(v), 'Vendas']}
                />
                <Bar dataKey="total" radius={[6,6,0,0]} barSize={36}>
                  {dados.ranking.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? C.gold : C.faint} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut GAP */}
        <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:20 }}>
          <h3 style={{ color: C.text, fontWeight:700, fontSize:15, marginBottom:4, textAlign:'center' }}>
            Distribuição do GAP
          </h3>
          <p style={{ color: C.muted, fontSize:11, textAlign:'center', marginBottom:12, textTransform:'uppercase', letterSpacing:1 }}>
            Quanto falta por vendedora
          </p>
          <div style={{ height:220, position:'relative' }}>
            {dadosGap.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosGap} cx="50%" cy="45%"
                      innerRadius={52} outerRadius={72}
                      paddingAngle={4} dataKey="value" stroke="none"
                    >
                      {dadosGap.map((_, i) => (
                        <Cell key={i} fill={CORES_GAP[i % CORES_GAP.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:10, color: C.text }}
                      itemStyle={{ color: C.gold }}
                      formatter={(v) => [moeda(v)]}
                    />
                    <Legend
                      verticalAlign="bottom" height={36} iconType="circle"
                      formatter={(v) => <span style={{ color: C.muted, fontSize:11 }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position:'absolute', top:'38%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' }}>
                  <div style={{ color: C.muted, fontSize:10 }}>Total GAP</div>
                  <div style={{ color: C.text, fontWeight:800, fontSize:14 }}>{moeda(gapTotal)}</div>
                </div>
              </>
            ) : (
              <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
                <CheckCircle size={40} color={C.success} />
                <span style={{ color: C.success, fontWeight:800, fontSize:16 }}>Meta Batida!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ranking Elite */}
      <div>
        <h3 style={{ color: C.text, fontWeight:800, fontSize:16, marginBottom:16, borderLeft:`3px solid ${C.gold}`, paddingLeft:12 }}>
          Ranking Elite
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:14 }}>
          {dados.ranking.map((v, i) => (
            <VendedoraCard key={i} v={v} i={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function VendedoraCard({ v, i }) {
  const fotoSrc = `/fotos/${primeiroNome(v.nome).toLowerCase()}.png`;
  const isFirst = i === 0;

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${isFirst ? C.gold + '66' : C.border}`,
      borderRadius:16, padding:'20px 16px', position:'relative', overflow:'hidden',
      transition:'border-color 0.2s',
    }}>
      {isFirst && (
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${C.gold},transparent)` }} />
      )}
      <div style={{
        position:'absolute', top:8, right:8,
        background: isFirst ? C.gold : C.faint,
        color: isFirst ? '#000' : C.muted,
        borderRadius:8, padding:'2px 8px', fontSize:11, fontWeight:800,
      }}>
        #{i + 1}
      </div>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
        <div style={{
          width:68, height:68, borderRadius:'50%', padding:2,
          background: isFirst ? `linear-gradient(135deg,${C.gold},#92400e)` : C.faint,
        }}>
          <img
            src={fotoSrc}
            alt={v.nome}
            onError={e => {
              e.target.onerror = null;
              e.target.src = `https://ui-avatars.com/api/?name=${primeiroNome(v.nome)}&background=1e2035&color=f59e0b&bold=true`;
            }}
            style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover', border:`2px solid ${C.card}` }}
          />
        </div>

        <div style={{ textAlign:'center' }}>
          <div style={{ color: C.text, fontWeight:800, fontSize:15 }}>{primeiroNome(v.nome)}</div>
          <div style={{ color: isFirst ? C.gold : C.muted, fontWeight:800, fontSize:20, marginTop:2 }}>
            {moeda(v.total)}
          </div>
          <div style={{ color: C.muted, fontSize:11, marginTop:2 }}>{v.qtd} pedidos</div>
        </div>

        {v.meta > 0 && (
          <div style={{ width:'100%', marginTop:4 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color: C.muted, marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 }}>
              <span>Atingido</span>
              <span style={{ color: v.percentual >= 100 ? C.success : C.gold, fontWeight:700 }}>
                {v.percentual.toFixed(0)}%
              </span>
            </div>
            <div style={{ background: C.faint, height:6, borderRadius:99, overflow:'hidden' }}>
              <div style={{
                height:'100%', borderRadius:99,
                width:`${Math.min(v.percentual, 100)}%`,
                background: v.percentual >= 100 ? C.success : `linear-gradient(90deg,${C.gold},#f97316)`,
                transition:'width 0.8s ease',
              }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color: C.muted, marginTop:6 }}>
              <span>Meta</span>
              <span>{moeda(v.meta)}</span>
            </div>
            {v.percentual < 100 && (
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginTop:2 }}>
                <span style={{ color: C.muted }}>Falta</span>
                <span style={{ color: C.danger, fontWeight:700 }}>{moeda(v.meta - v.total)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ABA PEDIDOS ──────────────────────────────────────────────────────────────

// Linha individual de pedido (usada dentro do accordion e na lista direta)
function LinhaPedido({ p }) {
  return (
    <>
      {/* Desktop: linha de tabela */}
      <tr
        className="linha-pedido-desktop"
        onMouseEnter={e => e.currentTarget.style.background = C.faint}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        style={{ borderBottom:`1px solid ${C.border}`, transition:'background 0.1s' }}
      >
        <td style={{ padding:'11px 14px', color: C.gold, fontWeight:700, fontSize:13 }}>#{p.numero}</td>
        <td style={{ padding:'11px 14px', color: C.muted, fontSize:12, whiteSpace:'nowrap' }}>{p.data}</td>
        <td style={{ padding:'11px 14px' }}><BadgeEmpresa empresa={p.empresa} /></td>
        <td style={{ padding:'11px 14px', color: C.muted, fontSize:12, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.cliente}</td>
        <td style={{ padding:'11px 14px', color: C.text, fontWeight:700, fontSize:13, whiteSpace:'nowrap', textAlign:'right' }}>{moeda(p.valor)}</td>
        <td style={{ padding:'11px 14px' }}><BadgeStatus situacao={p.situacao} /></td>
      </tr>
      {/* Mobile: card */}
      <div className="linha-pedido-mobile" style={{
        background: C.faint, borderRadius:10, padding:'12px 14px',
        display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8,
      }}>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
            <span style={{ color: C.gold, fontWeight:800, fontSize:13 }}>#{p.numero}</span>
            <span style={{ color: C.muted, fontSize:11 }}>{p.data}</span>
            <BadgeEmpresa empresa={p.empresa} />
          </div>
          <div style={{ color: C.muted, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.cliente}</div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ color: C.text, fontWeight:800, fontSize:15 }}>{moeda(p.valor)}</div>
          <div style={{ marginTop:4 }}><BadgeStatus situacao={p.situacao} /></div>
        </div>
      </div>
    </>
  );
}

// Cabeçalho da tabela interna (só desktop)
function CabecalhoTabelaInterna({ semVendedora }) {
  const cols = semVendedora
    ? ['Nº Pedido','Data','Vendedora','Empresa','Cliente','Valor','Situação']
    : ['Nº Pedido','Data','Empresa','Cliente','Valor','Situação'];
  return (
    <tr style={{ borderBottom:`1px solid ${C.border}` }}>
      {cols.map(h => (
        <th key={h} style={{
          padding:'8px 14px', textAlign:'left',
          color: C.muted, fontSize:10, fontWeight:700, letterSpacing:0.8, textTransform:'uppercase',
          whiteSpace:'nowrap',
        }}>{h}</th>
      ))}
    </tr>
  );
}

// Accordion de uma vendedora
function GrupoVendedora({ vendedora, pedidos, abertoPorPadrao }) {
  const [aberto, setAberto] = useState(abertoPorPadrao ?? false);
  const total = pedidos.reduce((s, p) => s + p.valor, 0);
  const fotoSrc = `/fotos/${primeiroNome(vendedora).toLowerCase()}.png`;

  return (
    <div style={{
      background: C.card, border:`1px solid ${C.border}`, borderRadius:14,
      overflow:'hidden', transition:'border-color 0.2s',
    }}>
      {/* Summary — sempre visível, clicável */}
      <button
        onClick={() => setAberto(a => !a)}
        style={{
          width:'100%', background:'none', border:'none', cursor:'pointer',
          padding:'16px 20px', display:'flex', alignItems:'center', gap:14,
          textAlign:'left',
        }}
      >
        {/* Foto */}
        <img
          src={fotoSrc}
          alt={vendedora}
          onError={e => {
            e.target.onerror = null;
            e.target.src = `https://ui-avatars.com/api/?name=${primeiroNome(vendedora)}&background=1e2035&color=f59e0b&bold=true&size=64`;
          }}
          style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', border:`2px solid ${C.faint}`, flexShrink:0 }}
        />

        {/* Infos */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ color: C.text, fontWeight:800, fontSize:15 }}>{primeiroNome(vendedora)}</div>
          <div style={{ color: C.muted, fontSize:11, marginTop:2 }}>
            {vendedora.split(' ').slice(1).join(' ')}
          </div>
        </div>

        {/* Métricas */}
        <div style={{ display:'flex', alignItems:'center', gap:20, flexShrink:0 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ color: C.muted, fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>Pedidos</div>
            <div style={{ color: C.text, fontWeight:800, fontSize:16 }}>{pedidos.length}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ color: C.muted, fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>Total</div>
            <div style={{ color: C.gold, fontWeight:800, fontSize:16 }}>{moeda(total)}</div>
          </div>
          {/* Chevron */}
          <ChevronDown
            size={18}
            color={C.muted}
            style={{ transition:'transform 0.25s', transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink:0 }}
          />
        </div>
      </button>

      {/* Detalhes expandidos */}
      {aberto && (
        <div style={{ borderTop:`1px solid ${C.border}` }}>
          {/* Tabela desktop */}
          <div className="pedidos-desktop">
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><CabecalhoTabelaInterna semVendedora={false} /></thead>
              <tbody>
                {pedidos.map((p, i) => (
                  <tr
                    key={i}
                    onMouseEnter={e => e.currentTarget.style.background = C.faint}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    style={{ borderBottom:`1px solid ${C.border}`, transition:'background 0.1s' }}
                  >
                    <td style={{ padding:'10px 14px', color: C.gold, fontWeight:700, fontSize:13 }}>#{p.numero}</td>
                    <td style={{ padding:'10px 14px', color: C.muted, fontSize:12, whiteSpace:'nowrap' }}>{p.data}</td>
                    <td style={{ padding:'10px 14px' }}><BadgeEmpresa empresa={p.empresa} /></td>
                    <td style={{ padding:'10px 14px', color: C.muted, fontSize:12, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.cliente}</td>
                    <td style={{ padding:'10px 14px', color: C.text, fontWeight:700, fontSize:13, whiteSpace:'nowrap', textAlign:'right' }}>{moeda(p.valor)}</td>
                    <td style={{ padding:'10px 14px' }}><BadgeStatus situacao={p.situacao} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Cards mobile */}
          <div className="pedidos-mobile" style={{ display:'flex', flexDirection:'column', gap:8, padding:12 }}>
            {pedidos.map((p, i) => (
              <div key={i} style={{
                background: C.faint, borderRadius:10, padding:'12px 14px',
                display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8,
              }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                    <span style={{ color: C.gold, fontWeight:800, fontSize:13 }}>#{p.numero}</span>
                    <span style={{ color: C.muted, fontSize:11 }}>{p.data}</span>
                    <BadgeEmpresa empresa={p.empresa} />
                  </div>
                  <div style={{ color: C.muted, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.cliente}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ color: C.text, fontWeight:800, fontSize:15 }}>{moeda(p.valor)}</div>
                  <div style={{ marginTop:4 }}><BadgeStatus situacao={p.situacao} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Lista direta (quando uma única vendedora está filtrada)
function ListaDireta({ pedidos }) {
  return (
    <>
      {/* Desktop */}
      <div className="pedidos-desktop" style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.border}` }}>
              {['Nº Pedido','Data','Empresa','Cliente','Valor','Situação'].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', color: C.muted, fontSize:10, fontWeight:700, letterSpacing:0.8, textTransform:'uppercase', whiteSpace:'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p, i) => (
              <tr key={i}
                onMouseEnter={e => e.currentTarget.style.background = C.faint}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                style={{ borderBottom:`1px solid ${C.border}`, transition:'background 0.1s' }}
              >
                <td style={{ padding:'11px 14px', color: C.gold, fontWeight:700, fontSize:13 }}>#{p.numero}</td>
                <td style={{ padding:'11px 14px', color: C.muted, fontSize:12, whiteSpace:'nowrap' }}>{p.data}</td>
                <td style={{ padding:'11px 14px' }}><BadgeEmpresa empresa={p.empresa} /></td>
                <td style={{ padding:'11px 14px', color: C.muted, fontSize:12, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.cliente}</td>
                <td style={{ padding:'11px 14px', color: C.text, fontWeight:700, fontSize:13, whiteSpace:'nowrap', textAlign:'right' }}>{moeda(p.valor)}</td>
                <td style={{ padding:'11px 14px' }}><BadgeStatus situacao={p.situacao} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile */}
      <div className="pedidos-mobile" style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {pedidos.map((p, i) => (
          <div key={i} style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 16px', display:'flex', justifyContent:'space-between', gap:8 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                <span style={{ color: C.gold, fontWeight:800, fontSize:14 }}>#{p.numero}</span>
                <span style={{ color: C.muted, fontSize:11 }}>{p.data}</span>
                <BadgeEmpresa empresa={p.empresa} />
              </div>
              <div style={{ color: C.muted, fontSize:12 }}>{p.cliente}</div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ color: C.text, fontWeight:800, fontSize:16 }}>{moeda(p.valor)}</div>
              <div style={{ marginTop:4 }}><BadgeStatus situacao={p.situacao} /></div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function PedidosTab() {
  const [periodo, setPeriodo] = useState('Este Mês');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroVendedora, setFiltroVendedora] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  const buscar = useCallback(() => {
    setLoading(true);
    let url = `${API_BASE}/api/pedidos?periodo=${periodoParaApi(periodo)}`;
    if (periodo === 'Personalizado') {
      const ini = isoParaApi(dataInicio);
      const fim = isoParaApi(dataFim);
      if (!ini || !fim) { setLoading(false); return; }
      url += `&data_inicio=${ini}&data_fim=${fim}`;
    }
    if (filtroVendedora) url += `&vendedora=${encodeURIComponent(filtroVendedora)}`;
    if (filtroEmpresa)   url += `&empresa=${encodeURIComponent(filtroEmpresa)}`;

    fetch(url)
      .then(r => r.json())
      .then(setDados)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [periodo, dataInicio, dataFim, filtroVendedora, filtroEmpresa]);

  useEffect(() => { buscar(); }, [periodo]);

  // Vendedoras únicas presentes nos resultados (para o select)
  const vendedoras = dados
    ? [...new Set(dados.pedidos.map(p => p.vendedora))].sort()
    : [];

  // Agrupar pedidos por vendedora
  const grupos = dados
    ? dados.pedidos.reduce((acc, p) => {
        if (!acc[p.vendedora]) acc[p.vendedora] = [];
        acc[p.vendedora].push(p);
        return acc;
      }, {})
    : {};

  // Ordenar grupos por total decrescente
  const gruposOrdenados = Object.entries(grupos).sort(
    ([, a], [, b]) =>
      b.reduce((s, p) => s + p.valor, 0) - a.reduce((s, p) => s + p.valor, 0)
  );

  const umaVendedora = filtroVendedora !== '';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <style>{`
        @media(min-width:768px){.pedidos-desktop{display:block}.pedidos-mobile{display:none!important}}
        @media(max-width:767px){.pedidos-desktop{display:none!important}.pedidos-mobile{display:flex!important}}
      `}</style>

      {/* ── FILTROS SEMPRE VISÍVEIS ── */}
      <div style={{
        background: C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:'16px 20px',
        display:'flex', flexDirection:'column', gap:14,
      }}>
        {/* Linha 1 — título + período */}
        <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div>
            <h2 style={{ color: C.text, fontSize:20, fontWeight:800, margin:0 }}>Pedidos</h2>
            {dados && !loading && (
              <span style={{ color: C.text, fontSize:12 }}>
                {dados.total} pedido{dados.total !== 1 ? 's' : ''} · {moeda(dados.valor_total)}
              </span>
            )}
          </div>
          <FiltroPeriodo
            periodo={periodo} setPeriodo={setPeriodo}
            dataInicio={dataInicio} setDataInicio={setDataInicio}
            dataFim={dataFim} setDataFim={setDataFim}
            onBuscar={buscar}
          />
        </div>

        {/* Divisor */}
        <div style={{ height:1, background: C.border }} />

        {/* Linha 2 — filtros adicionais */}
        <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-end', gap:12 }}>
          <div style={{ flex:'1 1 160px' }}>
            <label style={{ color: C.muted, fontSize:10, fontWeight:700, letterSpacing:0.8, textTransform:'uppercase', display:'block', marginBottom:6 }}>
              Vendedora
            </label>
            <select
              value={filtroVendedora}
              onChange={e => setFiltroVendedora(e.target.value)}
              style={{ background: C.faint, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', color: C.text, fontSize:13, width:'100%' }}
            >
              <option value="">Todas</option>
              {vendedoras.map(v => (
                <option key={v} value={v}>{primeiroNome(v)}</option>
              ))}
            </select>
          </div>

          <div style={{ flex:'1 1 140px' }}>
            <label style={{ color: C.muted, fontSize:10, fontWeight:700, letterSpacing:0.8, textTransform:'uppercase', display:'block', marginBottom:6 }}>
              Empresa
            </label>
            <select
              value={filtroEmpresa}
              onChange={e => setFiltroEmpresa(e.target.value)}
              style={{ background: C.faint, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', color: C.text, fontSize:13, width:'100%' }}
            >
              <option value="">Todas</option>
              <option value="ProHair">ProHair</option>
              <option value="ProGrowth">ProGrowth</option>
            </select>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button
              onClick={buscar}
              style={{ background: C.gold, color:'#000', border:'none', borderRadius:8, padding:'9px 22px', cursor:'pointer', fontWeight:800, fontSize:13 }}
            >
              Buscar
            </button>
            {(filtroVendedora || filtroEmpresa) && (
              <button
                onClick={() => { setFiltroVendedora(''); setFiltroEmpresa(''); }}
                style={{ background:'transparent', color: C.muted, border:`1px solid ${C.border}`, borderRadius:8, padding:'9px 14px', cursor:'pointer', fontSize:12 }}
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      {loading ? (
        <Spinner />
      ) : !dados ? (
        <div style={{ color: C.danger, textAlign:'center', padding:'3rem' }}>Erro ao carregar pedidos.</div>
      ) : dados.pedidos.length === 0 ? (
        <div style={{ textAlign:'center', color: C.muted, padding:'4rem', background: C.card, borderRadius:16, border:`1px solid ${C.border}` }}>
          <ListOrdered size={40} style={{ marginBottom:12, opacity:0.4 }} />
          <p style={{ margin:0, fontWeight:600 }}>Nenhum pedido encontrado para este período.</p>
        </div>
      ) : umaVendedora ? (
        // ── Vendedora única: lista direta ──
        <ListaDireta pedidos={dados.pedidos} />
      ) : (
        // ── Múltiplas vendedoras: accordion por grupo ──
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {gruposOrdenados.map(([vendedora, pedidos]) => (
            <GrupoVendedora
              key={vendedora}
              vendedora={vendedora}
              pedidos={pedidos}
              abertoPorPadrao={gruposOrdenados.length === 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id:'dashboard', label:'Dashboard', icon: LayoutDashboard },
    { id:'pedidos',   label:'Pedidos',   icon: ListOrdered },
  ];

  return (
    <div style={{ minHeight:'100vh', background: C.bg, color: C.text, fontFamily:'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.bg}}
        select option{background:${C.card}}
        @media(max-width:767px){
          .sidebar{display:none!important}
          .main-content{padding-bottom:70px!important}
          .bottom-nav{display:flex!important}
        }
        @media(min-width:768px){
          .bottom-nav{display:none!important}
          .sidebar{display:flex!important}
        }
      `}</style>

      <div style={{ display:'flex', minHeight:'100vh' }}>

        {/* SIDEBAR DESKTOP */}
        <aside className="sidebar" style={{
          width:220, background: C.surface, borderRight:`1px solid ${C.border}`,
          flexDirection:'column', flexShrink:0, position:'sticky', top:0, height:'100vh',
        }}>
          <div style={{ padding:'24px 20px', borderBottom:`1px solid ${C.border}` }}>
            <img
                src="/logo-prohair.png"
                alt="ProHair"
                style={{ height: 40, objectFit: 'contain' }}
                />
          </div>

          <nav style={{ padding:'16px 12px', display:'flex', flexDirection:'column', gap:4 }}>
            {tabs.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'10px 14px', borderRadius:12, border:'none', cursor:'pointer',
                    background: active ? C.gold + '18' : 'transparent',
                    color: active ? C.gold : C.muted,
                    fontWeight: active ? 700 : 500,
                    fontSize:14, textAlign:'left', transition:'all 0.15s',
                    borderLeft: active ? `3px solid ${C.gold}` : '3px solid transparent',
                  }}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div style={{ marginTop:'auto', padding:'16px 20px', borderTop:`1px solid ${C.border}` }}>
            <PillDuplo />
            <div style={{ color: C.muted, fontSize:10, marginTop:6 }}>Dados consolidados</div>
          </div>
        </aside>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="main-content" style={{ flex:1, overflowX:'hidden', padding:'24px 20px', minWidth:0 }}>
          {activeTab === 'dashboard' ? <DashboardTab /> : <PedidosTab />}
        </main>
      </div>

      {/* BOTTOM NAV MOBILE */}
      <nav className="bottom-nav" style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:100,
        background: C.surface, borderTop:`1px solid ${C.border}`,
        justifyContent:'space-around', alignItems:'center', height:60,
        backdropFilter:'blur(20px)',
      }}>
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                padding:'8px 0', background:'none', border:'none', cursor:'pointer',
                color: active ? C.gold : C.muted, transition:'color 0.15s',
              }}
            >
              <tab.icon size={22} />
              <span style={{ fontSize:10, fontWeight:700 }}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}