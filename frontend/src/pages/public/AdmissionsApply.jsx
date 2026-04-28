import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '../../utils/toast';
import PublicLayout from '../../components/layout/PublicLayout';
import { publicAPI } from '../../services/public';
import './AdmissionsApply.css';

const LS_TOKEN = 'applicant_token';
const LS_USER = 'applicant_user';

function getApplicantToken() {
  return localStorage.getItem(LS_TOKEN) || '';
}

function setApplicantSession({ token, applicant }) {
  localStorage.setItem(LS_TOKEN, token);
  localStorage.setItem(LS_USER, JSON.stringify(applicant || {}));
}

function clearApplicantSession() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_USER);
}

const AdmissionsApply = () => {
  const [mode, setMode] = useState('register'); // register | login
  const [loading, setLoading] = useState(false);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [me, setMe] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_USER) || 'null');
    } catch {
      return null;
    }
  });

  const [registerForm, setRegisterForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: '',
  });
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [application, setApplication] = useState(null);
  const [applicationForm, setApplicationForm] = useState({
    education_level: '',
    is_transfer: false,
    previous_school: '',
    desired_entry: '',
    region: '',
    district: '',
    message: '',
  });

  const statusLabel = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'IMEKUBALIWA';
    if (s === 'rejected') return 'IMEKATALIWA';
    return 'INASUBIRI';
  };

  const statusTone = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'status-approved';
    if (s === 'rejected') return 'status-rejected';
    return 'status-pending';
  };

  const fetchMyApplication = async () => {
    const token = getApplicantToken();
    if (!token) return;

    setApplicationLoading(true);
    try {
      const res = await publicAPI.getMyAdmissionApplication(token);
      const app = res.data?.application || null;
      setApplication(app);
      if (app) {
        setApplicationForm((prev) => ({
          ...prev,
          education_level: app.education_level || '',
          is_transfer: Boolean(app.is_transfer),
          previous_school: app.previous_school || '',
          desired_entry: app.desired_entry || '',
          region: app.region || '',
          district: app.district || '',
          message: app.message || '',
        }));
      }
    } catch (err) {
      // ignore if none exists
    } finally {
      setApplicationLoading(false);
    }
  };

  useEffect(() => {
    if (!getApplicantToken()) return;
    // Explicit catch: avoids rare unhandled rejections if async flow changes
    void fetchMyApplication().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerForm.full_name.trim()) return toast.error('Tafadhali andika majina yako kamili.');
    if (!registerForm.email.trim()) return toast.error('Tafadhali andika barua pepe.');
    if (!registerForm.phone.trim()) return toast.error('Tafadhali andika namba ya simu.');
    if (!registerForm.password) return toast.error('Tafadhali weka nenosiri.');
    if (registerForm.password.length < 6) return toast.error('Nenosiri liwe angalau herufi 6.');
    if (registerForm.password !== registerForm.confirm_password) return toast.error('Nenosiri halifanani.');

    setLoading(true);
    try {
      const res = await publicAPI.registerAdmissionApplicant({
        full_name: registerForm.full_name.trim(),
        email: registerForm.email.trim(),
        phone: registerForm.phone.trim(),
        password: registerForm.password,
      });
      const token = res.data?.token;
      const applicant = res.data?.applicant;
      if (!token) throw new Error('No token returned');
      setApplicantSession({ token, applicant });
      setMe(applicant);
      toast.success('Akaunti imetengenezwa. Sasa jaza fomu ya maombi.');
      await fetchMyApplication();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Imeshindikana kujisajili. Jaribu tena.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.identifier.trim()) return toast.error('Andika barua pepe au namba ya simu.');
    if (!loginForm.password) return toast.error('Andika nenosiri.');

    setLoading(true);
    try {
      const res = await publicAPI.loginAdmissionApplicant({
        identifier: loginForm.identifier.trim(),
        password: loginForm.password,
      });
      const token = res.data?.token;
      const applicant = res.data?.applicant;
      if (!token) throw new Error('No token returned');
      setApplicantSession({ token, applicant });
      setMe(applicant);
      toast.success('Umefanikiwa kuingia.');
      await fetchMyApplication();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Imeshindikana kuingia. Hakiki taarifa zako.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearApplicantSession();
    setMe(null);
    setApplication(null);
    setMode('login');
    toast.info('Umetoka kwenye akaunti.');
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    const token = getApplicantToken();
    if (!token) return toast.error('Tafadhali ingia kwanza.');

    if (!applicationForm.education_level) return toast.error('Chagua kiwango cha elimu.');
    if (!applicationForm.desired_entry.trim()) return toast.error('Andika unataka kujiunga darasa/kidato gani.');

    const alreadyResponded =
      Boolean(application?.admin_feedback) ||
      (application?.status && (application.status || '').toLowerCase() !== 'pending');

    if (alreadyResponded) {
      const ok = window.confirm(
        'Taarifa hizi tayari zimeshajibiwa na ofisi ya udahili. Unataka kutuma maombi hayo hayo tena?'
      );
      if (!ok) return;
    }

    setLoading(true);
    try {
      await publicAPI.submitAdmissionApplication(token, {
        education_level: applicationForm.education_level,
        is_transfer: Boolean(applicationForm.is_transfer),
        previous_school: applicationForm.previous_school.trim() || null,
        desired_entry: applicationForm.desired_entry.trim(),
        region: applicationForm.region.trim() || null,
        district: applicationForm.district.trim() || null,
        message: applicationForm.message.trim() || null,
      });
      toast.success('Maombi yametumwa. Subiri majibu kutoka ofisi ya udahili.');
      await fetchMyApplication();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Imeshindikana kutuma maombi. Jaribu tena.');
    } finally {
      setLoading(false);
    }
  };

  const tokenNow = getApplicantToken();

  return (
    <PublicLayout>
      <div className="admissions-apply-page">
        <div className="admissions-apply-topbar">
          <Link to="/admissions" className="back-link">
            <i className="fas fa-arrow-left" /> Rudi Udahili
          </Link>

          {tokenNow ? (
            <div className="topbar-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => fetchMyApplication()}
                disabled={applicationLoading}
              >
                {applicationLoading ? 'Inapakia…' : 'Sasisha Hali'}
              </button>
              <button type="button" className="logout-link" onClick={handleLogout}>
                Toka
              </button>
            </div>
          ) : null}
        </div>

        <div className="apply-card">
          <div className="apply-hero">
            <div className="apply-hero-title">
              <h1>BOFYA HAPA KUJISAJILI</h1>
              <p className="subtitle">
                Kwa wanafunzi wanaotaka kujiunga au kuhamia seminari. Utatengeneza akaunti kwa <strong>barua pepe</strong> na{' '}
                <strong>namba ya simu</strong>, kisha utajaza fomu ya maombi na kufuatilia majibu hapa.
              </p>
            </div>

            <div className="steps">
              <div className={`step ${tokenNow ? 'done' : 'active'}`}>
                <div className="step-dot">1</div>
                <div className="step-text">
                  <div className="step-title">Sajili / Ingia</div>
                  <div className="step-subtitle">Tumia barua pepe au simu</div>
                </div>
              </div>
              <div className={`step ${tokenNow ? 'active' : ''}`}>
                <div className="step-dot">2</div>
                <div className="step-text">
                  <div className="step-title">Jaza Maombi</div>
                  <div className="step-subtitle">Eleza hali yako</div>
                </div>
              </div>
              <div className={`step ${application?.status && tokenNow ? 'active' : ''}`}>
                <div className="step-dot">3</div>
                <div className="step-text">
                  <div className="step-title">Subiri Majibu</div>
                  <div className="step-subtitle">Tazama hali na maoni</div>
                </div>
              </div>
            </div>
          </div>

          {!tokenNow ? (
            <>
              <div className="mode-tabs">
                <button
                  type="button"
                  className={mode === 'register' ? 'active' : ''}
                  onClick={() => setMode('register')}
                >
                  Sajili
                </button>
                <button
                  type="button"
                  className={mode === 'login' ? 'active' : ''}
                  onClick={() => setMode('login')}
                >
                  Ingia
                </button>
              </div>

              {mode === 'register' ? (
                <form className="form" onSubmit={handleRegister}>
                  <label>
                    Majina kamili
                    <input
                      value={registerForm.full_name}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, full_name: e.target.value }))}
                      placeholder="Mfano: Juma Ali Mussa"
                      autoComplete="name"
                    />
                    <small className="field-hint">Andika majina kama yalivyo kwenye vyeti/cheti.</small>
                  </label>
                  <label>
                    Barua pepe
                    <input
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="mfano: jina@mtandao.tz"
                      autoComplete="email"
                    />
                    <small className="field-hint">Tutatumia barua pepe hii kwa mawasiliano.</small>
                  </label>
                  <label>
                    Namba ya simu
                    <input
                      value={registerForm.phone}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+255..."
                      autoComplete="tel"
                      inputMode="tel"
                    />
                    <small className="field-hint">Mfano: +255712345678 (hakikisha iko sahihi).</small>
                  </label>
                  <label>
                    Nenosiri
                    <div className="input-with-action">
                      <input
                        type={showRegisterPassword ? 'text' : 'password'}
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
                        autoComplete="new-password"
                        placeholder="Angalau herufi 6"
                      />
                      <button
                        type="button"
                        className="input-action"
                        onClick={() => setShowRegisterPassword((v) => !v)}
                        aria-label={showRegisterPassword ? 'Ficha nenosiri' : 'Onyesha nenosiri'}
                      >
                        {showRegisterPassword ? 'FICHA' : 'ONESHA'}
                      </button>
                    </div>
                  </label>
                  <label>
                    Rudia nenosiri
                    <div className="input-with-action">
                      <input
                        type={showRegisterConfirmPassword ? 'text' : 'password'}
                        value={registerForm.confirm_password}
                        onChange={(e) => setRegisterForm((p) => ({ ...p, confirm_password: e.target.value }))}
                        autoComplete="new-password"
                        placeholder="Rudia nenosiri"
                      />
                      <button
                        type="button"
                        className="input-action"
                        onClick={() => setShowRegisterConfirmPassword((v) => !v)}
                        aria-label={showRegisterConfirmPassword ? 'Ficha nenosiri' : 'Onyesha nenosiri'}
                      >
                        {showRegisterConfirmPassword ? 'FICHA' : 'ONESHA'}
                      </button>
                    </div>
                  </label>

                  <button className="primary" disabled={loading} type="submit">
                    {loading ? 'Inatuma...' : 'Sajili Akaunti'}
                  </button>
                  <div className="hint">
                    Tayari una akaunti? <button type="button" className="linkish" onClick={() => setMode('login')}>Ingia hapa</button>.
                  </div>
                </form>
              ) : (
                <form className="form" onSubmit={handleLogin}>
                  <label>
                    Barua pepe au namba ya simu
                    <input
                      value={loginForm.identifier}
                      onChange={(e) => setLoginForm((p) => ({ ...p, identifier: e.target.value }))}
                      placeholder="barua pepe au namba ya simu (+255…)"
                      autoComplete="username"
                    />
                  </label>
                  <label>
                    Nenosiri
                    <div className="input-with-action">
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginForm.password}
                        onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="input-action"
                        onClick={() => setShowLoginPassword((v) => !v)}
                        aria-label={showLoginPassword ? 'Ficha nenosiri' : 'Onyesha nenosiri'}
                      >
                        {showLoginPassword ? 'FICHA' : 'ONESHA'}
                      </button>
                    </div>
                  </label>
                  <button className="primary" disabled={loading} type="submit">
                    {loading ? 'Inaingia...' : 'Ingia'}
                  </button>
                  <div className="hint">
                    Huna akaunti? <button type="button" className="linkish" onClick={() => setMode('register')}>Sajili hapa</button>.
                  </div>
                </form>
              )}
            </>
          ) : (
            <>
              <div className="logged-in-as">
                <div>
                  <div className="label">Umeingia kama</div>
                  <div className="value">{me?.full_name || me?.email || 'Mwanafunzi'}</div>
                </div>
                <div>
                  <div className="label">Hali ya maombi</div>
                  <div className={`status-badge ${statusTone(application?.status)}`}>
                    {statusLabel(application?.status)}
                  </div>
                </div>
              </div>

              {applicationLoading ? (
                <div className="hint">Inapakua taarifa za maombi...</div>
              ) : null}

              {(application?.admin_feedback || (application?.status && (application.status || '').toLowerCase() !== 'pending')) ? (
                <div className="feedback-box">
                  <div className="feedback-title">Majibu kutoka ofisi ya udahili</div>
                  <div className="feedback-text">
                    <div style={{ marginBottom: 8, fontWeight: 900 }}>
                      Hali: {statusLabel(application?.status)}
                    </div>
                    {application?.admin_feedback
                      ? application.admin_feedback
                      : 'Hakuna ujumbe uliowekwa. Tafadhali bonyeza “Sasisha Hali” baada ya muda au wasiliana na ofisi ya udahili.'}
                  </div>
                </div>
              ) : null}

              <h2>Fomu ya Maombi</h2>
              <form className="form" onSubmit={handleSubmitApplication}>
                <label>
                  Kiwango cha elimu ulichomaliza
                  <select
                    value={applicationForm.education_level}
                    onChange={(e) => setApplicationForm((p) => ({ ...p, education_level: e.target.value }))}
                  >
                    <option value="">-- Chagua --</option>
                    <option value="PRIMARY">Msingi</option>
                    <option value="FORM_IV">Kidato cha Nne</option>
                    <option value="FORM_VI">Kidato cha Sita</option>
                    <option value="OTHER">Nyingine</option>
                  </select>
                  <small className="field-hint">Chagua kiwango cha mwisho ulichomaliza.</small>
                </label>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={applicationForm.is_transfer}
                    onChange={(e) => setApplicationForm((p) => ({ ...p, is_transfer: e.target.checked }))}
                  />
                  Nimehamia kutoka shule nyingine (hamisho)
                </label>

                <label>
                  Shule ya awali (hiari)
                  <input
                    value={applicationForm.previous_school}
                    onChange={(e) => setApplicationForm((p) => ({ ...p, previous_school: e.target.value }))}
                    placeholder="Jina la shule uliyotoka"
                  />
                </label>

                <label>
                  Unataka kujiunga darasa/kidato gani
                  <input
                    value={applicationForm.desired_entry}
                    onChange={(e) => setApplicationForm((p) => ({ ...p, desired_entry: e.target.value }))}
                    placeholder="Mfano: Kidato cha I / Kidato cha V"
                  />
                  <small className="field-hint">Andika unapoomba kuanza kusoma.</small>
                </label>

                <div className="grid">
                  <label>
                    Mkoa (hiari)
                    <input
                      value={applicationForm.region}
                      onChange={(e) => setApplicationForm((p) => ({ ...p, region: e.target.value }))}
                      placeholder="Mfano: Arusha"
                    />
                  </label>
                  <label>
                    Wilaya (hiari)
                    <input
                      value={applicationForm.district}
                      onChange={(e) => setApplicationForm((p) => ({ ...p, district: e.target.value }))}
                      placeholder="Mfano: Arumeru"
                    />
                  </label>
                </div>

                <label>
                  Ujumbe / Maelezo ya ziada (hiari)
                  <textarea
                    rows={4}
                    value={applicationForm.message}
                    onChange={(e) => setApplicationForm((p) => ({ ...p, message: e.target.value }))}
                    placeholder="Andika maelezo muhimu (mfano: sababu ya kuhamia, namba ya mtihani, n.k.)"
                  />
                </label>

                <button className="primary" disabled={loading} type="submit">
                  {loading ? 'Inatuma...' : 'Tuma Maombi'}
                </button>

                <div className="hint">
                  Baada ya ofisi ya udahili kukagua, utaona majibu hapa pamoja na maoni na maelekezo.
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default AdmissionsApply;

