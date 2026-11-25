import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Banknote,
  Bell, BriefcaseBusiness, CalendarDays, Check, CheckCircle2, ChevronDown,
  CircleHelp, Clock3, Droplets, Filter, LayoutDashboard, LogOut, MapPin,
  Menu, PackageCheck, Plus, Search, Settings2, ShieldCheck, Shirt, Truck,
  UserRound, Wallet, X
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
  confirmed: "Confirmed",
  picked: "Picked up",
  processing: "In progress",
  ready: "Ready for delivery",
  delivered: "Delivered"
};
const nextStatus = (category, status) => {
  if (["pickup", "full-service"].includes(category) && status === "confirmed") return ["picked", "Mark picked up"];
  if (category === "washing" && status === "picked") return ["processing", "Start washing"];
  if (category === "washing" && status === "processing") return ["ready", "Mark ready"];
  if (["delivery", "full-service"].includes(category) && status === "ready") return ["delivered", "Mark delivered"];
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
  }, [signOut]);

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

  return <main className="auth-page">
    <div className="auth-visual">
      <div className="auth-top"><Brand /></div>
      <div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" />
      <div className="auth-story">
        <div className="eyebrow"><span className="eyebrow-dot" /> MADE FOR THE PEOPLE WHO MAKE IT HAPPEN</div>
        <h1>Better laundry.<br /><em>Better together.</em></h1>
        <p>One trusted network for the people who keep every order moving — from first pickup to fresh delivery.</p>
        <div className="story-foot">
          <div className="story-stat"><strong>01</strong><span>Partner-first<br />operations</span></div>
          <div className="story-rule" />
          <div className="story-stat"><strong>24/7</strong><span>Your work,<br />always in view</span></div>
        </div>
      </div>
      <div className="auth-bottom"><span>LAUNDTIME PARTNER NETWORK</span><span>CHENNAI · INDIA</span></div>
    </div>
    <section className="auth-form-side">
      <div className="mobile-brand"><Brand compact /></div>
      <div className="auth-form-wrap">
        <Link to="/" className="back-home"><ArrowLeft size={15} /> LaundTime home</Link>
        <div className="form-heading">
          <div className="form-kicker">{isRegister ? "GROW WITH US" : "WELCOME BACK"}</div>
          <h2>{isRegister ? "Join the partner network" : "Sign in to your account"}</h2>
          <p>{isRegister ? "Tell us a little about your business to get started." : "Your next order is just a moment away."}</p>
        </div>
        {(notice || error) && <div className="alert alert-error" role="alert">{notice || error}</div>}
        <form className="auth-form" onSubmit={submit}>
          {isRegister && <>
            <label className="field"><span>Full name</span><input name="name" value={values.name} onChange={change} placeholder="Your name or business name" autoComplete="name" required /></label>
            <div className="field-row">
              <label className="field"><span>Phone number</span><input name="phone" type="tel" value={values.phone} onChange={change} placeholder="+91 98765 43210" autoComplete="tel" required /></label>
              <label className="field"><span>Partner type</span><select name="category" value={values.category} onChange={change}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
          </>}
          <label className="field"><span>Email address</span><input name="email" type="email" value={values.email} onChange={change} placeholder="you@business.com" autoComplete="email" required /></label>
          <label className="field"><span>Password</span><input name="password" type="password" value={values.password} onChange={change} placeholder={isRegister ? "Create a password" : "Enter your password"} autoComplete={isRegister ? "new-password" : "current-password"} minLength={6} required /></label>
          {isRegister && <>
            <label className="field"><span>Street address</span><input name="address" value={values.address} onChange={change} placeholder="Shop or operating address" autoComplete="street-address" required /></label>
            <div className="field-row field-row-three">
              <label className="field"><span>City</span><input name="city" value={values.city} onChange={change} placeholder="City" required /></label>
              <label className="field"><span>PIN code</span><input name="pincode" value={values.pincode} onChange={change} placeholder="600001" inputMode="numeric" required /></label>
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

function PartnerLayout({ user, partner, onSignOut }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const active = navItems.find((item) => item.path === location.pathname);
  const pageTitle = active?.label || "Partner workspace";
  const initials = (partner?.fullName || user?.name || "P").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <div className="workspace">
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand"><Brand /></div>
      <div className="workspace-chip"><span className="workspace-dot" /> PARTNER WORKSPACE <ChevronDown size={14} /></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        {navItems.map(({ path, label, Icon }) => <Link key={path} to={path} onClick={() => setMobileOpen(false)} className={`nav-link ${location.pathname === path ? "nav-active" : ""}`}><Icon size={18} /><span>{label}</span>{path === "/available" && <span className="nav-new"><span /> LIVE</span>}</Link>)}
      </nav>
      <div className="sidebar-spacer" />
      <div className="partner-mini">
        <div className="mini-avatar">{initials}</div>
        <div className="mini-copy"><strong>{partner?.fullName || user?.name}</strong><span>{categoryName(partner?.category)}</span></div>
        <button className="icon-button mini-logout" onClick={() => onSignOut()} title="Sign out" aria-label="Sign out"><LogOut size={16} /></button>
      </div>
      <div className="sidebar-foot">© 2025 LaundTime <span>·</span> Partner care</div>
    </aside>
    {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <div className="main-column">
      <header className="topbar">
        <button className="icon-button menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
        <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{pageTitle}</strong></div>
        <div className="topbar-right">
          <div className="service-indicator"><span className="service-light" /> Service active</div>
          <span className="topbar-divider" />
          <div className="topbar-greeting"><span>Good to see you,</span><strong>{(partner?.fullName || user?.name || "Partner").split(" ")[0]}</strong></div>
          <div className="top-avatar">{initials}</div>
        </div>
      </header>
      <main className="page-content">
        <Routes>
          <Route path="/" element={<Overview partner={partner} />} />
          <Route path="/available" element={<OrdersPage type="available" partner={partner} />} />
          <Route path="/assigned" element={<OrdersPage type="assigned" partner={partner} />} />
          <Route path="/earnings" element={<EarningsPage />} />
          <Route path="/profile" element={<ProfilePage partner={partner} onUpdated={() => window.dispatchEvent(new Event("partner-profile-updated"))} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="page-footer"><span>LAUNDTIME <b>PARTNER NETWORK</b></span><a href="mailto:support@laundtime.com"><CircleHelp size={14} /> Partner support</a></footer>
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

  // Auto-refresh every 15 seconds so new orders appear without manual reload
  useEffect(() => {
    const interval = setInterval(() => refresh(), 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { ...data, partner, loading, error, refresh };
}

function PageIntro({ eyebrow, title, description, children }) {
  return <div className="page-intro"><div><div className="section-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{children && <div className="intro-actions">{children}</div>}</div>;
}

function Overview({ partner: topPartner }) {
  const data = useWorkspaceData();
  const partner = data.partner || topPartner;
  const activeOrders = data.assigned.filter((order) => order.status !== "delivered");
  const monthEarnings = data.earnings.filter((entry) => {
    const date = new Date(entry.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  return <>
    <PageIntro eyebrow="YOUR OPERATIONS, AT A GLANCE" title="Good work starts here." description="Your partner desk is ready. Here’s what’s moving today." >
      <div className="today-date"><CalendarDays size={16} /> {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</div>
    </PageIntro>
    {data.error && <ErrorBanner message={data.error} retry={data.refresh} />}
    {data.loading ? <LoadingState label="Loading your dashboard" /> : <>
      <section className="welcome-strip">
        <div className="welcome-icon"><BriefcaseBusiness size={21} /></div>
        <div className="welcome-copy"><strong>Your {categoryName(partner?.category).toLowerCase()} desk is active.</strong><span>New work for {partner?.serviceArea || partner?.city || "your service area"} appears as soon as it’s ready.</span></div>
        <Link to="/available" className="welcome-link">Browse orders <ArrowRight size={15} /></Link>
        <div className="welcome-decoration">LT<span>·</span></div>
      </section>
      <section className="stats-grid" aria-label="Partner performance">
        <StatCard label="Available orders" value={data.available.length} note="Ready for you to accept" Icon={PackageCheck} tone="blue" href="/available" />
        <StatCard label="Active assignments" value={activeOrders.length} note="Orders in progress" Icon={Truck} tone="green" href="/assigned" />
        <StatCard label="Earned this month" value={money(monthEarnings)} note="Based on completed tasks" Icon={Banknote} tone="amber" href="/earnings" />
        <StatCard label="Total paid out" value={money(data.summary.paid)} note="Payouts received" Icon={ArrowDownLeft} tone="navy" href="/earnings" />
      </section>
      <section className="dashboard-grid">
        <div className="panel recent-panel">
          <div className="panel-heading"><div><h2>Latest assignments</h2><p>Your most recent order activity</p></div><Link to="/assigned" className="text-link">View all <ArrowRight size={15} /></Link></div>
          {activeOrders.length ? <div className="recent-list">{activeOrders.slice(0, 4).map((order) => <OrderListRow key={order._id} order={order} />)}</div> : <EmptyState compact Icon={PackageCheck} title="Nothing on your route yet" description="Accepted orders will show up here." action={<Link to="/available" className="text-link">Find an order <ArrowRight size={14} /></Link>} />}
        </div>
        <div className="panel earnings-panel">
          <div className="panel-heading"><div><h2>Earnings overview</h2><p>Your partner balance</p></div><span className="panel-icon"><Wallet size={17} /></span></div>
          <div className="earnings-total">{money(data.summary.total)}<small>lifetime earned</small></div>
          <div className="earnings-split"><div><span className="earnings-dot pending-dot" /><span>Pending</span><strong>{money(data.summary.pending)}</strong></div><div><span className="earnings-dot paid-dot" /><span>Paid out</span><strong>{money(data.summary.paid)}</strong></div></div>
          <Link to="/earnings" className="earnings-link">See earnings details <ArrowUpRight size={15} /></Link>
        </div>
      </section>
      <div className="ops-footnote"><span><ShieldCheck size={16} /></span><p><strong>Every order, one clear next step.</strong> Update order progress as you work so customers know exactly where they stand.</p><Link to="/assigned">View assignments <ArrowRight size={14} /></Link></div>
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
  const action = async (order, kind, value) => {
    setWorking(order._id);
    setActionError("");
    try {
      if (kind === "accept") await API.post(`/partner/orders/${order._id}/accept`, {});
      else await API.patch(`/partner/orders/${order._id}/status`, { status: value });
      await data.refresh();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally { setWorking(""); }
  };
  const statusesInList = [...new Set(orders.map((order) => order.status))];
  return <>
    <PageIntro eyebrow={available ? "WORK NEAR YOU" : "YOUR ACTIVE WORK"} title={available ? "Available orders" : "My assignments"} description={available ? "Pick up the next order that fits your service area." : "Keep every accepted order moving to its next milestone."}>
      <div className="order-total"><span>{orders.length}</span> {available ? "open" : "assigned"} {orders.length === 1 ? "order" : "orders"}</div>
    </PageIntro>
    {actionError && <ErrorBanner message={actionError} onClose={() => setActionError("")} />}
    {data.error && <ErrorBanner message={data.error} retry={data.refresh} />}
    <div className="orders-toolbar">
      <label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order, customer or area" /><kbd>⌘ K</kbd></label>
      <label className="filter-box"><Filter size={16} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{statusesInList.map((status) => <option key={status} value={status}>{statuses[status] || status}</option>)}</select><ChevronDown size={14} /></label>
    </div>
    {data.loading ? <LoadingState label={available ? "Finding available orders" : "Loading your assignments"} /> : filtered.length ? <div className="orders-list">
      {filtered.map((order) => {
        const statusAction = !available && nextStatus(partner?.category, order.status);
        return <OrderCard key={order._id} order={order} available={available} action={statusAction} busy={working === order._id} onAccept={() => action(order, "accept")} onStatus={(status) => action(order, "status", status)} />;
      })}
    </div> : <EmptyState Icon={available ? Search : PackageCheck} title={available ? query || statusFilter !== "all" ? "No matching orders" : "No new orders in your area" : query || statusFilter !== "all" ? "No matching assignments" : "Your assignments will appear here"} description={available ? query || statusFilter !== "all" ? "Try adjusting your search or status filter." : "You’re all caught up. New work will appear here when it matches your service." : query || statusFilter !== "all" ? "Try another search or choose a different status." : "Accept an available order and you’ll find it here."} action={available ? null : <Link to="/available" className="button button-secondary">Browse available orders <ArrowRight size={15} /></Link>} />}
    </>;
}

function OrderCard({ order, available, action, busy, onAccept, onStatus }) {
  const date = order.customerDetails?.pickupDate;
  const itemCount = order.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  return <article className="order-card">
    <div className="order-card-head">
      <div className="order-ref"><span>ORDER</span><strong>#{orderNumber(order)}</strong><span className="order-date"><CalendarDays size={13} /> {shortDate(date)}</span></div>
      <StatusBadge status={order.status} />
    </div>
    <div className="order-card-main">
      <div className="order-customer-block"><div className="customer-avatar">{customerName(order).split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div><div><strong>{customerName(order)}</strong><span>{order.customerDetails?.phone || order.user?.phone || "Phone unavailable"}</span></div></div>
      <div className="order-info"><MapPin size={16} /><div><span>Service address</span><strong>{locationText(order) || "Address not provided"}</strong></div></div>
      <div className="order-info"><Shirt size={16} /><div><span>Order items</span><strong>{itemCount || order.items?.length || 0} pieces <i>·</i> {order.items?.map((item) => item.name).filter(Boolean).slice(0, 2).join(", ") || "Laundry service"}</strong></div></div>
      <div className="order-value"><span>Order value</span><strong>{money(order.totalAmount)}</strong></div>
    </div>
    <div className="order-card-foot">
      <div className="order-foot-meta"><span><Clock3 size={14} /> {order.customerDetails?.pickupTime || "Time flexible"}</span>{order.customerDetails?.city && <span><MapPin size={13} /> {order.customerDetails.city}</span>}</div>
      <div className="order-actions">
        {available ? <button className="button button-primary button-small" disabled={busy} onClick={onAccept}>{busy ? <><span className="button-loader" /> Accepting</> : <>Accept order <ArrowRight size={15} /></>}</button> : action ? <button className={`button button-small ${action[0] === "delivered" ? "button-success" : "button-primary"}`} disabled={busy} onClick={() => onStatus(action[0])}>{busy ? <><span className="button-loader" /> Updating</> : <>{action[1]} <ArrowRight size={15} /></>}</button> : <span className="no-action"><CheckCircle2 size={15} /> Up to date</span>}
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
