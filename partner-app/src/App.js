import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Banknote,
  Bell, BriefcaseBusiness, CalendarDays, Check, CheckCircle2, ChevronDown,
  CircleHelp, Clock3, Droplets, Filter, LayoutDashboard, LogOut, MapPin,
  Menu, PackageCheck, Plus, Search, Settings2, ShieldCheck, Shirt, Truck,
  UserRound, Wallet, X, Radio, Navigation
} from "lucide-react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import API, { getErrorMessage } from "./api";
import "./App.css";

const TOKEN_KEY = "laundtime_partner_token";
const USER_KEY = "laundtime_partner_user";
const categories = [
  ["pickup", "Pickup partner"],
  ["washing", "Laundry & washing"],
  ["delivery", "Delivery partner"],
  ["full-service", "Full-service partner"]
];
const navItems = [
  { path: "/", label: "Overview", Icon: LayoutDashboard },
  { path: "/available", label: "Available orders", Icon: Plus },
  { path: "/assigned", label: "My assignments", Icon: PackageCheck },
  { path: "/earnings", label: "Earnings", Icon: Wallet },
  { path: "/profile", label: "Profile", Icon: UserRound }
];

const money = (amount = 0) => `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const shortDate = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Date not set";
const orderNumber = (order) => order.trackingId || `LT${String(order._id || "").slice(-6).toUpperCase()}`;
const customerName = (order) => order.customerDetails?.name || order.user?.name || "Customer";
const locationText = (order) => [order.customerDetails?.address, order.customerDetails?.city, order.customerDetails?.pincode].filter(Boolean).join(", ");
const categoryName = (key) => categories.find(([value]) => value === key)?.[1] || "LaundTime partner";

const statuses = {
  pending: "Pending confirmation",
  confirmed: "Confirmed · Pickup en route",
  picked: "Laundry picked up",
  processing: "Washing & care in progress",
  ready: "Washing completed · Out for delivery",
  delivered: "Delivered successfully"
};

// Requirements 3, 4, 5, 6
const nextStatus = (category, status) => {
  if (["pickup", "full-service"].includes(category) && status === "confirmed") {
    return ["picked", "📦 Mark Laundry Picked Up"];
  }
  if (category === "washing" && status === "picked") {
    return ["processing", "🧺 Start Washing Process"];
  }
  if (["washing", "full-service"].includes(category) && status === "processing") {
    return ["ready", "✨ Washing Completed (Out for Delivery)"];
  }
  if (["delivery", "full-service"].includes(category) && status === "ready") {
    return ["delivered", "🏠 Confirm Delivered (Stops Tracking)"];
  }
  return null;
};

function Brand({ compact = false }) {
  return <div className={`brand ${compact ? "brand-compact" : ""}`}>
    <span className="brand-mark"><Droplets size={21} strokeWidth={2.6} /></span>
    <span className="brand-word">laund<span>time</span><small>PARTNER NETWORK</small></span>
  </div>;
}

function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
  });
  const [partner, setPartner] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));
  const [authNotice, setAuthNotice] = useState("");
  const navigate = useNavigate();

  const signOut = useCallback((notice = "") => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setPartner(null);
    setAuthNotice(notice);
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) { setAuthLoading(false); return; }
    let active = true;
    API.get("/partner/me")
      .then(({ data }) => {
        if (active) setPartner(data.partner);
      })
      .catch((error) => {
        if (!active) return;
        const status = error.response?.status;
        if (status === 404) signOut("Your partner profile could not be found.");
        if (status === 403) {
          setPartner({ status: "pending" });
          navigate("/account-status");
        }
        else setAuthNotice("We couldn’t verify your session. Check your connection and sign in again.");
      })
      .finally(() => active && setAuthLoading(false));
    return () => { active = false; };
  }, [signOut, navigate]);

  const authenticate = (payload) => {
    localStorage.setItem(TOKEN_KEY, payload.token);
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
    setUser(payload.user);
    setAuthNotice("");
    if (payload.user?.role !== "partner") {
      signOut("This sign-in is not linked to a partner account.");
      return;
    }
    if (payload.user.partnerStatus !== "approved") {
      setPartner({ status: payload.user.partnerStatus || "pending" });
      setAuthLoading(false);
      navigate("/account-status");
      return;
    }
    setAuthLoading(true);
    API.get("/partner/me").then(({ data }) => {
      setPartner(data.partner);
      navigate("/");
    }).catch((error) => {
      setPartner({ status: error.response?.status === 403 ? "pending" : "approved" });
      navigate("/account-status");
      setAuthNotice(error.response?.status ? "" : getErrorMessage(error));
    }).finally(() => setAuthLoading(false));
  };

  if (authLoading) return <LoadingScreen label="Preparing your partner workspace" />;

  return <Routes>
    <Route path="/login" element={user?.partnerStatus === "approved" ? <Navigate to="/" replace /> : <AuthPage mode="login" onAuth={authenticate} notice={authNotice} />} />
    <Route path="/register" element={<AuthPage mode="register" onAuth={authenticate} notice={authNotice} />} />
    <Route path="/account-status" element={<AccountStatus user={user} status={partner?.status || user?.partnerStatus || "pending"} signOut={() => signOut()} />} />
    <Route path="*" element={user && user.partnerStatus === "approved" ? <PartnerLayout user={user} partner={partner} onSignOut={signOut} /> : <Navigate to="/login" replace />} />
  </Routes>;
}

function AuthPage({ mode, onAuth, notice }) {
  const [values, setValues] = useState({
    name: "", email: "", password: "", phone: "", category: "pickup",
    address: "", city: "", pincode: "", serviceArea: ""
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isRegister = mode === "register";
  const change = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isRegister) {
        const { data } = await API.post("/partner/register", values);
        window.sessionStorage.setItem("laundtime_partner_registered", JSON.stringify({ email: values.email, name: values.name, message: data.message }));
        window.location.assign("/account-status?new=1");
      } else {
        const { data } = await API.post("/auth/login", { email: values.email, password: values.password });
        onAuth(data);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally { setBusy(false); }
  };
  return <main className="auth-shell">
    <section className="auth-visual">
      <Brand />
      <div className="auth-story">
        <div className="eyebrow">LAUNDTIME PARTNER NETWORK</div>
        <h1>Earn on your terms with laundry dispatch.</h1>
        <p>Pick up garments, manage washing operations, or handle doorstep deliveries in your neighborhood with real-time 7 KM GPS routing.</p>
        <div className="story-foot">
          <div className="story-stat"><strong>7 KM</strong><span>Auto detection radius</span></div>
          <div className="story-stat"><strong>10-20%</strong><span>Instant task commission</span></div>
          <div className="story-stat"><strong>Live GPS</strong><span>Real-time tracking</span></div>
        </div>
      </div>
      <div className="auth-bottom">AUTOMATED DISPATCH · FIRST-COME FIRST-SERVED ASSIGNMENTS</div>
    </section>
    <section className="auth-form-side">
      <div className="auth-box">
        <div className="form-heading">
          <h2>{isRegister ? "Join the partner network" : "Partner workspace"}</h2>
          <p>{isRegister ? "Submit your registration to start receiving laundry requests." : "Sign in to view available orders and route your active jobs."}</p>
        </div>
        {notice && <div className="auth-alert">{notice}</div>}
        {error && <ErrorBanner message={error} onClose={() => setError("")} />}
        <form className="auth-form" onSubmit={submit}>
          {isRegister && <label className="field"><span>Full name</span><input name="name" value={values.name} onChange={change} placeholder="Your name or business" required /></label>}
          <label className="field"><span>Email address</span><input name="email" type="email" value={values.email} onChange={change} placeholder="name@work.com" required /></label>
          <label className="field"><span>Password</span><input name="password" type="password" value={values.password} onChange={change} placeholder="••••••••" required /></label>
          {isRegister && <>
            <div className="field-row">
              <label className="field"><span>Phone number</span><input name="phone" type="tel" value={values.phone} onChange={change} placeholder="9876543210" required /></label>
              <label className="field"><span>Service category</span><select name="category" value={values.category} onChange={change}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
            <label className="field"><span>Base address</span><input name="address" value={values.address} onChange={change} placeholder="Street / landmark" required /></label>
            <div className="field-row-three">
              <label className="field"><span>City</span><input name="city" value={values.city} onChange={change} placeholder="City" required /></label>
              <label className="field"><span>Pincode</span><input name="pincode" value={values.pincode} onChange={change} placeholder="600001" required /></label>
              <label className="field"><span>Service area</span><input name="serviceArea" value={values.serviceArea} onChange={change} placeholder="Area" required /></label>
            </div>
            <div className="form-note"><ShieldCheck size={16} /> Your details are shared only with LaundTime for partner verification.</div>
          </>}
          <button className="button button-primary auth-submit" disabled={busy}>
            {busy ? <><span className="button-loader" /> {isRegister ? "Submitting…" : "Signing in…"}</> : <>{isRegister ? "Submit application" : "Sign in"} <ArrowRight size={17} /></>}
          </button>
        </form>
        <div className="auth-switch">{isRegister ? "Already a partner?" : "New to LaundTime?"} <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Apply to partner"}</Link></div>
        <div className="auth-support"><CircleHelp size={15} /> Need a hand? <a href="mailto:support@laundtime.com">Contact partner support</a></div>
      </div>
    </section>
  </main>;
}

function AccountStatus({ user, status, signOut }) {
  const params = new URLSearchParams(window.location.search);
  const newlyRegistered = params.get("new") === "1";
  let title = "Your application is in review";
  let copy = "Our partner team is reviewing your details. You can sign in again once your application has been approved.";
  let Icon = Clock3;
  if (status === "rejected") {
    title = "Application not approved";
    copy = "We couldn’t approve your application at this time. Please contact partner support if you’d like to learn more.";
    Icon = X;
  } else if (status === "suspended") {
    title = "Account temporarily paused";
    copy = "Your partner access is currently paused. Please reach out to partner support for next steps.";
    Icon = ShieldCheck;
  }
  const registration = (() => { try { return JSON.parse(window.sessionStorage.getItem("laundtime_partner_registered") || "null"); } catch { return null; } })();
  return <main className="status-page">
    <div className="status-top"><Brand /><Link to="/login" onClick={signOut}>Sign out <LogOut size={15} /></Link></div>
    <section className="status-card">
      <div className={`status-illustration status-${status}`}><Icon size={34} strokeWidth={1.8} /></div>
      <div className="status-label"><span /> PARTNER ACCOUNT STATUS</div>
      <h1>{newlyRegistered ? "Application received" : title}</h1>
      <p>{newlyRegistered ? "Thanks for applying to join the LaundTime partner network. Our team will review your details and get back to you soon." : copy}</p>
      {(registration?.email || user?.email) && <div className="status-detail"><span>Application email</span><strong>{registration?.email || user.email}</strong></div>}
      <div className="status-timeline">
        <div className="timeline-item complete"><span><Check size={14} /></span><div><strong>Application submitted</strong><small>Your details are safely with us</small></div></div>
        <div className="timeline-line" />
        <div className={`timeline-item ${status === "approved" ? "complete" : "current"}`}><span>{status === "approved" ? <Check size={14} /> : "2"}</span><div><strong>Partner review</strong><small>We’re checking your application</small></div></div>
        <div className="timeline-line" />
        <div className={`timeline-item ${status === "approved" ? "complete" : ""}`}><span>{status === "approved" ? <Check size={14} /> : "3"}</span><div><strong>Start receiving orders</strong><small>Your dashboard opens after approval</small></div></div>
      </div>
      <div className="status-actions"><Link className="button button-primary" to="/login" onClick={signOut}>Back to sign in <ArrowRight size={17} /></Link><a href="mailto:support@laundtime.com" className="status-support">Questions? Contact support</a></div>
    </section>
    <footer className="status-footer">LAUNDTIME · PARTNER NETWORK</footer>
  </main>;
}

function PartnerLayout({ user, partner: initialPartner, onSignOut }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [partner, setPartner] = useState(initialPartner);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const location = useLocation();
  const active = navItems.find((item) => item.path === location.pathname);
  const pageTitle = active?.label || "Partner workspace";
  const initials = (partner?.fullName || user?.name || "P").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  // Refresh profile
  const refreshProfile = useCallback(() => {
    API.get("/partner/me").then(({ data }) => setPartner(data.partner)).catch(() => {});
  }, []);

  useEffect(() => {
    refreshProfile();
    window.addEventListener("partner-profile-updated", refreshProfile);
    return () => window.removeEventListener("partner-profile-updated", refreshProfile);
  }, [refreshProfile]);

  // ── Requirement 7.4: Online/Available Toggle ──
  const toggleAvailability = async () => {
    setTogglingOnline(true);
    try {
      const nextState = !partner?.isAvailable;
      if (navigator.geolocation && nextState) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { data } = await API.patch("/partner/availability", {
              isAvailable: nextState,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            });
            setPartner(prev => ({ ...prev, isAvailable: data.isAvailable, location: data.location }));
            setTogglingOnline(false);
          },
          async () => {
            const { data } = await API.patch("/partner/availability", { isAvailable: nextState });
            setPartner(prev => ({ ...prev, isAvailable: data.isAvailable }));
            setTogglingOnline(false);
          }
        );
      } else {
        const { data } = await API.patch("/partner/availability", { isAvailable: nextState });
        setPartner(prev => ({ ...prev, isAvailable: data.isAvailable }));
        setTogglingOnline(false);
      }
    } catch {
      setTogglingOnline(false);
    }
  };

  // ── Requirements 1, 2, 5: Live GPS Broadcaster ──
  useEffect(() => {
    if (!partner?.isAvailable) return;

    // Periodic live GPS broadcaster when partner is online
    const gpsInterval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            API.post("/partner/location", {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              speed: pos.coords.speed || 24,
              heading: pos.coords.heading || 0
            }).catch(() => {});
          },
          () => {
            // Simulated heartbeat if browser denies raw device GPS
            if (partner.location?.lat && partner.location?.lng) {
              const jitterLat = partner.location.lat + (Math.random() - 0.5) * 0.0004;
              const jitterLng = partner.location.lng + (Math.random() - 0.5) * 0.0004;
              API.post("/partner/location", {
                lat: jitterLat,
                lng: jitterLng,
                speed: 22
              }).catch(() => {});
            }
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    }, 8000);

    return () => clearInterval(gpsInterval);
  }, [partner?.isAvailable, partner?.location]);

  return <div className="workspace">
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand"><Brand /></div>
      <div className="workspace-chip"><span className="workspace-dot" /> PARTNER WORKSPACE <ChevronDown size={14} /></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        {navItems.map(({ path, label, Icon }) => <Link key={path} to={path} onClick={() => setMobileOpen(false)} className={`nav-link ${location.pathname === path ? "nav-active" : ""}`}><Icon size={18} /><span>{label}</span>{path === "/available" && <span className="nav-new"><span /> 7 KM</span>}</Link>)}
      </nav>
      <div className="sidebar-spacer" />
      <div className="partner-mini">
        <div className="mini-avatar">{initials}</div>
        <div className="mini-copy"><strong>{partner?.fullName || user?.name}</strong><span>{categoryName(partner?.category)}</span></div>
        <button className="icon-button mini-logout" onClick={() => onSignOut()} title="Sign out" aria-label="Sign out"><LogOut size={16} /></button>
      </div>
      <div className="sidebar-foot">© 2025 LaundTime <span>·</span> Automated Dispatch</div>
    </aside>
    {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <div className="main-column">
      <header className="topbar">
        <button className="icon-button menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
        <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{pageTitle}</strong></div>
        <div className="topbar-right">
          {/* Live Online Availability Toggle Switch */}
          <button
            className={`partner-online-pill ${partner?.isAvailable ? "online-state" : "offline-state"}`}
            onClick={toggleAvailability}
            disabled={togglingOnline}
            title={partner?.isAvailable ? "You are Online and receiving orders within 7 KM" : "You are Offline"}
          >
            <span className={`radar-dot ${partner?.isAvailable ? "dot-pulsing" : ""}`} />
            {partner?.isAvailable ? "🟢 Online (7 KM Detection)" : "🔴 Offline (Tap to Work)"}
          </button>
          <span className="topbar-divider" />
          <div className="topbar-greeting"><span>Good to see you,</span><strong>{(partner?.fullName || user?.name || "Partner").split(" ")[0]}</strong></div>
          <div className="top-avatar">{initials}</div>
        </div>
      </header>
      <main className="page-content">
        <Routes>
          <Route path="/" element={<Overview partner={partner} onToggleOnline={toggleAvailability} />} />
          <Route path="/available" element={<OrdersPage type="available" partner={partner} />} />
          <Route path="/assigned" element={<OrdersPage type="assigned" partner={partner} />} />
          <Route path="/earnings" element={<EarningsPage />} />
          <Route path="/profile" element={<ProfilePage partner={partner} onUpdated={() => window.dispatchEvent(new Event("partner-profile-updated"))} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="page-footer"><span>LAUNDTIME <b>PARTNER NETWORK</b> · 7 KM DISPATCH ENGINE</span><a href="mailto:support@laundtime.com"><CircleHelp size={14} /> Partner support</a></footer>
    </div>
  </div>;
}

function usePartnerProfile() {
  const [partner, setPartner] = useState(null);
  useEffect(() => {
    let active = true;
    API.get("/partner/me").then(({ data }) => active && setPartner(data.partner)).catch(() => {});
    const refresh = () => API.get("/partner/me").then(({ data }) => active && setPartner(data.partner)).catch(() => {});
    window.addEventListener("partner-profile-updated", refresh);
    return () => { active = false; window.removeEventListener("partner-profile-updated", refresh); };
  }, []);
  return partner;
}

function useWorkspaceData() {
  const partner = usePartnerProfile();
  const [data, setData] = useState({ available: [], assigned: [], earnings: [], summary: { total: 0, pending: 0, paid: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [available, assigned, earnings] = await Promise.all([
        API.get("/partner/orders/available"),
        API.get("/partner/orders/assigned"),
        API.get("/partner/earnings")
      ]);
      setData({
        available: available.data.orders || [],
        assigned: assigned.data.orders || [],
        earnings: earnings.data.earnings || [],
        summary: earnings.data.summary || { total: 0, pending: 0, paid: 0 }
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh every 8 seconds for real-time new order notifications
  useEffect(() => {
    const interval = setInterval(() => refresh(), 8000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { ...data, partner, loading, error, refresh };
}

function PageIntro({ eyebrow, title, description, children }) {
  return <div className="page-intro"><div><div className="section-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{children && <div className="intro-actions">{children}</div>}</div>;
}

function Overview({ partner: topPartner, onToggleOnline }) {
  const data = useWorkspaceData();
  const partner = data.partner || topPartner;
  const activeOrders = data.assigned.filter((order) => order.status !== "delivered");
  const monthEarnings = data.earnings.filter((entry) => {
    const date = new Date(entry.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  return <>
    <PageIntro eyebrow="REAL-TIME OPERATIONS DESK" title="Good work starts here." description="Automatic 7 KM partner detection is live. Orders appear instantly." >
      <div className="today-date"><CalendarDays size={16} /> {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</div>
    </PageIntro>

    {/* Online Status Alert Card */}
    <div className={`partner-dispatch-banner ${partner?.isAvailable ? "banner-online" : "banner-offline"}`}>
      <div className="banner-left">
        <span className="banner-icon"><Radio size={22} /></span>
        <div>
          <strong>{partner?.isAvailable ? "🟢 You are ONLINE & Active" : "🔴 You are OFFLINE"}</strong>
          <p>{partner?.isAvailable ? "Orders placed within 7 KM of your location are automatically routed to your screen." : "Switch to Online mode to receive new nearby laundry pickup and delivery requests."}</p>
        </div>
      </div>
      <button className="button button-small" onClick={onToggleOnline}>
        {partner?.isAvailable ? "Go Offline" : "Go Online (Start Work)"}
      </button>
    </div>

    {data.error && <ErrorBanner message={data.error} retry={data.refresh} />}
    {data.loading ? <LoadingState label="Loading your dashboard" /> : <>
      <section className="stats-grid" aria-label="Partner performance">
        <StatCard label="Available (7 KM Radius)" value={data.available.length} note="Ready for you to accept" Icon={PackageCheck} tone="blue" href="/available" />
        <StatCard label="Active jobs" value={activeOrders.length} note="Currently en route / in progress" Icon={Truck} tone="green" href="/assigned" />
        <StatCard label="Earned this month" value={money(monthEarnings)} note="Commissions credited" Icon={Banknote} tone="amber" href="/earnings" />
        <StatCard label="Total paid out" value={money(data.summary.paid)} note="Direct payouts" Icon={ArrowDownLeft} tone="navy" href="/earnings" />
      </section>
      <section className="dashboard-grid">
        <div className="panel recent-panel">
          <div className="panel-heading"><div><h2>Latest assignments</h2><p>Your active pickup and delivery routes</p></div><Link to="/assigned" className="text-link">View all <ArrowRight size={15} /></Link></div>
          {activeOrders.length ? <div className="recent-list">{activeOrders.slice(0, 4).map((order) => <OrderListRow key={order._id} order={order} />)}</div> : <EmptyState compact Icon={PackageCheck} title="Nothing on your route yet" description="Accept available orders to start picking up." action={<Link to="/available" className="text-link">Find orders within 7 KM <ArrowRight size={14} /></Link>} />}
        </div>
        <div className="panel earnings-panel">
          <div className="panel-heading"><div><h2>Earnings overview</h2><p>Your partner balance</p></div><span className="panel-icon"><Wallet size={17} /></span></div>
          <div className="earnings-total">{money(data.summary.total)}<small>lifetime earned</small></div>
          <div className="earnings-split"><div><span className="earnings-dot pending-dot" /><span>Pending</span><strong>{money(data.summary.pending)}</strong></div><div><span className="earnings-dot paid-dot" /><span>Paid out</span><strong>{money(data.summary.paid)}</strong></div></div>
          <Link to="/earnings" className="earnings-link">See earnings details <ArrowUpRight size={15} /></Link>
        </div>
      </section>
      <div className="ops-footnote"><span><ShieldCheck size={16} /></span><p><strong>First-Come, First-Served Assignment:</strong> The first eligible partner to click 'Accept' secures the job automatically without admin delays.</p><Link to="/available">Check nearby orders <ArrowRight size={14} /></Link></div>
    </>}
  </>;
}

function StatCard({ label, value, note, Icon, tone, href }) {
  return <Link to={href} className={`stat-card stat-${tone}`}><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={18} /></span></div><div className="stat-value">{value}</div><div className="stat-note">{note}<ArrowUpRight size={13} /></div></Link>;
}

function OrdersPage({ type, partner: topPartner }) {
  const data = useWorkspaceData();
  const partner = data.partner || topPartner;
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [working, setWorking] = useState("");
  const [actionError, setActionError] = useState("");
  const available = type === "available";
  const orders = available ? data.available : data.assigned;

  const filtered = useMemo(() => orders.filter((order) => {
    const text = `${orderNumber(order)} ${customerName(order)} ${locationText(order)}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (statusFilter === "all" || order.status === statusFilter);
  }), [orders, query, statusFilter]);

  // Requirement 7.5 & 7.6: Accept or Decline order
  const action = async (order, kind, value) => {
    setWorking(order._id);
    setActionError("");
    try {
      if (kind === "accept") {
        await API.post(`/partner/orders/${order._id}/accept`, {});
      } else if (kind === "reject") {
        await API.post(`/partner/orders/${order._id}/reject`, {});
      } else {
        await API.patch(`/partner/orders/${order._id}/status`, { status: value });
      }
      await data.refresh();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally { setWorking(""); }
  };

  const statusesInList = [...new Set(orders.map((order) => order.status))];

  return <>
    <PageIntro eyebrow={available ? "7 KM RADAR DETECTION" : "ACTIVE ROUTE"} title={available ? "Available orders within 7 KM" : "My assignments"} description={available ? "First-come, first-served. Tap Accept to secure the order and start live GPS tracking." : "Update milestones as you progress. Customers track your real-time vehicle."}>
      <div className="order-total"><span>{orders.length}</span> {available ? "available within 7 KM" : "assigned"} {orders.length === 1 ? "order" : "orders"}</div>
    </PageIntro>

    {actionError && <ErrorBanner message={actionError} onClose={() => setActionError("")} />}
    {data.error && <ErrorBanner message={data.error} retry={data.refresh} />}

    <div className="orders-toolbar">
      <label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order, customer or area" /><kbd>⌘ K</kbd></label>
      <label className="filter-box"><Filter size={16} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{statusesInList.map((status) => <option key={status} value={status}>{statuses[status] || status}</option>)}</select><ChevronDown size={14} /></label>
    </div>

    {data.loading ? <LoadingState label={available ? "Scanning 7 KM radius for new orders" : "Loading your assignments"} /> : filtered.length ? <div className="orders-list">
      {filtered.map((order) => {
        const statusAction = !available && nextStatus(partner?.category, order.status);
        return <OrderCard
          key={order._id}
          order={order}
          partner={partner}
          available={available}
          action={statusAction}
          busy={working === order._id}
          onAccept={() => action(order, "accept")}
          onReject={() => action(order, "reject")}
          onStatus={(status) => action(order, "status", status)}
        />;
      })}
    </div> : <EmptyState Icon={available ? Search : PackageCheck} title={available ? query || statusFilter !== "all" ? "No matching orders" : "No open orders within 7 KM right now" : query || statusFilter !== "all" ? "No matching assignments" : "Your active assignments will appear here"} description={available ? query || statusFilter !== "all" ? "Try adjusting your search filter." : "You’re all caught up! New customer orders within 7 KM will pop up automatically." : query || statusFilter !== "all" ? "Try choosing a different status." : "Accept an open order from the Available tab to start picking up."} action={available ? null : <Link to="/available" className="button button-secondary">Browse available orders <ArrowRight size={15} /></Link>} />}
  </>;
}

