"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise,
  Buildings,
  CalendarCheck,
  CaretRight,
  ChatCircleText,
  ClipboardText,
  HouseLine,
  MagnifyingGlass,
  MapPin,
  PhoneCall,
  SignOut,
  SquaresFour,
  UsersThree,
  WarningCircle,
  WhatsappLogo,
  UserPlus,
  PlusCircle,
} from "@phosphor-icons/react";

type Lead = {
  id: string;
  name: string;
  phone: string;
  source: string;
  stage: string;
  owner_id: string | null;
  created_at?: string;
  updated_at?: string;
  opted_out?: boolean;
  nurture_paused?: boolean;
};

type Profile = {
  lead: Lead & { opted_out: boolean; nurture_paused: boolean };
  events: { id: string; type: string; created_at: string }[];
  followups: { id: string; body: string; due_at: string; state: string }[];
  activities: { id: string; kind: string; body: string; outcome?: string; due_at?: string; created_at: string }[];
  visits: { id: string; scheduled_at: string; status: string; meeting_point?: string; notes?: string }[];
  documents: { id: string; kind: string; access_class: string; original_name: string; status: string; created_at: string }[];
  messages: { id: string; action: string; state: string; created_at: string }[];
};

type StaffProfile = { id: string; name: string; email: string; role: "admin" | "manager" | "sales" | "viewer"; capacity: number; must_change_password?: boolean };
type StaffRow = StaffProfile & { active: boolean; created_at: string };

const stages = [
  "new",
  "contacted",
  "qualified",
  "visit_scheduled",
  "visited",
  "negotiation",
  "booked",
  "registered",
  "lost",
];

const previewLeads: Lead[] = [
  { id: "sample-1", name: "Ananya Rao", phone: "+91 90000 00001", source: "meta_whatsapp", stage: "new", owner_id: "sample-sales", created_at: "2026-10-20T04:30:00Z" },
  { id: "sample-2", name: "Karthik Iyer", phone: "+91 90000 00002", source: "website", stage: "visit_scheduled", owner_id: "sample-sales", created_at: "2026-10-19T08:15:00Z" },
  { id: "sample-3", name: "Meera Nair", phone: "+91 90000 00003", source: "housing", stage: "qualified", owner_id: "sample-sales", created_at: "2026-10-18T06:10:00Z" },
  { id: "sample-4", name: "Rohan Shah", phone: "+91 90000 00004", source: "manual", stage: "new", owner_id: null, created_at: "2026-10-17T11:40:00Z" },
  { id: "sample-5", name: "Diya Menon", phone: "+91 90000 00005", source: "meta_whatsapp", stage: "contacted", owner_id: "sample-sales", created_at: "2026-10-16T03:20:00Z" },
];

const pretty = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—";
const todayLabel = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "2-digit", month: "long", timeZone: "Asia/Kolkata" }).format(new Date()).toUpperCase();

