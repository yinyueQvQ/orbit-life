"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  BarChart3,
  Sparkles,
  UserRound,
  Cloud,
  CloudOff,
  HardDrive,
  FileText,
  Timer,
  ChevronDown,
  RefreshCw,
  X,
} from "lucide-react";
import LaunchScreen from "../components/launch-screen";

import ThemeToggle from "../components/theme-toggle";
import JournalPanel from "../components/journal-panel";
import DocumentPlanner from "../components/document-planner";
import ReminderCenter from "../components/reminder-center";
import LoginGate from "../components/login-gate";
import HabitManager from "../components/habit-manager";
import FocusPanel from "../components/focus-panel";
import LedgerManager from "../components/ledger-manager";
import Planner from "../components/planner";
import AccountPanel from "../components/account-panel";
import { CalendarView, Insights, PetView } from "../components/life-views";
import TodayView from "../components/today-view";
import { api, installClient, clearRevision } from "../client/api.mjs";
import "./v2.css";
import "./motion.css";
import "./almanac.css";

const primary = [
  ["today", "今日"],
  ["habits", "习惯"],
  ["ledger", "收支"],
  ["journal", "随心记"],
  ["notes", "备忘"],
] as const;

const secondary = [
  ["focus", "专注", "一段安静的时间", Timer],
  ["calendar", "打卡日历", "回看足迹", CalendarDays],
  ["insights", "数据洞察", "看见变化", BarChart3],
  ["pet", "团团", "有人陪着", Sparkles],
  ["documents", "PDF 计划", "把文件拆成行动", FileText],
  ["forecast", "收入规划", "给下个月留余地", null],
  ["account", "账号与数据", "你的空间", UserRound],
] as const;

const titles: Record<string, [string, string]> = {
  today: ["今天，过得更像自己。", "照顾好今天的小事，未来会慢慢清晰。"],
  habits: ["把坚持，变成日常。", "创建、编辑、搜索习惯，也可以管理每一天的打卡记录。"],
  ledger: ["认真生活，也好好花钱。", "看见每一笔收支，让生活更有底气。"],
  journal: ["把今天，轻轻收好。", "记录见闻、想法与感受，用照片和文字留住今天。"],
  notes: ["把想做的事，慢慢做到。", "把备忘关联到目标，让愿望有一条具体的路。"],
  focus: ["让时间，慢慢成为你的光。", "自定义一段专注，按真实时间计时，每份投入都被记录。"],
  calendar: ["每一天，都有迹可循。", "回看打卡的足迹，记录属于自己的节奏。"],
  insights: ["每一份坚持，都有回响。", "真实的数据，记录那些看似微小的变化。"],
  pet: ["有人陪着，走得更远。", "和团团说说今天，也让它帮你整理生活。"],
  documents: ["把长长的计划，拆成今天的一步。", "从 PDF 梳理行动、核对来源、关联目标，再为每项任务留一段专注时间。"],
  forecast: ["为下个月，留一点从容。", "预计收入与实际账本分开，计划不必假装成现实。"],
  account: ["你的空间，由你掌握。", "管理登录、数据备份、同步与 AI 设置。"],
};

const WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function Home() {
  const [launch, setLaunch] = useState(true),
    [hidden, setHidden] = useState(false);
  const finishLaunch = useCallback(() => setLaunch(false), []);
  const pageHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const [focusRequest, setFocusRequest] = useState<any>(null);
  const [session, setSession] = useState<any>(null),
    [authReady, setAuthReady] = useState(false),
    [data, setData] = useState<any>(null),
    [page, setPage] = useState("today"),
    [more, setMore] = useState(false),
    [error, setError] = useState(""),
    [sync, setSync] = useState<any>({ ok: true, at: 0 }),
    [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    installClient();
    void api("/api/auth/me")
      .then((j: any) => {
        if (j.user) setSession(j);
        else if (localStorage.getItem("orbit.guest") === "yes")
          setSession({ user: null, mode: "guest" });
      })
      .catch(() => {
        if (localStorage.getItem("orbit.guest") === "yes")
          setSession({ user: null, mode: "guest" });
      })
      .finally(() => setAuthReady(true));
    const expired = () => {
      clearRevision();
      setSession(null);
      setData(null);
      setError("登录已过期，请重新登录。");
    };
    const status = (e: any) => setSync(e.detail);
    window.addEventListener("orbit:session-expired", expired);
    window.addEventListener("orbit:sync", status);
    return () => {
      window.removeEventListener("orbit:session-expired", expired);
      window.removeEventListener("orbit:sync", status);
    };
  }, []);
  async function reload() {
    if (!session) return;
    setRefreshing(true);
    try {
      const j: any = await api("/api/life");
      setData(j);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }
  useEffect(() => {
    if (!session) return;
    void reload();
    const refresh = () => {
      if (document.visibilityState === "visible") void reload();
    };
    const id = setInterval(refresh, 20000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("orbit:changed", refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("orbit:changed", refresh);
    };
  }, [session]);
  useEffect(() => {
    const route = (e: any) => {
      if (["notes", "documents", "today"].includes(e.detail))
        setPage(e.detail);
    };
    window.addEventListener("orbit:navigate", route);
    const native = (window as any).OrbitNative;
    if (native?.launchRoute?.() === "notes") setPage("notes");
    return () => window.removeEventListener("orbit:navigate", route);
  }, []);
  useEffect(() => {
    if (!launch && page !== "today")
      pageHeading.current?.focus({ preventScroll: true });
  }, [page, launch]);
  useEffect(() => {
    document.documentElement.dataset.shell = "almanac";
    return () => {
      delete document.documentElement.dataset.shell;
    };
  }, []);
  useEffect(() => {
    if (!more) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMore(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [more]);
  const nav = (value: string) => {
    setPage(value);
    setMore(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const now = new Date();
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const part = (t: string) =>
    dateParts.find((p) => p.type === t)?.value || "";
  const dateNum = part("month") + " / " + part("day");
  const dateWeek = (part("weekday") || "").toUpperCase() + " · " + part("year");
  const secondaryItem = secondary.find(([id]) => id === page);

  if (launch) return <LaunchScreen ready={authReady} onDone={finishLaunch} />;
  if (!session)
    return (
      <LoginGate
        onSuccess={(j) => {
          localStorage.removeItem("orbit.guest");
          clearRevision();
          setFocusRequest(null);
          setSession(j);
          setPage("today");
          setData(null);
        }}
        onGuest={async () => {
          await api("/api/auth/guest", {});
          localStorage.setItem("orbit.guest", "yes");
          clearRevision();
          setSession({ user: null, mode: "guest" });
          setData(null);
        }}
      />
    );

  return (
    <div className={"v2-app alm-app " + (hidden ? "motion-paused" : "")}>
      <header className="alm-masthead">
        <button className="alm-brand" onClick={() => nav("today")}>
          <span className="alm-brand__mark" aria-hidden="true">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
            >
              <circle
                cx="16"
                cy="16"
                r="5.4"
                fill="currentColor"
                stroke="none"
                opacity=".9"
              />
              <ellipse
                cx="16"
                cy="16"
                rx="13"
                ry="5.6"
                transform="rotate(-24 16 16)"
              />
              <ellipse
                cx="16"
                cy="16"
                rx="13"
                ry="5.6"
                transform="rotate(38 16 16)"
                opacity=".5"
              />
              <circle
                cx="26.4"
                cy="9.6"
                r="1.5"
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </span>
          <span className="alm-brand__text">
            <b>
              星历 <i>ORBIT</i>
            </b>
            <small>ALMANAC OF A SMALL LIFE</small>
          </span>
        </button>

        <nav className="alm-tabs" aria-label="一级导航">
          {primary.map(([id, label], i) => (
            <button
              key={id}
              className="alm-tab"
              aria-current={page === id ? "page" : undefined}
              onClick={() => nav(id)}
            >
              <i>0{i + 1}</i>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="alm-actions">
          <div className="alm-date-chip">
            <b>{dateNum}</b>
            <small>{dateWeek}</small>
          </div>
          <button
            className="alm-tool"
            aria-expanded={more}
            aria-controls="alm-secondary"
            onClick={() => setMore(!more)}
          >
            <span>观测台</span>
            <ChevronDown size={13} />
          </button>
          <ThemeToggle />
          {data && (
            <ReminderCenter
              key={session.user?.id || "guest"}
              data={data}
              accountKey={session.user?.id || "guest"}
              onNav={nav}
              onChange={() => void reload()}
            />
          )}
          <span
            className={"alm-sync " + (!sync.ok ? "is-offline" : "")}
            title={sync.at ? new Date(sync.at).toLocaleTimeString() : ""}
          >
            {session.mode === "guest" || session.mode === "local" ? (
              <HardDrive size={13} />
            ) : sync.ok ? (
              <Cloud size={13} />
            ) : (
              <CloudOff size={13} />
            )}
            <span>
              {session.mode === "guest"
                ? "仅本机"
                : session.mode === "local"
                  ? "本机"
                  : sync.ok
                    ? sync.offline
                      ? "离线"
                      : "已同步"
                    : "中断"}
            </span>
          </span>
          <button
            className="alm-icon"
            aria-label="刷新数据"
            onClick={() => void reload()}
          >
            <RefreshCw size={16} className={refreshing ? "spinning" : ""} />
          </button>
          <button
            className="alm-avatar"
            aria-label="账号与数据"
            onClick={() => nav("account")}
          >
            {session.user?.displayName?.slice(0, 1) ||
              session.user?.username?.slice(0, 1) ||
              "星"}
          </button>
        </div>
      </header>

      {more && (
        <>
          <button
            className="alm-observatory-veil"
            aria-label="关闭观测台"
            onClick={() => setMore(false)}
          />
          <section
            className="alm-observatory"
            id="alm-secondary"
            aria-label="观测台"
          >
            <div className="alm-observatory__head">
              <div>
                <span className="alm-kicker">OBSERVATORY</span>
                <h2>观测台</h2>
              </div>
              <button
                className="alm-icon"
                aria-label="关闭观测台"
                onClick={() => setMore(false)}
              >
                <X size={15} />
              </button>
            </div>
            <div className="alm-observatory__grid">
              {secondary.map(([id, label, desc, Icon], i) => (
                <button
                  key={id}
                  className="alm-observatory__item"
                  aria-current={page === id ? "page" : undefined}
                  onClick={() => nav(id)}
                >
                  <em>0{i + 1}</em>
                  <span>
                    <b>{label}</b>
                    <small>{desc}</small>
                  </span>
                  {Icon ? <Icon size={15} /> : null}
                </button>
              ))}
            </div>
            <p className="alm-observatory__foot">
              五个一级入口留在报头；其余能力都在这里。
            </p>
          </section>
        </>
      )}

      <main className="alm-main">
        <div className="alm-content">
          {page !== "today" && (
            <section className="alm-page-heading" key={page}>
              <span className="alm-kicker">
                {page === "account"
                  ? "YOUR SPACE"
                  : (secondaryItem?.[2] || "").toUpperCase() || "ORBIT"}
              </span>
              <h1 ref={pageHeading} tabIndex={-1}>
                {titles[page]?.[0] || page}
              </h1>
              <p>{titles[page]?.[1] || ""}</p>
            </section>
          )}
          {error && (
            <div className="alm-error" role="alert">
              {error}
              <button onClick={() => void reload()}>重新连接</button>
            </div>
          )}
          {!data ? (
            <div className="alm-loading">
              <span className="spinning">✦</span>
              <h3>正在读取你的生活记录…</h3>
              <button className="alm-btn" onClick={() => void reload()}>
                重试读取
              </button>
            </div>
          ) : (
            <div key={page} className="alm-page">
              {page === "today" && (
                <TodayView data={data} onNav={nav} onChange={() => void reload()} />
              )}
              {page === "habits" && (
                <HabitManager data={data} onChange={() => void reload()} />
              )}
              {page === "journal" && (
                <JournalPanel
                  data={data}
                  onChange={() => void reload()}
                  onNav={nav}
                />
              )}
              {page === "documents" && (
                <DocumentPlanner
                  data={data}
                  onChange={() => void reload()}
                  onFocus={(task) => {
                    setFocusRequest({
                      ...task,
                      requestId: crypto.randomUUID(),
                    });
                    nav("focus");
                  }}
                />
              )}
              {page === "focus" && (
                <FocusPanel
                  request={focusRequest}
                  data={data}
                  accountKey={session.user?.id || "guest"}
                  onChange={() => void reload()}
                />
              )}
              {page === "ledger" && (
                <LedgerManager data={data} onChange={() => void reload()} />
              )}
              {page === "notes" && <Planner mode="notes" />}
              {page === "forecast" && <Planner mode="forecast" />}
              {page === "calendar" && <CalendarView data={data} onNav={nav} />}
              {page === "insights" && <Insights data={data} />}
              {page === "pet" && (
                <PetView data={data} onChange={() => void reload()} />
              )}
              {page === "account" && (
                <AccountPanel
                  session={session}
                  onChange={() => void reload()}
                  onLogout={() => {
                    setSession(null);
                    setFocusRequest(null);
                    setData(null);
                    setPage("today");
                  }}
                />
              )}
            </div>
          )}
          <footer className="alm-footer">
            <span className="alm-kicker">ORBIT · ALMANAC</span>
            <p>不必追赶别人，慢慢成为自己。</p>
            <span>2026 · 星历 2.5</span>
          </footer>
        </div>
      </main>

      <nav className="alm-mobile-nav" aria-label="一级导航">
        {primary.map(([id, label], i) => (
          <button
            key={id}
            aria-current={page === id ? "page" : undefined}
            onClick={() => nav(id)}
          >
            <i>0{i + 1}</i>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