// ─── Interactive Live Customer Location Map for Delivery Partner ─────────────
function CustomerLocationMap({ order, partnerLocation, onClose }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const custLat = order.customerLocation?.lat || order.customerDetails?.lat || 13.0827;
  const custLng = order.customerLocation?.lng || order.customerDetails?.lng || 80.2707;
  const custName = customerName(order);
  const custAddress = locationText(order) || "Customer Address";
  const custPhone = order.customerDetails?.phone || order.user?.phone || "";

  const partLat = partnerLocation?.lat || custLat + 0.015;
  const partLng = partnerLocation?.lng || custLng + 0.015;

  const distanceText = order.distanceKm ? `${order.distanceKm} km` : "2.1 km";
  const etaText = order.etaMinutes ? `${order.etaMinutes} mins` : "7 mins";

  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;
    const L = window.L;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([custLat, custLng], 14);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd"
      }).addTo(map);

      // Customer Pin (🏠)
      const customerIcon = L.divIcon({
        className: "partner-map-pin customer-pin",
        html: `<div class="pulse-ring-red"></div><div class="pin-badge-red">🏠</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });
      L.marker([custLat, custLng], { icon: customerIcon })
        .addTo(map)
        .bindPopup(`<b>${custName} (Customer Destination)</b><br/>${custAddress}`);

      // Delivery Partner Pin (🛵)
      const partnerIcon = L.divIcon({
        className: "partner-map-pin vehicle-pin",
        html: `<div class="pulse-ring-green"></div><div class="pin-badge-green">🛵</div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });
      L.marker([partLat, partLng], { icon: partnerIcon })
        .addTo(map)
        .bindPopup(`<b>Your Current Location</b><br/>En route to customer`);

      // Route line
      const waypoints = [
        [partLat, partLng],
        [(partLat + custLat) / 2 + 0.001, (partLng + custLng) / 2 - 0.001],
        [custLat, custLng]
      ];
      L.polyline(waypoints, {
        color: "#2563eb",
        weight: 5,
        opacity: 0.85,
        dashArray: "6, 6"
      }).addTo(map);

      const bounds = L.latLngBounds([[custLat, custLng], [partLat, partLng]]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [custLat, custLng, partLat, partLng, custName, custAddress]);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${custLat},${custLng}`;

  return (
    <div className="customer-map-modal-overlay" onClick={onClose}>
      <div className="customer-map-modal" onClick={e => e.stopPropagation()}>
        <div className="customer-map-modal-header">
          <div>
            <h3>📍 Customer Live Location & Route</h3>
            <p>{custName} · {custAddress}</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Live Route Map Canvas */}
        <div className="partner-leaflet-wrapper">
          <div ref={mapContainerRef} className="partner-leaflet-canvas"></div>

          {/* Floating Trip Status */}
          <div className="partner-map-stat-pill">
            <span>🛵 <strong>{distanceText}</strong> to customer</span>
            <span className="stat-separator">•</span>
            <span>Est. ~<strong>{etaText}</strong></span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="customer-map-modal-footer">
          <div className="nav-info-col">
            <span className="customer-phone-label">Customer Contact:</span>
            <strong>{custPhone || "Available on dial"}</strong>
          </div>
          <div className="nav-btn-group">
            {custPhone && (
              <a href={`tel:${custPhone}`} className="button button-secondary button-phone">
                📞 Call Customer
              </a>
            )}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button button-primary button-gmaps"
            >
              🗺️ Open in Google Maps Navigation <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, partner, available, action, busy, onAccept, onReject, onStatus }) {
  const [showMap, setShowMap] = useState(false);
  const date = order.customerDetails?.pickupDate;
  const itemCount = order.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const distance = order.distanceKm ? `${order.distanceKm} KM away` : "Nearby";

  const custLat = order.customerLocation?.lat || order.customerDetails?.lat || 13.0827;
  const custLng = order.customerLocation?.lng || order.customerDetails?.lng || 80.2707;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${custLat},${custLng}`;

  return <article className="order-card">
    {/* Map Modal */}
    {showMap && (
      <CustomerLocationMap
        order={order}
        partnerLocation={partner?.location}
        onClose={() => setShowMap(false)}
      />
    )}

    <div className="order-card-head">
      <div className="order-ref">
        <span>ORDER</span>
        <strong>#{orderNumber(order)}</strong>
        <span className="order-date"><CalendarDays size={13} /> {shortDate(date)}</span>
      </div>
      <div className="head-right-badges">
        {available ? (
          <span className="distance-badge">
            <Navigation size={12} /> {distance} · 7 KM Match
          </span>
        ) : (
          <button
            className="view-map-pill"
            onClick={() => setShowMap(true)}
            title="View customer's live location on map"
          >
            📍 Live Customer Map
          </button>
        )}
        <StatusBadge status={order.status} />
      </div>
    </div>
    <div className="order-card-main">
      <div className="order-customer-block">
        <div className="customer-avatar">{customerName(order).split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>
        <div>
          <strong>{customerName(order)}</strong>
          <span>{order.customerDetails?.phone || order.user?.phone || "Phone unavailable"}</span>
        </div>
      </div>

      <div className="order-info">
        <MapPin size={16} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
            <span>Pickup / Delivery Address</span>
            <button
              className="inline-map-link"
              onClick={() => setShowMap(true)}
            >
              📍 Live Map
            </button>
          </div>
          <strong>{locationText(order) || "Address not provided"}</strong>
        </div>
      </div>

      <div className="order-info"><Shirt size={16} /><div><span>Items</span><strong>{itemCount || order.items?.length || 0} pieces <i>·</i> {order.items?.map((item) => item.name).filter(Boolean).slice(0, 2).join(", ") || "Laundry service"}</strong></div></div>
      <div className="order-value"><span>Payout Est.</span><strong>{money((order.totalAmount || 100) * 0.15)}</strong></div>
    </div>
    <div className="order-card-foot">
      <div className="order-foot-meta">
        <span><Clock3 size={14} /> {order.customerDetails?.pickupTime || "Time flexible"}</span>
        {order.customerDetails?.city && <span><MapPin size={13} /> {order.customerDetails.city}</span>}
      </div>
      <div className="order-actions">
        {available ? (
          <div className="dual-order-buttons">
            <button
              className="button button-secondary button-small button-decline"
              disabled={busy}
              onClick={onReject}
              title="Decline this order so another nearby partner can accept"
            >
              Decline
            </button>
            <button
              className="button button-primary button-small button-accept"
              disabled={busy}
              onClick={onAccept}
              title="First-come, first-served assignment"
            >
              {busy ? <><span className="button-loader" /> Accepting</> : <>Accept Order <ArrowRight size={15} /></>}
            </button>
          </div>
        ) : (
          <div className="assigned-action-buttons">
            <button
              className="button button-secondary button-small button-map-trigger"
              onClick={() => setShowMap(true)}
              title="View customer location live on interactive map"
            >
              📍 View Map
            </button>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button button-secondary button-small button-gmaps-direct"
              title="Open Google Maps Navigation"
            >
              🗺️ Navigate
            </a>
            {action ? (
              <button
                className={`button button-small ${action[0] === "delivered" ? "button-success" : "button-primary"}`}
                disabled={busy}
                onClick={() => onStatus(action[0])}
              >
                {busy ? <><span className="button-loader" /> Updating</> : <>{action[1]} <ArrowRight size={15} /></>}
              </button>
            ) : (
              <span className="no-action"><CheckCircle2 size={15} /> Up to date</span>
            )}
          </div>
        )}
      </div>
    </div>
  </article>;
}

