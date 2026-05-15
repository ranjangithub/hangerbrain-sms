"use client";

import { useEffect, useMemo, useState } from "react";

import { hbFetch } from "@/lib/hangarbrain-api";

interface SessionUser {
  auth_id: string;
  email: string;
  name: string;
  mode: string;
  provider: string;
}

interface OrganizationRead {
  id: string;
  name: string;
  operator_type: string | null;
  plan_tier: string;
}

interface OrganizationMemberRead {
  id: string;
  user_id: string;
  role: string;
}

type JobStatus = "open" | "accepted" | "in_progress" | "completed" | "cancelled";

interface JobAssignmentRead {
  id: string;
  title: string;
  status: JobStatus;
  priority: "low" | "medium" | "high" | "critical";
  tail_number: string | null;
  component: string | null;
  assigned_to_user_id: string | null;
  accepted_by_user_id: string | null;
  created_by_user_id: string;
  updated_at: string;
}

interface WatchFeedRecord {
  id: string;
  watch_label: string;
  severity_label: string | null;
  narrative_excerpt: string | null;
  source_year: number | null;
}

interface WatchFeedResponse {
  total: number;
  new_count: number;
  records: WatchFeedRecord[];
}

interface ComplianceItem {
  item_type: string;
  item_number: string;
  title: string;
}

interface FleetComplianceStatus {
  item: ComplianceItem;
  overdue_count: number;
  pending_count: number;
}

interface SearchResult {
  id: string;
  source_reference: string;
  source_year: number;
  aircraft_make_norm: string;
  aircraft_model_norm: string;
  component_norm: string;
  severity_label: string;
  narrative_excerpt: string;
}

interface SearchResponse {
  total: number;
  results: SearchResult[];
}

interface SmsSnapshot {
  session: SessionUser;
  organization: OrganizationRead;
  members: OrganizationMemberRead[];
  jobs: JobAssignmentRead[];
  watchFeed: WatchFeedResponse;
  fleetStatus: FleetComplianceStatus[];
  search: SearchResponse;
}

const MANAGER_ROLES = new Set(["admin", "manager", "inspector"]);
const APP_URL = process.env.NEXT_PUBLIC_HB_APP_URL || "http://localhost:3001";

function formatMember(userId: string | null | undefined, members: OrganizationMemberRead[]): string {
  if (!userId) return "—";
  const match = members.find((row) => row.user_id === userId);
  return match ? `${match.user_id} (${match.role})` : userId;
}

