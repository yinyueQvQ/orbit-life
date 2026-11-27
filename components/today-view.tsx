"use client";
import { api } from "../client/api.mjs";
import SkyPlate from "./sky-plate";

const day = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(
    new Date(),
  );

const money = (v: number) =>
  new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format((v || 0) / 100);

const monthName = (n: number) =>
  ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"][n];

const WEEK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function weekKey(offset: number) {
  const d = new Date(day() + "T12:00:00");
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function streakOf(checks: any[]) {
  let n = 0;
  for (let i = 0; i < 365; i++) {
    const key = weekKey(-i);
    if (checks.some((c) => c.date === key)) n++;
    else if (i > 0) break;
  }
  return n;
}

export default function TodayView({
  data,
  onNav,
  onChange,
}: {
  data: any;
  onNav: (v: string) => void;
  onChange: () => void;
}) {
  const date = day();
  const d = new Date(date + "T12:00:00");
  const weekday = d.getDay();
  const habits = (data.habits || []).filter(
    (h: any) =>
      !h.archived && (h.days || [0, 1, 2, 3, 4, 5, 6]).includes(weekday),
  );
  const checks = data.checks || [];
  const done = habits.filter((h: any) =>
    checks.some((c: any) => c.habit === h.id && c.date === date),
  ).length;
  const month = date.slice(0, 7);
  const monthTx = (data.transactions || []).filter((t: any) =>
    t.date.startsWith(month),
  );
  const income = monthTx
    .filter((t: any) => t.kind === "income")
    .reduce((a: number, t: any) => a + t.amount, 0);
  const expense = monthTx
    .filter((t: any) => t.kind === "expense")
    .reduce((a: number, t: any) => a + t.amount, 0);
  const pending = (data.notes || []).filter((n: any) => !n.done);
  const journal = data.journal || [];
  const latest = journal[0];
  const focus = data.profile?.focus || 0;
  const streak = streakOf(checks);

  async function toggle(h: any) {
    const checked = checks.some(
      (c: any) => c.habit === h.id && c.date === date,
    );
    try {
      await api("/api/life", {
        action: "check",
        id: h.id,
        date,
        done: !checked,
      });
      onChange();
    } catch {
      /* the parent error banner handles it */
    }
  }

  return (
    <div className="alm-today">
      <section className="alm-hero">
        <aside className="alm-date">
          <span className="alm-label">FRIDAY</span>
          <div className="alm-date__num">
            {d.getDate()}
            <sup>{["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][d.getMonth()]}</sup>
          </div>
          <div className="alm-date__meta">
            {d.getFullYear()} 年 · {monthName(d.getMonth())}
            <br />
            {WEEK[weekday]} · 今日
          </div>
          <div className="alm-date__rule" />
          <p className="alm-date__lunar">
            日出 06:48 · 日落 17:41
            <br />
            宜 整理 / 早睡 / 读几页书
          </p>
        </aside>

        <div className="alm-note">
          <span className="alm-kicker">TODAY'S NOTE</span>
          <h1>
            今天，
            <br />
            过得更像<em>自己</em>。
          </h1>
          <p>照顾好今天的小事，未来会慢慢清晰。不必把整座山走完，先走稳脚下这一步。</p>
          <div className="alm-figures">
            <div>
              <strong>
                {streak}
                <small>天</small>
              </strong>
              <span>连续记录</span>
            </div>
            <div>
              <strong>
                {done}
                <small>件</small>
              </strong>
              <span>今日完成</span>
            </div>
            <div>
              <strong>
                {focus}
                <small>分</small>
              </strong>
              <span>累计专注</span>
            </div>
          </div>
        </div>

        <figure className="alm-plate">
          <SkyPlate onNav={onNav} />
          <figcaption>
            <span>N 22°</span>
            <i />
            <span>06:48</span>
            <i />
            <span>17:41</span>
            <i />
            <span>今日星图</span>
          </figcaption>
        </figure>
      </section>

      <nav className="alm-index" aria-label="今日栏目">
        <button onClick={() => onNav("habits")}>
          <em>01</em>
          <b>习惯</b>
          <small>
            {habits.length} 个进行中 · 今日 {done} / {habits.length}
          </small>
          <span>
            进入习惯 <span aria-hidden="true">↗</span>
          </span>
        </button>
        <button onClick={() => onNav("ledger")}>
          <em>02</em>
          <b>收支</b>
          <small>本月结余 ¥{money(income - expense)}</small>
          <span>
            翻看账本 <span aria-hidden="true">↗</span>
          </span>
        </button>
        <button onClick={() => onNav("journal")}>
          <em>03</em>
          <b>随心记</b>
          <small>{journal.length} 篇 · 留住今天</small>
          <span>
            写下今天 <span aria-hidden="true">↗</span>
          </span>
        </button>
        <button onClick={() => onNav("notes")}>
          <em>04</em>
          <b>备忘</b>
          <small>{pending.length} 件待办</small>
          <span>
            查看清单 <span aria-hidden="true">↗</span>
          </span>
        </button>
      </nav>

      <div className="alm-grid">
        <section className="alm-module">
          <div className="alm-module__head">
            <em>01</em>
            <h2>习惯</h2>
            <span>
              今日 {done} / {habits.length}
            </span>
          </div>
          {habits.length ? (
            <div className="alm-habits">
              {habits.slice(0, 4).map((h: any) => {
                const checked = checks.some(
                  (c: any) => c.habit === h.id && c.date === date,
                );
                const total = checks.filter((c: any) => c.habit === h.id).length;
                return (
                  <div
                    className={"alm-habit" + (checked ? " is-done" : "")}
                    key={h.id}
                  >
                    <button
                      className={"alm-check" + (checked ? " is-done" : "")}
                      aria-label={(checked ? "取消" : "完成") + h.name}
                      aria-pressed={checked}
                      onClick={() => void toggle(h)}
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M3 8.4 6.3 12 13 4.6" />
                      </svg>
                    </button>
                    <span className="alm-habit__name">
                      {h.name}
                      <small>{h.category}</small>
                    </span>
                    <span className="alm-habit__streak">{total} 次</span>
                    <span className="alm-week">
                      {[-6, -5, -4, -3, -2, -1, 0].map((off) => (
                        <i
                          key={off}
                          className={
                            checks.some(
                              (c: any) =>
                                c.habit === h.id && c.date === weekKey(off),
                            )
                              ? "is-done"
                              : off === 0
                                ? "is-today"
                                : ""
                          }
                        />
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="alm-empty">还没有今天的习惯，去习惯页添加一个。</p>
          )}
          <div className="alm-module__foot">
            <div className="alm-progress">
              <i
                style={{
                  width:
                    (habits.length ? (done / habits.length) * 100 : 0) + "%",
                }}
              />
            </div>
            <button className="alm-link" onClick={() => onNav("habits")}>
              全部习惯 →
            </button>
          </div>
        </section>

        <section className="alm-module">
          <div className="alm-module__head">
            <em>02</em>
            <h2>收支</h2>
            <span>{month.replace("-", ".")}</span>
          </div>
          <div className="alm-ledger">
            <div>
              <small>本月结余</small>
              <strong>
                <i>¥</i>
                {money(income - expense)}
              </strong>
            </div>
            <div>
              <small>收入</small>
              <span>{money(income)}</span>
            </div>
            <div>
              <small>支出</small>
              <span>{money(expense)}</span>
            </div>
          </div>
          {monthTx.length ? (
            <table className="alm-mini-table">
              <tbody>
                {monthTx.slice(0, 3).map((t: any) => (
                  <tr key={t.id}>
                    <td>
                      {t.note || t.category} · {t.category}
                    </td>
                    <td className={t.kind === "income" ? "is-in" : ""}>
                      {t.kind === "income" ? "+" : "−"} {money(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="alm-empty">这个月还没有账目。</p>
          )}
          <div className="alm-module__foot">
            <span className="alm-micro">本月 {monthTx.length} 笔</span>
            <button className="alm-link" onClick={() => onNav("ledger")}>
              翻看账本 →
            </button>
          </div>
        </section>

        <section className="alm-module">
          <div className="alm-module__head">
            <em>03</em>
            <h2>随心记</h2>
            <span>{journal.length} 篇</span>
          </div>
          {latest ? (
            <article className="alm-journal">
              <span className="alm-label">
                {latest.date} · {latest.kind || "随记"}
              </span>
              <h3>{latest.title || "无题的一刻"}</h3>
              <p>{(latest.content || "").slice(0, 120)}</p>
              <div className="alm-tags">
                {(latest.tags || []).map((t: string) => (
                  <span className="alm-tag" key={t}>
                    #{t}
                  </span>
                ))}
              </div>
            </article>
          ) : (
            <p className="alm-empty">还没有记录，今天可以从一句话开始。</p>
          )}
          <div className="alm-module__foot">
            <span className="alm-micro">本月新增 {journal.filter((e: any) => e.date.startsWith(month)).length} 篇</span>
            <button className="alm-link" onClick={() => onNav("journal")}>
              写一篇 →
            </button>
          </div>
        </section>

        <section className="alm-module">
          <div className="alm-module__head">
            <em>04</em>
            <h2>备忘</h2>
            <span>{pending.length} 件待办</span>
          </div>
          {pending.length ? (
            <div className="alm-notes">
              {pending.slice(0, 3).map((n: any) => (
                <div className="alm-note-row" key={n.id}>
                  <span className="alm-check" aria-hidden="true">
                    <svg viewBox="0 0 16 16">
                      <path d="M3 8.4 6.3 12 13 4.6" />
                    </svg>
                  </span>
                  <div>
                    <strong>{n.title}</strong>
                    <small>
                      {n.due ? n.due + " · " : ""}
                      {n.goalId ? "关联目标" : "备忘"}
                    </small>
                  </div>
                  <span className="alm-tag">{n.due ? n.due.slice(5) : "待办"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="alm-empty">清单是空的，今天可以轻一点。</p>
          )}
          <div className="alm-module__foot">
            <span className="alm-micro">共 {pending.length} 件</span>
            <button className="alm-link" onClick={() => onNav("notes")}>
              全部备忘 →
            </button>
          </div>
        </section>

        <section className="alm-module alm-focus">
          <div>
            <div className="alm-module__head" style={{ marginBottom: 4 }}>
              <em>05</em>
              <h2>专注</h2>
            </div>
            <div className="alm-focus__clock">
              {String(Math.floor(focus / 60)).padStart(2, "0")}:
              {String(focus % 60).padStart(2, "0")}
              <small>累计</small>
            </div>
          </div>
          <div>
            <p>留一段时间，只做一件事。每次投入都会被记下。</p>
            <div className="alm-progress" style={{ marginTop: 10, maxWidth: 320 }}>
              <i style={{ width: Math.min(100, (focus / 600) * 100) + "%" }} />
            </div>
          </div>
          <button className="alm-btn alm-btn--solid" onClick={() => onNav("focus")}>
            <span aria-hidden="true">◷</span> 进入专注
          </button>
        </section>
      </div>
    </div>
  );
}
