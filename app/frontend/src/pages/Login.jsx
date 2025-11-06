import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.success) navigate('/dashboard');
    else setErr(res.error || 'Erreur de connexion');
  };

  return (
    <form onSubmit={submit}>
      {err && <div style={{color:'red', marginBottom:8}}>{err}</div>}
      <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email" required />
      <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Mot de passe" required />
      <button type="submit" disabled={loading}>{loading ? 'Connexion...' : 'Se connecter'}</button>
    </form>
  );
}
