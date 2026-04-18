import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../api'

export default function Login() {
  const [form, setForm] = useState({ email:'', password:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await API.post('/api/auth/login', form)
      login(res.data.user, res.data.token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.icon}>🔗</div>
        <h1 style={s.title}>URL Shortener</h1>
        <p style={s.sub}>Sign in to your account</p>
        {error && <div style={s.err}>{error}</div>}
        <form onSubmit={handleSubmit}>
          {[{key:'email',label:'Email',type:'email',ph:'you@example.com'},{key:'password',label:'Password',type:'password',ph:'Your password'}].map(f=>(
            <div key={f.key} style={s.field}>
              <label style={s.label}>{f.label}</label>
              <input style={s.input} type={f.type} placeholder={f.ph} value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})} required/>
            </div>
          ))}
          <button style={s.btn} disabled={loading}>{loading?'Signing in...':'Sign in'}</button>
        </form>
        <p style={s.footer}>No account? <Link to="/register">Create one</Link></p>
      </div>
    </div>
  )
}

const s = {
  page:{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'},
  card:{background:'#13131a',border:'1px solid #1e1e2e',borderRadius:'16px',padding:'40px',width:'100%',maxWidth:'400px'},
  icon:{fontSize:'40px',textAlign:'center',marginBottom:'8px'},
  title:{fontSize:'24px',fontWeight:'bold',textAlign:'center',marginBottom:'4px',color:'#a78bfa'},
  sub:{color:'#64748b',textAlign:'center',marginBottom:'24px',fontSize:'14px'},
  err:{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#f87171',padding:'12px',borderRadius:'8px',marginBottom:'16px',fontSize:'14px'},
  field:{marginBottom:'16px'},
  label:{display:'block',marginBottom:'6px',fontSize:'14px',color:'#94a3b8'},
  input:{width:'100%',background:'#0f0f17',border:'1px solid #1e1e2e',color:'#e2e8f0',padding:'10px 14px',borderRadius:'8px',fontSize:'14px',outline:'none'},
  btn:{width:'100%',background:'#7c3aed',color:'#fff',border:'none',padding:'12px',borderRadius:'8px',fontSize:'15px',fontWeight:'bold',cursor:'pointer',marginTop:'8px'},
  footer:{textAlign:'center',marginTop:'20px',fontSize:'14px',color:'#64748b'}
}