export default function Home() {
  const [snapshot, setSnapshot] = useState<SmsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [session, organization, members, jobs, watchFeed, fleetStatus, search] = await Promise.all([
          hbFetch<SessionUser>("/api/session"),
          hbFetch<OrganizationRead>("/api/organizations/current"),
          hbFetch<OrganizationMemberRead[]>("/api/organizations/members"),
          hbFetch<JobAssignmentRead[]>("/api/job-assignments"),
          hbFetch<WatchFeedResponse>("/api/watchlists/feed"),
          hbFetch<FleetComplianceStatus[]>("/api/compliance/fleet-status"),
          hbFetch<SearchResponse>("/api/search/sdr", {
            method: "POST",
            body: JSON.stringify({ limit: 6, offset: 0 }),
          }),
        ]);

        setSnapshot({
          session,
          organization,
          members,
          jobs,
          watchFeed,
          fleetStatus,
          search,
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load SMS workspace.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const currentMember = useMemo(() => {
    if (!snapshot) return null;
    return snapshot.members.find((m) => m.user_id === snapshot.session.auth_id) ?? null;
  }, [snapshot]);

  const canManageTeamView = currentMember ? MANAGER_ROLES.has(currentMember.role) : false;

  const activeJobs = useMemo(
    () =>
      (snapshot?.jobs ?? [])
        .filter((job) => job.status === "accepted" || job.status === "in_progress")
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [snapshot]
  );

  const openJobs = useMemo(
    () => (snapshot?.jobs ?? []).filter((job) => job.status === "open"),
    [snapshot]
  );

  const overdueCompliance = useMemo(
    () => (snapshot?.fleetStatus ?? []).filter((row) => row.overdue_count > 0),
    [snapshot]
  );

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-6 py-20">
        <p className="text-sm text-slate-500">Loading HangarBrain SMS workspace…</p>
      </main>
    );
  }

  if (error || !snapshot) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">SMS module could not load</h1>
        <p className="text-sm text-rose-700">{error ?? "Unknown error"}</p>
        <p className="text-xs text-slate-600">
          Confirm HangarBrain API is running and CORS includes this app origin.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-6 py-8">
      <header className="sms-card space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
          HangarBrain SMS Module (separate deployable app)
        </p>
        <h1 className="text-2xl font-black text-slate-900">Go beyond checklist compliance</h1>
        <p className="text-sm text-slate-600">
          Build a stronger safety program with one connected workspace for hazards, trends, accountability, and follow-up actions.
        </p>
        <p className="text-sm text-slate-600">
          Connected to <span className="font-semibold">{snapshot.organization.name}</span> ({snapshot.organization.plan_tier} plan), signed in as{" "}
          <span className="font-semibold">{snapshot.session.email}</span>.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
            Role: {currentMember?.role ?? "unknown"}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
            Auth mode: {snapshot.session.mode}/{snapshot.session.provider}
          </span>
          <a
            href={APP_URL}
            className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700 hover:bg-indigo-100"
          >
            Open core HangarBrain app
          </a>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="sms-card">
          <p className="sms-heading">Active assignments</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{activeJobs.length}</p>
          <p className="mt-1 text-xs text-slate-500">Accepted + in progress jobs across team</p>
        </article>
        <article className="sms-card">
          <p className="sms-heading">Open assignments</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{openJobs.length}</p>
          <p className="mt-1 text-xs text-slate-500">Unaccepted jobs that still need assignment</p>
        </article>
        <article className="sms-card">
          <p className="sms-heading">New hazard signals</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{snapshot.watchFeed.new_count}</p>
          <p className="mt-1 text-xs text-slate-500">New matching SDR signals</p>
        </article>
        <article className="sms-card">
          <p className="sms-heading">Overdue compliance items</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{overdueCompliance.length}</p>
          <p className="mt-1 text-xs text-slate-500">AD/SB items with overdue tails</p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="sms-card">
          <p className="sms-heading">Centralized safety platform</p>
          <p className="mt-2 text-sm text-slate-700">
            Bring operational, maintenance, and safety indicators into one decision view.
          </p>
        </article>
        <article className="sms-card">
          <p className="sms-heading">Scalable SMS workflows</p>
          <p className="mt-2 text-sm text-slate-700">
            Standardize how the team captures hazards, assigns owners, and tracks closure.
          </p>
        </article>
        <article className="sms-card">
          <p className="sms-heading">Trend monitoring</p>
          <p className="mt-2 text-sm text-slate-700">
            Catch recurring themes earlier with watchlist and SDR-based safety signals.
          </p>
        </article>
        <article className="sms-card">
          <p className="sms-heading">Action-focused oversight</p>
          <p className="mt-2 text-sm text-slate-700">
            Highlight overdue obligations and active assignments so nothing slips.
          </p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="sms-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Team active jobs</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {activeJobs.length}
            </span>
          </div>
          {!canManageTeamView ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Manager-level team visibility is limited to admin, manager, and inspector roles.
            </p>
          ) : activeJobs.length === 0 ? (
            <p className="text-sm text-slate-500">No team jobs are active right now.</p>
          ) : (
            <div className="space-y-3">
              {activeJobs.slice(0, 8).map((job) => (
                <article key={job.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{job.title}</h3>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                      {job.status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {job.priority}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                    <span>Tail: {job.tail_number || "—"}</span>
                    <span>Component: {job.component || "—"}</span>
                    <span>Assigned: {formatMember(job.assigned_to_user_id, snapshot.members)}</span>
                    <span>Accepted by: {formatMember(job.accepted_by_user_id, snapshot.members)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="sms-card space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Safety signal feed</h2>
          {snapshot.watchFeed.records.length === 0 ? (
            <p className="text-sm text-slate-500">No watchlist alerts yet.</p>
          ) : (
            <div className="space-y-3">
              {snapshot.watchFeed.records.slice(0, 6).map((record) => (
                <article key={record.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {record.watch_label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {record.severity_label || "Unknown severity"} • {record.source_year ?? "n/a"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    {record.narrative_excerpt || "No narrative excerpt available."}
                  </p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="sms-card space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Overdue AD/SB focus</h2>
          {overdueCompliance.length === 0 ? (
            <p className="text-sm text-slate-500">No overdue compliance records right now.</p>
          ) : (
            <div className="space-y-2">
              {overdueCompliance.slice(0, 8).map((row) => (
                <div key={`${row.item.item_type}-${row.item.item_number}`} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-semibold text-slate-900">
                    {row.item.item_type} {row.item.item_number}
                  </p>
                  <p className="text-xs text-slate-600">{row.item.title}</p>
                  <p className="mt-1 text-xs text-rose-700">
                    Overdue tails: {row.overdue_count} • Pending tails: {row.pending_count}
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="sms-card space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Transform data into insight</h2>
          {snapshot.search.results.length === 0 ? (
            <p className="text-sm text-slate-500">No SDR records available yet. Upload SDR data in core app.</p>
          ) : (
            <div className="space-y-3">
              {snapshot.search.results.map((result) => (
                <article key={result.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">
                    {result.source_reference} • {result.source_year}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {result.aircraft_make_norm} {result.aircraft_model_norm} — {result.component_norm}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {result.severity_label}: {result.narrative_excerpt}
                  </p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      <footer className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        HangarBrain / SDR Copilot is an analytical decision-support tool. It does not provide maintenance instructions,
        airworthiness determinations, regulatory compliance decisions, or flight safety approvals. Always consult FAA-approved data,
        manufacturer manuals, service bulletins, Airworthiness Directives, and qualified aviation maintenance professionals.
      </footer>
    </main>
  );
}