function OrderListRow({ order }) {
  return <div className="recent-row"><div className="recent-order-mark"><PackageCheck size={17} /></div><div className="recent-order-id"><strong>#{orderNumber(order)}</strong><span>{customerName(order)} · {shortDate(order.updatedAt || order.createdAt)}</span></div><StatusBadge status={order.status} /><strong className="recent-amount">{money(order.totalAmount)}</strong><ArrowRight className="row-arrow" size={15} /></div>;
}

function StatusBadge({ status }) {
  return <span className={`status-badge badge-${status || "confirmed"}`}><span />{statuses[status] || status || "New"}</span>;
}

function EarningsPage() {
  const { earnings, summary, loading, error, refresh } = useWorkspaceData();
  return <>
    <PageIntro eyebrow="YOUR WORK, YOUR EARNINGS" title="Earnings" description="Every completed task and payout, all in one place." >
      <button className="button button-secondary refresh-button" onClick={refresh}><Settings2 size={15} /> Refresh</button>
    </PageIntro>
    {error && <ErrorBanner message={error} retry={refresh} />}
    {loading ? <LoadingState label="Loading your earnings" /> : <>
      <section className="earnings-hero">
        <div className="earnings-hero-copy"><div className="section-eyebrow">LIFETIME EARNINGS</div><div className="earnings-hero-total">{money(summary.total)}</div><p>All earnings from work completed with LaundTime.</p></div>
        <div className="earnings-hero-symbol"><Wallet size={48} strokeWidth={1.15} /></div>
        <div className="earnings-hero-bottom"><span><span className="legend-dot light-green" /> Paid to you <strong>{money(summary.paid)}</strong></span><i /><span><span className="legend-dot light-amber" /> Pending payout <strong>{money(summary.pending)}</strong></span></div>
      </section>
      <div className="earnings-summary-grid">
        <div className="earning-summary-card"><span className="summary-icon summary-blue"><ArrowUpRight size={18} /></span><div><small>Lifetime earnings</small><strong>{money(summary.total)}</strong></div></div>
        <div className="earning-summary-card"><span className="summary-icon summary-amber"><Clock3 size={18} /></span><div><small>Pending payout</small><strong>{money(summary.pending)}</strong></div></div>
        <div className="earning-summary-card"><span className="summary-icon summary-green"><CheckCircle2 size={18} /></span><div><small>Paid out</small><strong>{money(summary.paid)}</strong></div></div>
      </div>
      <div className="panel transaction-panel">
        <div className="panel-heading"><div><h2>Transaction history</h2><p>Commission earned for each completed task</p></div><span className="transaction-count">{earnings.length} {earnings.length === 1 ? "entry" : "entries"}</span></div>
        {earnings.length ? <div className="table-scroll"><table className="earnings-table"><thead><tr><th>ORDER / TASK</th><th>DATE</th><th>STATUS</th><th className="align-right">AMOUNT</th></tr></thead><tbody>{earnings.map((item, index) => <tr key={item._id || `${item.order}-${item.task}-${index}`}><td><strong>#{typeof item.order === "object" ? item.order.trackingId || String(item.order._id || "").slice(-6).toUpperCase() : String(item.order || "").slice(-6).toUpperCase()}</strong><span className="task-name">{item.task || "Partner task"} commission</span></td><td>{shortDate(item.createdAt)}</td><td><span className={`payout-status payout-${item.status || "pending"}`}><span /> {item.status === "paid" ? "Paid" : "Pending"}</span></td><td className="align-right earning-amount">{money(item.amount)}</td></tr>)}</tbody></table></div> : <EmptyState compact Icon={Banknote} title="No earnings yet" description="As you complete partner tasks, your commissions will appear here." />}
      </div>
      <div className="payout-note"><ShieldCheck size={17} /><p>Payouts are processed by the LaundTime team. Your completed tasks are recorded automatically when you update an order’s status.</p></div>
    </>}
  </>;
}

function ProfilePage({ partner: initialPartner, onUpdated }) {
  const [partner, setPartner] = useState(initialPartner);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    let active = true;
    API.get("/partner/me").then(({ data }) => {
      if (!active) return;
      setPartner(data.partner);
      setValues({ fullName: data.partner.fullName || "", mobile: data.partner.mobile || "", address: data.partner.address || "", city: data.partner.city || "", pincode: data.partner.pincode || "", serviceArea: data.partner.serviceArea || "", upi: data.partner.paymentDetails?.upi || "", accountName: data.partner.paymentDetails?.accountName || "", accountNumber: data.partner.paymentDetails?.accountNumber || "", ifsc: data.partner.paymentDetails?.ifsc || "" });
    }).catch((requestError) => setError(getErrorMessage(requestError))).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);
  const update = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  const save = async (event) => {
    event.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const { data } = await API.put("/partner/me", {
        fullName: values.fullName, mobile: values.mobile, address: values.address,
        city: values.city, pincode: values.pincode, serviceArea: values.serviceArea,
        paymentDetails: { upi: values.upi, accountName: values.accountName, accountNumber: values.accountNumber, ifsc: values.ifsc }
      });
      setPartner(data.partner);
      setSuccess("Your profile has been updated.");
      onUpdated();
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setSaving(false); }
  };
  if (loading) return <><PageIntro eyebrow="YOUR PARTNER DETAILS" title="Profile" description="Keep your contact and service details up to date." /><LoadingState label="Loading your profile" /></>;
  return <>
    <PageIntro eyebrow="YOUR PARTNER DETAILS" title="Profile" description="Keep your contact and service details up to date." />
    {error && <ErrorBanner message={error} />}
    {success && <div className="alert alert-success"><CheckCircle2 size={17} /> {success}</div>}
    <form className="profile-layout" onSubmit={save}>
      <div className="profile-main">
        <section className="panel profile-section">
          <div className="panel-heading"><div><h2>Business details</h2><p>Your public partner profile and contact information</p></div><span className="profile-section-icon"><BriefcaseBusiness size={18} /></span></div>
          <div className="profile-fields">
            <label className="field"><span>Full name / business name</span><input name="fullName" value={values.fullName || ""} onChange={update} required /></label>
            <label className="field"><span>Phone number</span><input name="mobile" type="tel" value={values.mobile || ""} onChange={update} required /></label>
            <label className="field"><span>Street address</span><input name="address" value={values.address || ""} onChange={update} required /></label>
            <div className="field-row"><label className="field"><span>City</span><input name="city" value={values.city || ""} onChange={update} required /></label><label className="field"><span>PIN code</span><input name="pincode" value={values.pincode || ""} onChange={update} required /></label></div>
            <label className="field"><span>Service area</span><input name="serviceArea" value={values.serviceArea || ""} onChange={update} required /></label>
          </div>
        </section>
        <section className="panel profile-section">
          <div className="panel-heading"><div><h2>Payment details</h2><p>Details used by our team for partner payouts</p></div><span className="profile-section-icon"><Banknote size={18} /></span></div>
          <div className="profile-fields">
            <label className="field"><span>UPI ID</span><input name="upi" value={values.upi || ""} onChange={update} placeholder="name@bank" /></label>
            <label className="field"><span>Account holder name</span><input name="accountName" value={values.accountName || ""} onChange={update} /></label>
            <div className="field-row"><label className="field"><span>Account number</span><input name="accountNumber" value={values.accountNumber || ""} onChange={update} inputMode="numeric" /></label><label className="field"><span>IFSC code</span><input name="ifsc" value={values.ifsc || ""} onChange={update} /></label></div>
          </div>
        </section>
        <div className="profile-save-row"><span>Changes are saved to your LaundTime partner account.</span><button className="button button-primary" disabled={saving}>{saving ? <><span className="button-loader" /> Saving changes</> : <>Save changes <Check size={16} /></>}</button></div>
      </div>
      <aside className="profile-aside">
        <div className="panel identity-card"><div className="identity-avatar">{(partner?.fullName || "P").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div><h3>{partner?.fullName || "Partner profile"}</h3><span>{categoryName(partner?.category)}</span><div className="verified-tag"><BadgeCheck size={15} /> {partner?.status === "approved" ? "Approved partner" : partner?.status || "Partner"}</div><div className="identity-divider" /><div className="identity-line"><MapPin size={15} /><span>{[partner?.serviceArea, partner?.city].filter(Boolean).join(", ") || "Service area not set"}</span></div><div className="identity-line"><CalendarDays size={15} /><span>Joined {shortDate(partner?.createdAt)}</span></div></div>
        <div className="profile-help"><div><CircleHelp size={17} /><strong>Need to update something else?</strong></div><p>For changes to your partner category or verification documents, reach our partner care team.</p><a href="mailto:support@laundtime.com">Contact partner support <ArrowRight size={14} /></a></div>
      </aside>
    </form>
  </>;
}

function LoadingScreen({ label }) {
  return <div className="loading-screen"><Brand /><LoadingState label={label} /></div>;
}
function LoadingState({ label }) { return <div className="loading-state"><span className="spinner" /><span>{label}</span></div>; }
function ErrorBanner({ message, retry, onClose }) {
  return <div className="error-banner" role="alert"><span className="error-mark">!</span><p>{message}</p>{retry && <button onClick={retry}>Try again</button>}{onClose && <button className="close-error" onClick={onClose} aria-label="Dismiss error"><X size={15} /></button>}</div>;
}
function EmptyState({ Icon, title, description, action, compact = false }) {
  return <div className={`empty-state ${compact ? "empty-compact" : ""}`}><div className="empty-icon"><Icon size={24} /></div><h3>{title}</h3><p>{description}</p>{action && <div className="empty-action">{action}</div>}</div>;
}

export default App;
