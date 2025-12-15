import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STATIC_LOGIN } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formState, setFormState] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = login(formState.email.trim(), formState.password);

    if (result.ok) {
      navigate('/dashboard', { replace: true });
      return;
    }

    setError(result.message);
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Dashboard Login</h1>
        <p className="muted">
          Demo credentials: <strong>{STATIC_LOGIN.email}</strong> / <strong>{STATIC_LOGIN.password}</strong>
        </p>

        <label>
          Email
          <input
            type="email"
            value={formState.email}
            onChange={(event) => setFormState({ ...formState, email: event.target.value })}
            placeholder="admin@deshboard.com"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={formState.password}
            onChange={(event) => setFormState({ ...formState, password: event.target.value })}
            placeholder="••••••••"
            required
          />
        </label>

        {error ? <p className="error">{error}</p> : null}

        <button type="submit">Log in</button>
      </form>
    </div>
  );
}

















