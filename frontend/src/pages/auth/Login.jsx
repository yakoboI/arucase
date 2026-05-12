import { useState, useCallback, useId } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/toast';
import { useSound } from '../../utils/useSound';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const formId = useId();
  const errorId = `${formId}-error`;
  const { login } = useAuth();
  const navigate = useNavigate();
  const { playLogin } = useSound();

  const clearFormError = useCallback(() => {
    setFormError('');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = username.trim();
    const pass = password;
    if (!user || !pass) {
      setFormError('Enter your username and password.');
      toast.error('Enter your username and password.');
      return;
    }

    setFormError('');
    setLoading(true);
    try {
      const result = await login(user, pass);
      if (result.success) {
        toast.success('Signed in successfully.');
        try {
          playLogin();
        } catch {
          /* sound is optional */
        }
        navigate('/admin');
      } else {
        const msg = result.error || 'Sign-in failed. Check your credentials and try again.';
        setFormError(msg);
        toast.error(msg);
      }
    } catch (err) {
      let msg = 'Something went wrong. Please try again.';
      if (err?.name === 'TypeError' && String(err?.message || '').includes('fetch')) {
        msg = 'Network error. Check your connection and try again.';
      } else if (err?.code === 'ECONNABORTED') {
        msg = 'Request timed out. Please try again.';
      } else if (err?.message) {
        msg = String(err.message);
      }
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <a href="#staff-login-main" className="login-skip-link">
        Skip to sign-in form
      </a>

      <Link to="/" className="back-button">
        <i className="fas fa-arrow-left" aria-hidden="true" />
        <span>Back to public site</span>
      </Link>

      <main id="staff-login-main" className="login-container" tabIndex={-1}>
        <header className="login-header">
          <p className="login-eyebrow">Arusha Catholic Seminary</p>
          <h1 id={`${formId}-title`}>Staff sign in</h1>
          <p className="login-subtitle">School management system — authorized staff only.</p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="login-form"
          aria-labelledby={`${formId}-title`}
          aria-describedby={formError ? errorId : undefined}
          noValidate
        >

          {formError ? (
            <div id={errorId} className="form-error" role="alert">
              {formError}
            </div>
          ) : null}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <div className="input-with-icon">
              <i className="fas fa-user input-icon" aria-hidden="true" />
              <input
                type="text"
                id="username"
                name="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  clearFormError();
                }}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                required
                disabled={loading}
                className="input-with-icon-field"
                aria-invalid={Boolean(formError)}
                aria-required="true"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon input-with-icon--password">
              <i className="fas fa-lock input-icon" aria-hidden="true" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFormError();
                }}
                autoComplete="current-password"
                required
                disabled={loading}
                className="input-with-icon-field input-with-icon-field--password"
                aria-invalid={Boolean(formError)}
                aria-required="true"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password as plain text'}
                aria-pressed={showPassword}
                disabled={loading}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin" aria-hidden="true" />
                <span>Signing in…</span>
                <span className="sr-only">Please wait</span>
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </main>
    </div>
  );
};

export default Login;
