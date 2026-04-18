import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import API from '../api'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [urls, setUrls] = useState([])
  const [stats, setStats] = useState({totalUrls:0,totalClicks:0,mostClickedCount:0})
  const [form, setForm] = useState({originalUrl:'',customCode:''})
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    try {
      const [urlRes, statRes] = await Promise.all([API.get('/api/urls'), API.get('/api/urls/stats')])
      setUrls(urlRes.data.urls || [])
      setStats(statRes.data.stats || {})
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data')
    } finally { setLoading(false) }
  }

  const addUrl = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!form.originalUrl.trim()) return setError('Please enter a URL')
    setAdding(true)
    try {
      await API.post('/api/urls', form)
      setForm({originalUrl:'',customCode:''})
      setSuccess('URL shortened!')
      setTimeout(()=>setSuccess(''),3000)
      await loadAll()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to shorten URL')
    } finally { setAdding(false) }
  }

  const deleteUrl = async (id) => {
    if (!window.confirm('Delete this short URL?')) return
    try {
      await API.delete(`/api/urls/${id}`)
      setSuccess('Deleted!')
      setTimeout(()=>setSuccess(''),2000)
      await loadAll()
    } catch (err) { setError(err.response?.data?.message || 'Delete failed') }
  }

  const copyUrl = (url, id) => {
    navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(()=>setCopied(''),2000)
  }

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.brand}>🔗 URL Shortener</div>
        <div style={s.navRight}>
          <span style={s.userName}>👤 {user?.name}</span>
          <button style={s.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </nav>

      <div style={s.container}>
        <div style={s.statsRow}>
          {[{label:'Total URLs',val:stats.totalUrls||0,icon:'🔗'},{label:'Total Clicks',val:stats.totalClicks||0,icon:'👆'},{label:'Top Link Clicks',val:stats.mostClickedCount||0,icon:'🏆'}].map(st=>(
            <div key={st.label} style={s.statCard}>
              <div style={s.statIcon}>{st.icon}</div>
              <div style={s.statVal}>{st.val}</div>
              <div style={s.statLabel}>{st.label}</div>
            </div>
          ))}
        </div>

        {error && <div style={s.errBanner}>❌ {error} <button style={s.dimBtn} onClick={()=>setError('')}>✕</button></div>}
        {success && <div style={s.sucBanner}>✅ {success}</div>}

        <div style={s.card}>
          <h2 style={s.cardTitle}>Shorten a URL</h2>
          <form onSubmit={addUrl}>
            <div style={s.formRow}>
              <input style={{...s.input,flex:3}} type="url" placeholder="https://www.example.com/very/long/url..." value={form.originalUrl} onChange={e=>setForm({...form,originalUrl:e.target.value})}/>
              <input style={{...s.input,flex:1}} type="text" placeholder="Custom code (optional)" value={form.customCode} onChange={e=>setForm({...form,customCode:e.target.value})} maxLength={20}/>
              <button style={s.submitBtn} disabled={adding}>{adding?'Shortening...':'⚡ Shorten'}</button>
            </div>
          </form>
        </div>

        <div style={s.card}>
          <h2 style={s.cardTitle}>Your URLs <span style={s.badge}>{urls.length}</span></h2>
          {loading ? (
            <div style={s.empty}>Loading your URLs...</div>
          ) : urls.length === 0 ? (
            <div style={s.empty}><div style={{fontSize:'48px',marginBottom:'12px'}}>🔗</div><p>No URLs yet. Shorten your first URL above!</p></div>
          ) : (
            urls.map(url=>(
              <div key={url._id} style={s.urlCard}>
                <div style={s.urlInfo}>
                  <div style={s.shortUrl}>{url.shortUrl}</div>
                  <div style={s.origUrl} title={url.originalUrl}>{url.originalUrl.length>70?url.originalUrl.substring(0,70)+'...':url.originalUrl}</div>
                  <div style={s.meta}>
                    <span style={s.clickBadge}>👆 {url.clicks} clicks</span>
                    <span style={s.dateBadge}>📅 {new Date(url.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={s.actions}>
                  <button style={{...s.actBtn,background:copied===url._id?'#059669':'#1e1e2e'}} onClick={()=>copyUrl(url.shortUrl,url._id)}>{copied===url._id?'✅ Copied!':'📋 Copy'}</button>
                  <button style={{...s.actBtn,background:'#7f1d1d',color:'#fca5a5'}} onClick={()=>deleteUrl(url._id)}>🗑 Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  page:{minHeight:'100vh'},
  nav:{background:'#13131a',borderBottom:'1px solid #1e1e2e',padding:'0 24px',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between'},
  brand:{fontWeight:'bold',fontSize:'18px',color:'#a78bfa'},
  navRight:{display:'flex',alignItems:'center',gap:'12px'},
  userName:{fontSize:'14px',color:'#94a3b8'},
  logoutBtn:{background:'transparent',color:'#f87171',border:'1px solid #f87171',padding:'6px 14px',borderRadius:'6px',cursor:'pointer',fontSize:'13px'},
  container:{maxWidth:'900px',margin:'24px auto',padding:'0 16px'},
  statsRow:{display:'flex',gap:'16px',marginBottom:'24px',flexWrap:'wrap'},
  statCard:{flex:'1',minWidth:'140px',background:'#13131a',border:'1px solid #1e1e2e',borderRadius:'12px',padding:'20px',textAlign:'center'},
  statIcon:{fontSize:'28px',marginBottom:'8px'},
  statVal:{fontSize:'28px',fontWeight:'bold',color:'#a78bfa',marginBottom:'4px'},
  statLabel:{fontSize:'12px',color:'#64748b'},
  errBanner:{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#f87171',padding:'14px 16px',borderRadius:'8px',marginBottom:'16px',fontSize:'14px',display:'flex',justifyContent:'space-between',alignItems:'center'},
  dimBtn:{background:'transparent',border:'none',color:'#f87171',cursor:'pointer',fontSize:'16px'},
  sucBanner:{background:'rgba(5,150,105,0.1)',border:'1px solid rgba(5,150,105,0.3)',color:'#34d399',padding:'14px 16px',borderRadius:'8px',marginBottom:'16px',fontSize:'14px'},
  card:{background:'#13131a',border:'1px solid #1e1e2e',borderRadius:'12px',padding:'24px',marginBottom:'24px'},
  cardTitle:{fontSize:'16px',marginBottom:'20px',paddingBottom:'12px',borderBottom:'1px solid #1e1e2e',display:'flex',alignItems:'center',gap:'8px'},
  badge:{background:'#1e1e2e',color:'#64748b',padding:'2px 8px',borderRadius:'20px',fontSize:'12px'},
  formRow:{display:'flex',gap:'10px',flexWrap:'wrap'},
  input:{flex:1,minWidth:'160px',background:'#0f0f17',border:'1px solid #1e1e2e',color:'#e2e8f0',padding:'10px 14px',borderRadius:'8px',fontSize:'14px',outline:'none'},
  submitBtn:{background:'#7c3aed',color:'#fff',border:'none',padding:'10px 20px',borderRadius:'8px',fontSize:'14px',fontWeight:'bold',cursor:'pointer',whiteSpace:'nowrap'},
  empty:{textAlign:'center',padding:'48px',color:'#475569',fontSize:'14px'},
  urlCard:{display:'flex',alignItems:'center',gap:'16px',padding:'16px',background:'#0f0f17',borderRadius:'8px',marginBottom:'10px',border:'1px solid #1e1e2e'},
  urlInfo:{flex:1,minWidth:0},
  shortUrl:{fontSize:'15px',fontWeight:'bold',color:'#a78bfa',marginBottom:'4px',wordBreak:'break-all'},
  origUrl:{fontSize:'13px',color:'#64748b',marginBottom:'6px',wordBreak:'break-all'},
  meta:{display:'flex',gap:'12px',flexWrap:'wrap'},
  clickBadge:{fontSize:'12px',color:'#34d399',background:'rgba(5,150,105,0.1)',padding:'2px 8px',borderRadius:'4px'},
  dateBadge:{fontSize:'12px',color:'#64748b'},
  actions:{display:'flex',gap:'8px',flexWrap:'wrap'},
  actBtn:{padding:'8px 14px',borderRadius:'6px',border:'none',cursor:'pointer',fontSize:'13px',color:'#e2e8f0',whiteSpace:'nowrap'}
}