export function Dashboard({ preview = false }: { preview?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [staff, setStaff] = useState<StaffProfile | null>(preview ? { id: "preview-admin", name: "Aloka Administrator", email: "admin@alokadevelopers.com", role: "admin", capacity: 1000 } : null);
  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [leads, setLeads] = useState<Lead[]>(preview ? previewLeads : []);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [followupOpen, setFollowupOpen] = useState(false);
  const [followupAt, setFollowupAt] = useState("");
  const [followupBody, setFollowupBody] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityKind, setActivityKind] = useState("call");
  const [activityBody, setActivityBody] = useState("");
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitAt, setVisitAt] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("Kadugodi Metro Station");
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", phone: "", consent: false, evidence: "Manual entry with customer permission" });
  const [staffForm, setStaffForm] = useState({ name: "Priya", email: "priya@alokadevelopers.com", role: "sales", capacity: 100, password: "" });
  const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const pageSize = 50;

  useEffect(() => {
    if (preview) return;
    const saved = sessionStorage.getItem("aloka_crm_session");
    if (!saved) return;
    const parsed = JSON.parse(saved) as { token: string; staff: StaffProfile };
    setToken(parsed.token);
    setStaff(parsed.staff);
    load(parsed.token, 0).catch(() => {
      sessionStorage.removeItem("aloka_crm_session");
      setToken("");
      setStaff(null);
    });
  }, [preview]);

  const visibleLeads = useMemo(() => leads.filter((lead) => {
    const matchesText = `${lead.name} ${lead.phone} ${lead.source}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesText && (stageFilter === "all" || lead.stage === stageFilter);
  }), [leads, query, stageFilter]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${url}/v1/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      setPassword("");
      setToken(result.token);
      setStaff(result.staff);
      sessionStorage.setItem("aloka_crm_session", JSON.stringify({ token: result.token, staff: result.staff }));
      await load(result.token, 0);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in. Check your account and connection.");
    } finally {
      setBusy(false);
    }
  }

  async function load(accessToken = token, nextPage = page) {
    setError("");
    if (preview) {
      setLeads(previewLeads);
      return;
    }
    const response = await fetch(`${url}/v1/leads?limit=${pageSize}&offset=${nextPage * pageSize}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error("Unable to load leads. Your session may have expired.");
    const rows = await response.json() as Lead[];
    setLeads(rows);
    setPage(nextPage);
    setHasMore(rows.length === pageSize);
  }

  async function detail(id: string) {
    setError("");
    if (preview) {
      const lead = previewLeads.find((item) => item.id === id);
      if (lead) setSelected({
        lead: { ...lead, opted_out: false, nurture_paused: false },
        events: [
          { id: "sample-event-2", type: "followup.scheduled", created_at: "2026-10-20T05:10:00Z" },
          { id: "sample-event-1", type: "lead.created", created_at: lead.created_at || "2026-10-19T04:30:00Z" },
        ],
        followups: [{ id: "sample-followup", body: "Confirm a convenient time to discuss the site visit.", due_at: "2026-10-21T05:30:00Z", state: "pending" }],
        activities: [{ id: "sample-activity", kind: "call", body: "Discussed connectivity and weekend availability.", outcome: "Interested in a site visit", created_at: "2026-10-20T05:00:00Z" }],
        visits: lead.stage === "visit_scheduled" ? [{ id: "sample-visit", scheduled_at: "2026-10-25T04:30:00Z", status: "scheduled", meeting_point: "Kadugodi Metro Station" }] : [],
        documents: [],
        messages: [],
      });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${url}/v1/leads/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error();
      setSelected(await response.json());
    } catch {
      setError("Unable to load lead details.");
    } finally {
      setBusy(false);
    }
  }

  async function updateStage(stage: string) {
    if (!selected) return;
    if (preview) {
      setSelected({ ...selected, lead: { ...selected.lead, stage } });
      setLeads((current) => current.map((lead) => lead.id === selected.lead.id ? { ...lead, stage } : lead));
      setNotice("Preview updated locally.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${url}/v1/leads/${selected.lead.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!response.ok) throw new Error();
      const lead = await response.json() as Lead;
      setSelected({ ...selected, lead: { ...selected.lead, ...lead } });
      setLeads((current) => current.map((item) => item.id === lead.id ? lead : item));
      setNotice("Stage updated.");
    } catch {
      setError("Unable to update the stage.");
    } finally {
      setBusy(false);
    }
  }

  async function scheduleFollowup(event: FormEvent) {
    event.preventDefault();
    if (!selected || !followupAt || !followupBody.trim()) return;
    setBusy(true);
    setError("");
    try {
      const dueAt = new Date(followupAt).toISOString();
      if (!preview) {
        const response = await fetch(`${url}/v1/leads/${selected.lead.id}/followups`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ key: `manual-${Date.now()}`, dueAt, body: followupBody.trim() }),
        });
        if (!response.ok) throw new Error();
      }
      setSelected({ ...selected, followups: [{ id: `local-${Date.now()}`, body: followupBody.trim(), due_at: dueAt, state: "pending" }, ...selected.followups] });
      setFollowupOpen(false);
      setFollowupAt("");
      setFollowupBody("");
      setNotice(preview ? "Preview follow-up added locally." : "Follow-up scheduled.");
    } catch {
      setError("Unable to schedule the follow-up.");
    } finally {
      setBusy(false);
    }
  }

  async function addActivity(event: FormEvent) {
    event.preventDefault();
    if (!selected || !activityBody.trim()) return;
    setBusy(true); setError("");
    try {
      let activity = { id: `local-${Date.now()}`, kind: activityKind, body: activityBody.trim(), created_at: new Date().toISOString() };
      if (!preview) {
        const response = await fetch(`${url}/v1/leads/${selected.lead.id}/activities`, { method:"POST", headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" }, body:JSON.stringify({ kind:activityKind, body:activityBody.trim() }) });
        if (!response.ok) throw new Error();
        activity = await response.json();
      }
      setSelected({ ...selected, activities:[activity, ...selected.activities] });
      setActivityBody(""); setActivityOpen(false); setNotice(preview ? "Preview activity added locally." : "Activity recorded.");
    } catch { setError("Unable to record the activity."); } finally { setBusy(false); }
  }

  async function scheduleVisit(event: FormEvent) {
    event.preventDefault();
    if (!selected || !visitAt) return;
    setBusy(true); setError("");
    try {
      let visit = { id:`local-${Date.now()}`, scheduled_at:new Date(visitAt).toISOString(), status:"scheduled", meeting_point:meetingPoint };
      if (!preview) {
        const response = await fetch(`${url}/v1/leads/${selected.lead.id}/site-visits`, { method:"POST", headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" }, body:JSON.stringify({ scheduledAt:visit.scheduled_at, meetingPoint }) });
        if (!response.ok) throw new Error();
        visit = await response.json();
      }
      const updatedLead = { ...selected.lead, stage:"visit_scheduled" };
      setSelected({ ...selected, lead:updatedLead, visits:[visit, ...selected.visits] });
      setLeads((current) => current.map((lead) => lead.id === updatedLead.id ? { ...lead, stage:"visit_scheduled" } : lead));
      setVisitAt(""); setVisitOpen(false); setNotice(preview ? "Preview visit added locally." : "Site visit scheduled.");
    } catch { setError("Unable to schedule the site visit."); } finally { setBusy(false); }
  }

  async function quickSend(action: string) {
    if (!selected || preview) { setNotice("Messaging stays disconnected in preview mode."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(`${url}/v1/leads/${selected.lead.id}/quick-send`, { method:"POST", headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" }, body:JSON.stringify({ action }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send message.");
      setSelected({ ...selected, messages:[{ id:result.id, action, state:result.state, created_at:new Date().toISOString() }, ...selected.messages] });
      setNotice("WhatsApp action sent.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to send message."); } finally { setBusy(false); }
  }

  async function signOut() {
    if (token) await fetch(`${url}/v1/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
    sessionStorage.removeItem("aloka_crm_session");
    setToken("");
    setStaff(null);
    setLeads([]);
    setSelected(null);
    setNotice("");
  }

  async function openAdmin() {
    setAdminOpen(true);
    if (preview) {
      setStaffRows([{ id: "sample-sales", name: "Priya", email: "priya@alokadevelopers.com", role: "sales", capacity: 100, active: true, created_at: new Date().toISOString() }]);
      return;
    }
    const response = await fetch(`${url}/v1/staff`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) { setError("Unable to load staff accounts."); return; }
    setStaffRows(await response.json());
  }

  async function addLead(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (preview) { setNotice("Preview lead entry is disabled."); return; }
      const response = await fetch(`${url}/v1/leads`, { method:"POST", headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" }, body:JSON.stringify({ name:leadForm.name, phone:leadForm.phone, project:"aloka-green-county", source:"manual", consent:{ whatsapp:leadForm.consent, evidence:leadForm.evidence }, attribution:{ enteredBy:staff?.email || "crm" } }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to add lead.");
      setLeadForm({ name:"", phone:"", consent:false, evidence:"Manual entry with customer permission" });
      await load(token, 0); setNotice(result.duplicate ? "Existing Green County lead found." : "Lead added and assigned.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to add lead."); } finally { setBusy(false); }
  }

  async function addStaff(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (preview) { setNotice("Preview staff creation is disabled."); return; }
      const response = await fetch(`${url}/v1/staff`, { method:"POST", headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" }, body:JSON.stringify({ ...staffForm, capacity:Number(staffForm.capacity) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to create staff account.");
      setStaffRows((current) => [result, ...current]);
      setStaffForm({ name:"", email:"", role:"sales", capacity:100, password:"" }); setNotice("Staff account created.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create staff account."); } finally { setBusy(false); }
  }

  const signedIn = Boolean(token) || preview;

  return (
    <div className="app-shell">
      <aside className={menuOpen ? "sidebar sidebar-open" : "sidebar"}>
        <div className="logo-lockup"><img src="/brand/aloka-logo.png" alt="Aloka Developers Private Limited" /></div>
        <nav aria-label="Primary navigation">
          <p>Workspace</p>
          <a className="active" href="#dashboard"><SquaresFour size={18} weight="duotone" />Dashboard</a>
          <p>CRM</p>
          <a href="#leads"><UsersThree size={18} weight="duotone" />Leads <em>{leads.length || ""}</em></a>
          <a className="disabled" href="#followups" aria-disabled="true"><ChatCircleText size={18} weight="duotone" />Follow-ups</a>
          <a className="disabled" href="#visits" aria-disabled="true"><CalendarCheck size={18} weight="duotone" />Site visits</a>
          {(staff?.role === "admin" || staff?.role === "manager") && <><p>Administration</p><button className="nav-button" onClick={openAdmin}><UserPlus size={18} weight="duotone" />Staff &amp; access</button></>}
          <p>Sales</p>
          <a className="disabled" href="#inventory" aria-disabled="true"><Buildings size={18} weight="duotone" />Inventory</a>
          <a className="disabled" href="#quotations" aria-disabled="true"><ClipboardText size={18} weight="duotone" />Quotations</a>
          <a className="disabled" href="#bookings" aria-disabled="true"><HouseLine size={18} weight="duotone" />Bookings</a>
        </nav>
        <div className="sidebar-footer"><span className="avatar small">{staff ? initials(staff.name) : "AD"}</span><span><b>{staff?.name || "Aloka workspace"}</b><small>{preview ? "Preview mode" : staff ? pretty(staff.role) : "Private access"}</small></span></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu secondary-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">Menu</button>
          <div className="breadcrumbs"><span>Aloka CRM</span><i>/</i><b>Dashboard</b></div>
          <div className="top-actions">
            <span className="status-dot"><i />Systems ready</span>
            {signedIn && !preview && <button className="text-button icon-button" onClick={signOut}><SignOut size={17} />Sign out</button>}
            <span className="avatar">{staff ? initials(staff.name) : "AD"}</span>
          </div>
        </header>

        {preview && <div role="status" className="preview-banner"><b>Local preview</b><span>Sample records only. Messaging and live services are disconnected.</span></div>}
        {notice && <div role="status" className="toast" onAnimationEnd={() => setNotice("")}>{notice}</div>}

        {!signedIn ? (
          <section className="auth-wrap">
            <div className="auth-copy"><span className="eyebrow">PRIVATE TEAM WORKSPACE</span><h1>Clarity for every<br />conversation.</h1><p>Manage enquiries, next actions and the complete sales journey with one accountable source of truth.</p></div>
            <form className="login-card" onSubmit={login}>
              <span className="eyebrow">SECURE ACCESS</span><h2>Sign in to Aloka CRM</h2><p>Use your provisioned staff account.</p>
              <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@alokadevelopers.com" /></label>
              <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label>
              <button className="primary-button full" disabled={busy}>{busy ? "Signing in…" : "Sign in securely"}</button>
              {error && <p role="alert" className="inline-error">{error}</p>}
              <small>Access is restricted to authorised Aloka staff.</small>
            </form>
          </section>
        ) : (
          <div className="content" id="dashboard">
            <section className="page-heading">
              <div><span className="eyebrow">{todayLabel}</span><h1>Good morning.</h1><p>Here is what needs attention across Aloka Green County.</p></div>
              <div className="heading-actions"><button className="primary-button icon-button" onClick={() => setLeadOpen(true)}><PlusCircle size={17} />Add lead</button><button className="secondary-button icon-button" onClick={() => load().catch((reason) => setError(reason.message))} disabled={busy}><ArrowClockwise size={17} />Refresh data</button></div>
            </section>

            <section className="project-spotlight" aria-label="Current project">
              <img src="/brand/green-county-aerial.png" alt="Aerial view representing a developed villa plot community near Bengaluru" />
              <div className="project-shade" />
              <div className="project-copy"><span className="project-kicker"><MapPin size={15} weight="fill" />ARASANAHALLI · STRR-WHITEFIELD EXIT</span><h2>Aloka Green County</h2><p>Devanagonthi, East Bengaluru · STRR just 2 km away</p></div>
              <div className="project-status"><span><i />Active project</span><b>{leads.length}</b><small>accessible leads</small></div>
            </section>

            <section className="metrics" aria-label="Lead overview">
              <article><div className="metric-head"><span>Accessible leads</span><i className="metric-icon lavender"><UsersThree size={19} weight="duotone" /></i></div><strong>{leads.length}</strong><small>Current page</small></article>
              <article><div className="metric-head"><span>New enquiries</span><i className="metric-icon cyan"><ChatCircleText size={19} weight="duotone" /></i></div><strong>{leads.filter((lead) => lead.stage === "new").length}</strong><small className="accent">Awaiting first action</small></article>
              <article><div className="metric-head"><span>Visits scheduled</span><i className="metric-icon green"><CalendarCheck size={19} weight="duotone" /></i></div><strong>{leads.filter((lead) => lead.stage === "visit_scheduled").length}</strong><small>Ready for coordination</small></article>
              <article><div className="metric-head"><span>Needs assignment</span><i className="metric-icon amber"><WarningCircle size={19} weight="duotone" /></i></div><strong>{leads.filter((lead) => !lead.owner_id).length}</strong><small className={leads.some((lead) => !lead.owner_id) ? "warning" : ""}>Manager queue</small></article>
            </section>

            <section className="panel" id="leads">
              <div className="panel-heading"><div><span className="eyebrow">CRM / LEADS</span><h2>Lead register</h2><p>People and enquiries you are authorised to access.</p></div><span className="record-count">{visibleLeads.length} records</span></div>
              <div className="toolbar">
                <label className="search-field"><span>Search</span><MagnifyingGlass className="search-icon" size={17} /><input aria-label="Search leads" placeholder="Search name, phone or source…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
                <label className="filter-field"><span>Stage</span><select aria-label="Filter by stage" value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="all">All stages</option>{stages.map((stage) => <option key={stage} value={stage}>{pretty(stage)}</option>)}</select></label>
              </div>

              <div className="table-wrap">
                <table>
                  <thead><tr><th>Person</th><th>Source</th><th>Stage</th><th>Assigned</th><th>Added</th><th><span className="sr-only">Action</span></th></tr></thead>
                  <tbody>{visibleLeads.map((lead) => (
                    <tr key={lead.id} onClick={() => detail(lead.id)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") detail(lead.id); }}>
                      <td><div className="person-cell"><span className="avatar lead-avatar">{initials(lead.name)}</span><span><b>{lead.name}</b><small>{lead.phone}</small></span></div></td>
                      <td><span className="source-label">{pretty(lead.source)}</span></td>
                      <td><span className={`stage stage-${lead.stage}`}>{pretty(lead.stage)}</span></td>
                      <td>{lead.owner_id ? <span className="assignment"><i />Assigned</span> : <span className="unassigned">Unassigned</span>}</td>
                      <td>{formatDate(lead.created_at)}</td>
                      <td><button className="row-action" onClick={(event) => { event.stopPropagation(); detail(lead.id); }} aria-label={`Open ${lead.name}`}>View <CaretRight size={14} /></button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {!visibleLeads.length && <div className="empty-state"><span><MagnifyingGlass size={20} /></span><h3>No matching records</h3><p>Adjust the search or stage filter to see more results.</p></div>}
              {!preview && <div className="pagination"><span>Page {page + 1}</span><div><button className="secondary-button" disabled={page === 0 || busy} onClick={() => load(token, page - 1).catch((reason) => setError(reason.message))}>Previous</button><button className="secondary-button" disabled={!hasMore || busy} onClick={() => load(token, page + 1).catch((reason) => setError(reason.message))}>Next</button></div></div>}
            </section>
          </div>
        )}

        {error && signedIn && <div role="alert" className="error-banner"><b>Something went wrong</b><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error">Dismiss</button></div>}
      </main>

      {selected && <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
        <aside className="detail-drawer" aria-label="Lead detail">
          <div className="drawer-head"><div><span className="eyebrow">LEAD PROFILE</span><h2>{selected.lead.name}</h2><p>{selected.lead.phone}</p></div><button className="close-button" onClick={() => setSelected(null)} aria-label="Close profile">Close</button></div>
          <div className="profile-summary"><span className="avatar profile-avatar">{initials(selected.lead.name)}</span><div><b>{selected.lead.name}</b><span>{pretty(selected.lead.source)} · {formatDate(selected.lead.created_at)}</span></div></div>
          <div className="detail-section"><label>Pipeline stage<select value={selected.lead.stage} onChange={(event) => updateStage(event.target.value)} disabled={busy}>{stages.map((stage) => <option key={stage} value={stage}>{pretty(stage)}</option>)}</select></label></div>
          {(selected.lead.opted_out || selected.lead.nurture_paused) && <div className="suppression"><b>Automated follow-ups restricted</b><span>{selected.lead.opted_out ? "This person has opted out." : "Automation is paused after an incoming reply."}</span></div>}
          <div className="drawer-tabs"><a href="#next-actions">Next actions</a><a href="#activity">Activity</a><a href="#visits">Visits</a></div>
          <section className="detail-section" id="next-actions"><div className="detail-title"><h3>Next actions</h3><button className="secondary-button compact" onClick={() => setFollowupOpen(true)}>Schedule follow-up</button></div>{selected.followups.length === 0 ? <p className="muted">No follow-ups scheduled.</p> : selected.followups.map((item) => <article className="timeline-item" key={item.id}><i className={`timeline-dot state-${item.state}`} /><div><div className="timeline-title"><b>{pretty(item.state)}</b><time>{formatDate(item.due_at)}</time></div><p>{item.body}</p></div></article>)}</section>
          <section className="detail-section quick-actions"><h3><WhatsappLogo size={19} weight="fill" />WhatsApp quick-send</h3><p className="muted">Approved, concise actions only. Consent and opt-out checks run before delivery.</p><div className="action-grid"><button className="secondary-button compact icon-button" disabled={busy || selected.lead.opted_out} onClick={() => quickSend("share_brochure")}><ClipboardText size={16} />Share brochure</button><button className="secondary-button compact icon-button" disabled={busy || selected.lead.opted_out} onClick={() => quickSend("confirm_site_visit")}><CalendarCheck size={16} />Confirm visit</button><button className="secondary-button compact icon-button" disabled={busy || selected.lead.opted_out} onClick={() => quickSend("share_location")}><MapPin size={16} />Share location</button><button className="secondary-button compact icon-button" disabled={busy || selected.lead.opted_out} onClick={() => quickSend("request_callback")}><PhoneCall size={16} />Request callback</button></div></section>
          <section className="detail-section" id="activity"><div className="detail-title"><h3>Activity</h3><button className="secondary-button compact" onClick={() => setActivityOpen(true)}>Add activity</button></div>{selected.activities.length === 0 && <p className="muted">No calls, notes or tasks recorded.</p>}{selected.activities.map((item) => <article className="timeline-item" key={item.id}><i className="timeline-dot" /><div><div className="timeline-title"><b>{pretty(item.kind)}</b><time>{formatDate(item.created_at)}</time></div><p>{item.body}</p>{item.outcome && <small>{item.outcome}</small>}</div></article>)}</section>
          <section className="detail-section" id="visits"><div className="detail-title"><h3>Site visits</h3><button className="primary-button compact" onClick={() => setVisitOpen(true)}>Schedule visit</button></div>{selected.visits.length === 0 && <p className="muted">No site visits scheduled.</p>}{selected.visits.map((visit) => <article className="visit-row" key={visit.id}><div><b>{formatDate(visit.scheduled_at)}</b><span>{visit.meeting_point || "Meeting point not set"}</span></div><span className={`stage stage-${visit.status}`}>{pretty(visit.status)}</span></article>)}</section>
          <section className="detail-section"><h3>Audit history</h3>{selected.events.map((item) => <article className="timeline-item" key={item.id}><i className="timeline-dot" /><div><div className="timeline-title"><b>{pretty(item.type.replaceAll(".", " "))}</b><time>{formatDate(item.created_at)}</time></div></div></article>)}</section>
        </aside>
      </div>}

      {followupOpen && selected && <div className="modal-backdrop"><form className="modal" onSubmit={scheduleFollowup}><span className="eyebrow">NEXT ACTION</span><h2>Schedule follow-up</h2><p>Set one clear action for {selected.lead.name}.</p><label>Date and time<input type="datetime-local" required value={followupAt} onChange={(event) => setFollowupAt(event.target.value)} /></label><label>Note<textarea required maxLength={1000} value={followupBody} onChange={(event) => setFollowupBody(event.target.value)} placeholder="What should the team do next?" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setFollowupOpen(false)}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Schedule"}</button></div></form></div>}
      {activityOpen && selected && <div className="modal-backdrop"><form className="modal" onSubmit={addActivity}><span className="eyebrow">ACTIVITY</span><h2>Record an update</h2><p>Keep the team’s next decision grounded in the conversation.</p><label>Type<select value={activityKind} onChange={(event) => setActivityKind(event.target.value)}><option value="call">Call</option><option value="note">Note</option><option value="task">Task</option></select></label><label>Details<textarea required maxLength={2000} value={activityBody} onChange={(event) => setActivityBody(event.target.value)} placeholder="Record the useful outcome or next action." /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setActivityOpen(false)}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save activity"}</button></div></form></div>}
      {visitOpen && selected && <div className="modal-backdrop"><form className="modal" onSubmit={scheduleVisit}><span className="eyebrow">SITE VISIT</span><h2>Schedule a visit</h2><p>Choose a time and one approved meeting point.</p><label>Date and time<input type="datetime-local" required value={visitAt} onChange={(event) => setVisitAt(event.target.value)} /></label><label>Meeting point<select value={meetingPoint} onChange={(event) => setMeetingPoint(event.target.value)}><option>Hope Farm</option><option>Kadugodi Metro Station</option><option>Hoskote Toll Gate</option><option>Chikka Tirupathi Temple</option><option>Sarjapur Police Station</option><option>Corporate Office in Kammasandra</option><option>Self-drive</option></select></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setVisitOpen(false)}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Schedule visit"}</button></div></form></div>}
      {leadOpen && <div className="modal-backdrop"><form className="modal" onSubmit={addLead}><span className="eyebrow">LEAD INTAKE</span><h2>Add a Green County enquiry</h2><p>Phone and project are checked for duplicates before a record is created.</p><label>Full name<input required maxLength={150} value={leadForm.name} onChange={(event) => setLeadForm({ ...leadForm, name:event.target.value })} placeholder="Use the person’s genuine name" /></label><label>Mobile number<input required inputMode="tel" value={leadForm.phone} onChange={(event) => setLeadForm({ ...leadForm, phone:event.target.value })} placeholder="10-digit mobile number" /></label><label className="check-row"><input type="checkbox" checked={leadForm.consent} onChange={(event) => setLeadForm({ ...leadForm, consent:event.target.checked })} /><span>Customer consented to WhatsApp communication</span></label><label>Consent evidence<input required maxLength={500} value={leadForm.evidence} onChange={(event) => setLeadForm({ ...leadForm, evidence:event.target.value })} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setLeadOpen(false)}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Add lead"}</button></div></form></div>}
      {adminOpen && (staff?.role === "admin" || staff?.role === "manager") && <div className="modal-backdrop admin-backdrop"><section className="admin-panel"><div className="drawer-head"><div><span className="eyebrow">ADMINISTRATION</span><h2>Staff and access</h2><p>Provision individual accounts. Shared credentials are not permitted.</p></div><button className="close-button" onClick={() => setAdminOpen(false)}>Close</button></div>{staff?.role === "admin" && <form className="staff-form" onSubmit={addStaff}><label>Name<input required value={staffForm.name} onChange={(event) => setStaffForm({ ...staffForm, name:event.target.value })} /></label><label>Email<input type="email" required value={staffForm.email} onChange={(event) => setStaffForm({ ...staffForm, email:event.target.value })} /></label><label>Role<select value={staffForm.role} onChange={(event) => setStaffForm({ ...staffForm, role:event.target.value })}><option value="sales">Sales</option><option value="manager">Manager</option><option value="viewer">Viewer</option><option value="admin">Administrator</option></select></label><label>Capacity<input type="number" min="1" max="1000" required value={staffForm.capacity} onChange={(event) => setStaffForm({ ...staffForm, capacity:Number(event.target.value) })} /></label><label className="password-field">Temporary password<input type="password" minLength={12} required value={staffForm.password} onChange={(event) => setStaffForm({ ...staffForm, password:event.target.value })} placeholder="At least 12 characters" /></label><button className="primary-button icon-button" disabled={busy}><UserPlus size={17} />Create account</button></form>}<div className="staff-list"><div className="staff-list-head"><b>Active directory</b><span>{staffRows.length} accounts</span></div>{staffRows.map((member) => <article key={member.id}><span className="avatar lead-avatar">{initials(member.name)}</span><div><b>{member.name}</b><small>{member.email}</small></div><span className={`role-label role-${member.role}`}>{pretty(member.role)}</span><small>{member.capacity} lead capacity</small></article>)}</div></section></div>}
    </div>
  );
}

export default function Page() { return <Dashboard />; }
