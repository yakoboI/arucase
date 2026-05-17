import { useState, useId } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/toast';
import { useSound } from '../../utils/useSound';
import { publicAPI } from '../../services/public';
import { resolveStaticUrl } from '../../utils/backendUrl';
import KeyringIcon from '../../components/icons/KeyringIcon';
import './Login.css';

const DEFAULT_LOGO = '/uploads/photos/9749b4af-7e1c-454b-a482-37a0f64162f1.jpg';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const formId = useId();
  const errorId = `${formId}-error`;
  const titleId = `${formId}-title`;
  const { login } = useAuth();
  const navigate = useNavigate();
  const { playLogin } = useSound();

  const { data: homepageData } = useQuery({
    queryKey: ['homepage'],
    queryFn: async () => {
      try {
        const res = await publicAPI.getHomepage();
        return res.data;
      } catch {
        return { settings: {} };
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const logoUrl = resolveStaticUrl(
    homepageData?.settings?.school_logo || DEFAULT_LOGO
  );

  const reportError = (msg) => {
    setFormError(msg);
    toast.error(msg);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = username.trim();
    const pass = password;
    if (!user || !pass) {
      reportError('Enter your username and password.');
      return;
    }

    setFormError('');
    setLoading(true);
    try {
      const result = await login(user, pass);
      if (!result || typeof result !== 'object') {
        reportError('Sign-in failed. Unexpected response.');
        return;
      }
      if (result.success) {
        toast.success('Signed in successfully.');
        try {
          playLogin();
        } catch {
          /* optional */
        }
        navigate('/admin');
        return;
      }
      reportError(result.error || 'Sign-in failed. Check your credentials and try again.');
    } catch (err) {
      let msg = 'Something went wrong. Please try again.';
      if (err?.name === 'TypeError' && String(err?.message || '').includes('fetch')) {
        msg = 'Network error. Check your connection and try again.';
      } else if (err?.code === 'ECONNABORTED') {
        msg = 'Request timed out. Please try again.';
      } else if (err?.message) {
        msg = String(err.message);
      }
      reportError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <a href="#staff-login-main" className="login-skip-link">
        Skip to sign-in form
      </a>

      <div className="login-card-stack">
        <main id="staff-login-main" className="login-container" tabIndex={-1}>
          <header className="login-header">
            <div className="login-logo-wrap">
              <img
                src={logoUrl}
                alt="Arusha Catholic Seminary school logo"
                className="login-logo"
                width={88}
                height={88}
                decoding="async"
              />
            </div>
            <p className="login-eyebrow">Arusha Catholic Seminary</p>
            <h1 id={titleId}>Staff sign in</h1>
          </header>

          <form
            onSubmit={handleSubmit}
            className="login-form"
            aria-labelledby={titleId}
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
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setFormError('');
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
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <span className="input-icon input-icon--keyring" aria-hidden="true">
                  <KeyringIcon />
                </span>
                <div className="input-field-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFormError('');
                    }}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    className="input-with-icon-field"
                    aria-invalid={Boolean(formError)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    disabled={loading}
                  >
                    <i
                      className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit"
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

        <Link to="/" className="back-button">
          <i className="fas fa-arrow-left" aria-hidden="true" />
          <span>Back to public site</span>
        </Link>
      </div>
    </div>
  );
};

export default Login;
