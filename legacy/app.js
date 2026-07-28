/* 面试追踪 — 纯前端，数据存 localStorage。UTF-8。 */
(function () {
  'use strict';

  /* ══ 常量 ═══════════════════════════════════════════════ */

  const KEY = 'interview-tracker-v1';

  // 流程状态。图标形状各不相同 —— 与颜色一起构成双重编码，
  // 因为 Offer 绿 / 已结束 红在红绿色盲下几乎不可分辨。
  const STATUS = [
    { id: 'wish',      label: '想投',      glyph: '○', tone: 'var(--st-wish)',      stage: 0 },
    { id: 'applied',   label: '已投递',    glyph: '↗', tone: 'var(--st-applied)',   stage: 1 },
    { id: 'assess',    label: '笔试/测评', glyph: '✎', tone: 'var(--st-assess)',    stage: 2 },
    { id: 'interview', label: '面试中',    glyph: '◐', tone: 'var(--st-interview)', stage: 3 },
    { id: 'final',     label: '终面/待结果', glyph: '◆', tone: 'var(--st-final)',   stage: 4 },
    { id: 'offer',     label: '已拿 Offer', glyph: '★', tone: 'var(--st-offer)',    stage: 5 },
    { id: 'closed',    label: '已结束',    glyph: '✕', tone: 'var(--st-closed)',    stage: -1 },
  ];
  const S = Object.fromEntries(STATUS.map(s => [s.id, s]));
  const LIVE = ['wish', 'applied', 'assess', 'interview', 'final', 'offer'];

  // 允许的快捷推进路径（表单里仍可自由改到任意状态）
  const NEXT = {
    wish:      ['applied', 'closed'],
    applied:   ['assess', 'interview', 'closed'],
    assess:    ['interview', 'closed'],
    interview: ['final', 'offer', 'closed'],
    final:     ['offer', 'closed'],
    offer:     ['closed'],
    closed:    ['interview', 'applied'],
  };

  const OUTCOME = [
    { id: 'rejected', label: '未通过' },
    { id: 'declined', label: '我拒绝了' },
    { id: 'ghosted',  label: '无回应' },
    { id: 'withdrawn', label: '主动放弃' },
  ];
  const MODE = [                        // 单轮面试的形式
    { id: 'onsite', label: '现场' },
    { id: 'video',  label: '视频' },
    { id: 'phone',  label: '电话' },
  ];
  const WORKMODE = [                    // 岗位的办公方式
    { id: 'onsite', label: '现场办公' },
    { id: 'hybrid', label: '混合办公' },
    { id: 'remote', label: '完全远程' },
  ];
  const RESULT = [
    { id: 'pending', label: '待定',   glyph: '◐', tone: 'var(--st-interview)' },
    { id: 'pass',    label: '通过',   glyph: '✓', tone: 'var(--st-offer)' },
    { id: 'fail',    label: '未通过', glyph: '✕', tone: 'var(--st-closed)' },
  ];
  const R = Object.fromEntries(RESULT.map(r => [r.id, r]));
  const ROUND_PRESETS = ['一面', '二面', '三面', '四面', '交叉面', 'HR 面', '主管面', '终面'];

  /* ══ DOM 小工具 ═════════════════════════════════════════ */

  const $ = sel => document.querySelector(sel);
  const NS = 'http://www.w3.org/2000/svg';

  function h(tag, props, ...kids) {
    const n = document.createElement(tag);
    apply(n, props);
    add(n, kids);
    return n;
  }
  function sv(tag, props, ...kids) {
    const n = document.createElementNS(NS, tag);
    apply(n, props, true);
    add(n, kids);
    return n;
  }
  function apply(n, props, isSvg) {
    if (!props) return;
    // type 必须先于 value：先设 value 再改 type，date/datetime-local 会把值丢掉
    if (props.type && !isSvg) n.type = props.type;
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.setAttribute('class', v);
      else if (k === 'text') n.textContent = v;              // 用户数据一律走 textContent
      else if (k === 'style' && typeof v === 'object') {
        for (const [p, val] of Object.entries(v)) n.style.setProperty(p, val);
      } else if (k === 'dataset') Object.assign(n.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (!isSvg && (k in n) && k !== 'list') n[k] = v;
      else n.setAttribute(k, v);
    }
  }
  function add(n, kids) {
    for (const k of kids.flat(9)) {
      if (k == null || k === false) continue;
      n.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    }
  }
  const clear = n => { while (n.firstChild) n.removeChild(n.firstChild); return n; };

  /* ══ 日期 ═══════════════════════════════════════════════ */

  const pad = n => String(n).padStart(2, '0');
  const localISO = ms => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const todayISO = () => localISO(Date.now());
  const WK = ['日', '一', '二', '三', '四', '五', '六'];

  function parseDT(s) {
    if (!s) return null;
    const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s);
    return isNaN(d) ? null : d;
  }
  function dayDiff(a, b) { // b - a，按自然日
    const x = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const y = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((y - x) / 86400000);
  }
  function fmtDate(s) {
    const d = parseDT(s); if (!d) return '—';
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
  function fmtWhen(s) {
    const d = parseDT(s); if (!d) return '—';
    const dd = dayDiff(new Date(), d);
    const time = s.length > 10 ? ` ${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
    if (dd === 0) return '今天' + time;
    if (dd === 1) return '明天' + time;
    if (dd === -1) return '昨天' + time;
    return `${d.getMonth() + 1}月${d.getDate()}日 周${WK[d.getDay()]}${time}`;
  }
  const relDays = s => { const d = parseDT(s); return d ? dayDiff(d, new Date()) : null; };

  /* ══ 状态 ═══════════════════════════════════════════════ */

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  let data = { records: [], theme: null, view: 'board' };
  let ui = { q: '', status: 'all', city: 'all', range: 'all', sort: 'updated' };
  let openId = null, openIsNew = false, roundDraft = null, undoBuf = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && Array.isArray(p.records)) data = Object.assign(data, p);
      }
    } catch (e) { console.warn('读取本地数据失败', e); }
    data.records.forEach(normalize);
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { toast('保存失败：浏览器存储空间可能已满'); }
  }
  function normalize(r) {
    r.rounds = Array.isArray(r.rounds) ? r.rounds : [];
    r.tags = Array.isArray(r.tags) ? r.tags : [];
    r.history = Array.isArray(r.history) ? r.history : [];
    r.reached = Array.isArray(r.reached) ? r.reached : [r.status];
    if (!S[r.status]) r.status = 'applied';
    return r;
  }
  function blank() {
    return normalize({
      id: uid(), company: '', role: '', city: '', workMode: 'onsite',
      source: '', salary: '', appliedAt: todayISO(), status: 'applied',
      outcome: '', star: false, tags: [], note: '', rounds: [],
      reached: ['applied'], history: [], createdAt: Date.now(), updatedAt: Date.now(),
    });
  }
  const byId = id => data.records.find(r => r.id === id);

  function setStatus(r, next, silent) {
    if (!S[next] || r.status === next) return;
    const from = r.status;
    r.status = next;
    if (next !== 'closed' && !r.reached.includes(next)) r.reached.push(next);
    if (next !== 'closed') r.outcome = '';
    else if (!r.outcome) r.outcome = 'rejected';
    r.history.push({ at: Date.now(), from, to: next });
    r.updatedAt = Date.now();
    save();
    if (!silent) toast(`${r.company || '该投递'} → ${S[next].label}`);
  }

  /* ══ 派生 ═══════════════════════════════════════════════ */

  // 下一场待进行的面试
  function nextRound(r) {
    const now = Date.now();
    return r.rounds
      .filter(x => x.result === 'pending' && x.at && parseDT(x.at) && parseDT(x.at).getTime() >= now - 6 * 3600e3)
      .sort((a, b) => parseDT(a.at) - parseDT(b.at))[0] || null;
  }
  const isLive = r => LIVE.includes(r.status);
  const reachedInterview = r => r.reached.some(s => ['interview', 'final', 'offer'].includes(s)) || r.rounds.length > 0;
  const reachedFinal = r => r.reached.some(s => ['final', 'offer'].includes(s));
  const reachedOffer = r => r.reached.includes('offer');
  const reachedApplied = r => r.reached.some(s => s !== 'wish') || r.status !== 'wish';

  function filtered() {
    const q = ui.q.trim().toLowerCase();
    const lim = ui.range === 'all' ? null : Number(ui.range);
    return data.records.filter(r => {
      if (ui.status !== 'all' && r.status !== ui.status) return false;
      if (ui.city !== 'all' && (r.city || '未填') !== ui.city) return false;
      if (lim != null) { const d = relDays(r.appliedAt); if (d == null || d > lim || d < 0) return false; }
      if (q) {
        const hay = [r.company, r.role, r.city, r.source, r.note, r.tags.join(' ')].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort(cmp);
  }
  function cmp(a, b) {
    switch (ui.sort) {
      case 'applied': return (b.appliedAt || '').localeCompare(a.appliedAt || '');
      case 'company': return (a.company || '').localeCompare(b.company || '', 'zh-Hans-CN');
      case 'next': {
        const x = nextRound(a), y = nextRound(b);
        if (x && y) return parseDT(x.at) - parseDT(y.at);
        return x ? -1 : y ? 1 : b.updatedAt - a.updatedAt;
      }
      default: return b.updatedAt - a.updatedAt;
    }
  }

  /* ══ 渲染入口 ═══════════════════════════════════════════ */

  let renderScheduled = false;
  function render() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => { renderScheduled = false; draw(); });
  }
  function draw() {
    const rows = filtered();
    renderFocus();
    renderKPI(rows);
    syncFilterOptions();
    $('#result-count').textContent =
      data.records.length === 0 ? '' :
      `${rows.length} 家 / 共 ${data.records.length} 家` + (rows.length !== data.records.length ? '（已筛选）' : '');

    for (const v of ['board', 'list', 'stats']) $('#view-' + v).hidden = data.view !== v;
    document.querySelectorAll('.seg-btn[data-view]').forEach(b =>
      b.setAttribute('aria-selected', String(b.dataset.view === data.view)));

    if (data.records.length === 0) {
      $('#view-' + data.view).hidden = false;
      clear($('#view-' + data.view)).appendChild(emptyState());
      return;
    }
    if (data.view === 'board') renderBoard(rows);
    else if (data.view === 'list') renderList(rows);
    else renderStats(rows);
  }

  function emptyState() {
    return h('div', { class: 'empty' },
      h('h2', { text: '还没有任何投递记录' }),
      h('p', { text: '记录每一家公司的进度、面试轮次、时间地点和结果。所有数据只保存在这台设备的浏览器里，不会上传。' }),
      h('div', { class: 'empty-actions' },
        h('button', { class: 'btn btn-primary', onclick: () => openDrawer(null) }, '＋ 新建第一条投递'),
        h('button', { class: 'btn', onclick: loadSample }, '载入示例数据看看'),
      ));
  }

  /* ══ 重点区 ═════════════════════════════════════════════ */

  function renderFocus() {
    const box = clear($('#focus'));
    if (!data.records.length) return;

    const soon = [], week = [], stale = [];
    for (const r of data.records) {
      if (!isLive(r)) continue;
      const nr = nextRound(r);
      if (nr) {
        const d = dayDiff(new Date(), parseDT(nr.at));
        (d <= 1 ? soon : d <= 7 ? week : null)?.push({ r, nr, d });
      } else if (['applied', 'assess', 'interview', 'final'].includes(r.status)) {
        const idle = Math.floor((Date.now() - r.updatedAt) / 86400000);
        if (idle >= 10) stale.push({ r, idle });
      }
    }
    soon.sort((a, b) => parseDT(a.nr.at) - parseDT(b.nr.at));
    week.sort((a, b) => parseDT(a.nr.at) - parseDT(b.nr.at));
    stale.sort((a, b) => b.idle - a.idle);

    if (soon.length) box.appendChild(focusCard(
      'var(--critical)', '!', '今明两天有面试', soon.length,
      soon.map(x => chip(x.r, fmtWhen(x.nr.at), x.nr.name))));
    if (week.length) box.appendChild(focusCard(
      'var(--warning)', '◷', '未来 7 天的面试', week.length,
      week.map(x => chip(x.r, fmtWhen(x.nr.at), x.nr.name))));
    if (stale.length) box.appendChild(focusCard(
      'var(--st-wish)', '…', '超过 10 天没有进展，建议跟进', stale.length,
      stale.slice(0, 12).map(x => chip(x.r, `${x.idle} 天前`, S[x.r.status].label))));
  }
  function focusCard(tone, icon, title, n, items) {
    return h('div', { class: 'focus-card', style: { '--tone': tone } },
      h('div', { class: 'focus-icon', 'aria-hidden': 'true', text: icon }),
      h('div', { class: 'focus-body' },
        h('div', { class: 'focus-title' }, title, ' ', h('span', { class: 'count', text: `· ${n} 家` })),
        h('div', { class: 'focus-items' }, items)));
  }
  function chip(r, when, tail) {
    return h('button', { class: 'focus-chip', onclick: () => openDrawer(r.id) },
      h('span', { class: 'dot', style: { '--tone': S[r.status].tone } }),
      h('b', { text: r.company || '未命名' }),
      h('span', { class: 'sep', text: '·' }),
      h('span', { class: 'when', text: when }),
      tail ? h('span', { class: 'sep', text: '·' }) : null,
      tail ? h('span', { text: tail }) : null);
  }

  /* ══ KPI ════════════════════════════════════════════════ */

  function renderKPI(rows) {
    const box = clear($('#kpi'));
    if (!data.records.length) return;

    const live = rows.filter(isLive).length;
    const applied = rows.filter(reachedApplied).length;
    const iv = rows.filter(reachedInterview).length;
    const of = rows.filter(reachedOffer).length;
    const roundsDone = rows.reduce((n, r) => n + r.rounds.filter(x => x.result !== 'pending').length, 0);
    const roundsPass = rows.reduce((n, r) => n + r.rounds.filter(x => x.result === 'pass').length, 0);
    const wk = rows.filter(r => { const d = relDays(r.appliedAt); return d != null && d >= 0 && d < 7; }).length;

    const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
    box.append(
      kpi('在投进行中', live, '家', `${data.records.length} 家里 ${data.records.length - live} 家已结束`),
      kpi('进入面试率', pct(iv, applied), '%', `${applied} 家投递中 ${iv} 家进了面试`),
      kpi('单轮通过率', pct(roundsPass, roundsDone), '%', roundsDone ? `已出结果 ${roundsDone} 轮，过 ${roundsPass} 轮` : '还没有出结果的轮次'),
      kpi('拿到 Offer', of, '个', wk ? `本周新投 ${wk} 家` : '本周还没有新投递'),
    );
  }
  function kpi(label, value, unit, sub) {
    return h('div', { class: 'kpi' },
      h('div', { class: 'kpi-label', text: label }),
      h('div', { class: 'kpi-value' }, String(value), h('span', { class: 'unit', text: unit })),
      h('div', { class: 'kpi-sub', text: sub }));
  }

  /* ══ 看板 ═══════════════════════════════════════════════ */

  function renderBoard(rows) {
    const board = h('div', { class: 'board' });
    for (const st of STATUS) {
      const mine = rows.filter(r => r.status === st.id);
      const col = h('div', {
        class: 'col', dataset: { status: st.id },
        ondragover: e => { e.preventDefault(); col.classList.add('drag-over'); },
        ondragleave: () => col.classList.remove('drag-over'),
        ondrop: e => {
          e.preventDefault(); col.classList.remove('drag-over');
          const r = byId(e.dataTransfer.getData('text/plain'));
          if (r) { setStatus(r, st.id); render(); }
        },
      },
        h('div', { class: 'col-head', style: { '--tone': st.tone } },
          h('span', { class: 'glyph', 'aria-hidden': 'true', text: st.glyph }),
          h('span', { class: 'name', text: st.label }),
          h('span', { class: 'n', text: String(mine.length) })),
        h('div', { class: 'col-body' },
          mine.length ? mine.map(cardEl)
                      : h('div', { class: 'col-empty', text: '拖动卡片到这里' })));
      board.appendChild(col);
    }
    clear($('#view-board')).appendChild(board);
  }

  function cardEl(r) {
    const st = S[r.status], nr = nextRound(r);
    const done = r.rounds.filter(x => x.result !== 'pending').length;
    const card = h('div', {
      class: 'card', draggable: true, tabIndex: 0, style: { '--tone': st.tone },
      onclick: () => openDrawer(r.id),
      onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrawer(r.id); } },
      ondragstart: e => { e.dataTransfer.setData('text/plain', r.id); e.dataTransfer.effectAllowed = 'move'; card.classList.add('dragging'); },
      ondragend: () => card.classList.remove('dragging'),
    },
      h('div', { class: 'card-top' },
        h('span', { class: 'card-company', text: r.company || '未命名' }),
        r.star ? h('span', { class: 'card-star', title: '重点关注', text: '★' }) : null),
      r.role ? h('div', { class: 'card-role', text: r.role }) : null,
      h('div', { class: 'card-meta' },
        r.city ? h('span', {}, '◎ ', r.city) : null,
        r.rounds.length ? h('span', {}, `${done}/${r.rounds.length} 轮已出结果`) : null,
        r.appliedAt ? h('span', {}, '投 ', fmtDate(r.appliedAt)) : null),
      nr ? h('div', { class: 'card-next', style: { '--nt': soonTone(nr.at) } },
              h('span', { class: 'g', 'aria-hidden': 'true', text: '▶' }),
              h('span', { text: `${nr.name} · ${fmtWhen(nr.at)}` })) : null,
      r.status === 'closed' && r.outcome
        ? h('div', { class: 'card-meta' }, h('span', { text: '✕ ' + (OUTCOME.find(o => o.id === r.outcome)?.label || '') })) : null,
      r.tags.length ? h('div', { class: 'card-tags' }, r.tags.slice(0, 4).map(t => h('span', { class: 'tag', text: t }))) : null,
    );
    return card;
  }
  function soonTone(at) {
    const d = dayDiff(new Date(), parseDT(at));
    return d <= 1 ? 'var(--critical)' : d <= 7 ? 'var(--warning)' : 'var(--st-interview)';
  }

  /* ══ 列表 ═══════════════════════════════════════════════ */

  function renderList(rows) {
    const head = ['公司', '岗位', '城市', '状态', '轮次', '下一场', '投递日', '更新'];
    const tb = h('tbody', {}, rows.map(r => {
      const nr = nextRound(r), done = r.rounds.filter(x => x.result !== 'pending').length;
      return h('tr', { onclick: () => openDrawer(r.id), tabIndex: 0,
                       onkeydown: e => { if (e.key === 'Enter') openDrawer(r.id); } },
        h('td', {}, h('span', { class: 'co', text: r.company || '未命名' }), r.star ? ' ★' : ''),
        h('td', {}, r.role || h('span', { class: 'sub', text: '—' })),
        h('td', {}, r.city || h('span', { class: 'sub', text: '—' })),
        h('td', {}, statusPill(r.status),
          r.status === 'closed' && r.outcome
            ? h('div', { class: 'sub', text: OUTCOME.find(o => o.id === r.outcome)?.label || '' }) : null),
        h('td', { class: 'num', text: r.rounds.length ? `${done}/${r.rounds.length}` : '—' }),
        h('td', { class: 'num', text: nr ? `${nr.name} ${fmtWhen(nr.at)}` : '—' }),
        h('td', { class: 'num', text: r.appliedAt || '—' }),
        h('td', { class: 'num', text: fmtWhen(localISO(r.updatedAt)) }));
    }));
    clear($('#view-list')).appendChild(
      h('div', { class: 'tbl-wrap' },
        h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, head.map(t => h('th', { text: t })))), tb)));
  }

  function statusPill(id) {
    const st = S[id];
    return h('span', { class: 'pill', style: { '--tone': st.tone } },
      h('span', { class: 'glyph', 'aria-hidden': 'true', text: st.glyph }),
      h('span', { text: st.label }));
  }

  /* ══ 统计 ═══════════════════════════════════════════════ */

  const chartMode = { status: 'chart', funnel: 'chart', trend: 'chart' };

  function renderStats(rows) {
    const status = chartCard('status', '各状态的公司数', '一家公司此刻停在哪一步',
      () => statusChart(rows), () => statusTable(rows));
    const funnel = chartCard('funnel', '流程漏斗', '曾经走到过该阶段的公司数（各层严格包含下一层）',
      () => funnelChart(rows), () => funnelTable(rows));
    const trend = chartCard('trend', '每周投递量', '按投递日期统计，最近 12 周',
      w => trendChart(rows, w), () => trendTable(rows));
    clear($('#view-stats')).appendChild(
      h('div', { class: 'stats-grid' }, status.card, funnel.card, trend.card, sourceCard(rows)));
    // SVG 的 viewBox 要贴合真实容器宽度，否则文字会被整体放大 —— 挂载后重画一次
    trend.paint();
  }

  function chartCard(key, title, sub, chart, table) {
    const body = h('div', { class: 'chart-body' });
    const paint = () => {
      const w = Math.max(420, Math.round(body.clientWidth) || 720);
      clear(body).appendChild(chartMode[key] === 'chart' ? chart(w) : table());
    };
    const seg = h('div', { class: 'seg' },
      ...['chart', 'table'].map(m => h('button', {
        class: 'seg-btn', 'aria-selected': String(chartMode[key] === m),
        text: m === 'chart' ? '图表' : '表格',
        onclick: e => {
          chartMode[key] = m;
          seg.querySelectorAll('.seg-btn').forEach(b => b.setAttribute('aria-selected', String(b === e.currentTarget)));
          paint();
        },
      })));
    const card = h('div', { class: 'chart-card' + (key === 'trend' ? ' wide' : '') },
      h('div', { class: 'chart-head' }, h('div', {}, h('h3', { text: title }), h('p', { text: sub })), seg), body);
    paint();
    return { card, paint };
  }

  /* — 状态分布：横条，行即命中区，值直接标在条端 — */
  function statusChart(rows) {
    const counts = STATUS.map(st => ({ st, n: rows.filter(r => r.status === st.id).length }));
    const max = Math.max(1, ...counts.map(c => c.n));
    const total = rows.length || 1;
    if (!rows.length) return h('p', { class: 'empty-note', text: '当前筛选下没有数据' });
    return h('div', { class: 'bars' }, counts.map(({ st, n }) =>
      h('div', {
        class: 'bar-row', style: { '--tone': st.tone },
        onpointerenter: e => showTip(e, st.label, [[st.tone, '公司数', `${n} 家`], [st.tone, '占比', `${Math.round(n / total * 100)}%`]]),
        onpointermove: moveTip, onpointerleave: hideTip,
      },
        h('span', { class: 'bar-label' },
          h('span', { class: 'glyph', 'aria-hidden': 'true', text: st.glyph }),
          h('span', { text: st.label })),
        h('div', { class: 'bar-track' },
          n > 0 ? h('div', { class: 'bar-fill', style: { width: (n / max * 100) + '%' } }) : null),
        h('span', { class: 'bar-val', text: String(n) }))));
  }
  function statusTable(rows) {
    const total = rows.length || 1;
    return h('table', { class: 'mini-tbl' },
      h('thead', {}, h('tr', {}, h('th', { text: '状态' }), h('th', { class: 'r', text: '公司数' }), h('th', { class: 'r', text: '占比' }))),
      h('tbody', {}, STATUS.map(st => {
        const n = rows.filter(r => r.status === st.id).length;
        return h('tr', {},
          h('td', {}, h('span', { class: 'name', style: { '--tone': st.tone } },
            h('span', { class: 'dot' }), h('span', { text: `${st.glyph} ${st.label}` }))),
          h('td', { class: 'r', text: String(n) }),
          h('td', { class: 'r', text: Math.round(n / total * 100) + '%' }));
      })));
  }

  /* — 漏斗：单一蓝色 ordinal 阶梯（已通过 --ordinal 校验） — */
  function funnelData(rows) {
    return [
      { name: '已投递',    n: rows.filter(reachedApplied).length,   tone: 'var(--st-applied)' },
      { name: '进入面试',  n: rows.filter(reachedInterview).length, tone: 'var(--st-assess)' },
      { name: '走到终面',  n: rows.filter(reachedFinal).length,     tone: 'var(--st-interview)' },
      { name: '拿到 Offer', n: rows.filter(reachedOffer).length,    tone: 'var(--st-final)' },
    ];
  }
  function funnelChart(rows) {
    const st = funnelData(rows), base = Math.max(1, st[0].n);
    if (!rows.length) return h('p', { class: 'empty-note', text: '当前筛选下没有数据' });
    const out = h('div', { class: 'funnel' });
    st.forEach((s, i) => {
      out.appendChild(h('div', {
        class: 'funnel-stage', style: { '--tone': s.tone },
        onpointerenter: e => showTip(e, s.name, [
          [s.tone, '公司数', `${s.n} 家`],
          [s.tone, '占已投递', `${Math.round(s.n / base * 100)}%`]]),
        onpointermove: moveTip, onpointerleave: hideTip,
      },
        h('div', { class: 'funnel-top' },
          h('span', { class: 'funnel-name', text: s.name }),
          h('span', { class: 'funnel-n' }, String(s.n),
            h('span', { class: 'of', text: ` / ${base} · ${Math.round(s.n / base * 100)}%` }))),
        s.n ? h('div', { class: 'funnel-bar', style: { width: Math.max(0.6, s.n / base * 100) + '%' } }) : null));
      if (i < st.length - 1) {
        const nx = st[i + 1], rate = s.n ? Math.round(nx.n / s.n * 100) : 0;
        out.appendChild(h('div', { class: 'funnel-drop' },
          h('span', { class: 'arrow', 'aria-hidden': 'true', text: '↓' }),
          h('span', { text: `转化 ${rate}%　流失 ${s.n - nx.n} 家` })));
      }
    });
    return out;
  }
  function funnelTable(rows) {
    const st = funnelData(rows), base = Math.max(1, st[0].n);
    return h('table', { class: 'mini-tbl' },
      h('thead', {}, h('tr', {}, h('th', { text: '阶段' }), h('th', { class: 'r', text: '公司数' }),
        h('th', { class: 'r', text: '占已投递' }), h('th', { class: 'r', text: '上一步转化' }))),
      h('tbody', {}, st.map((s, i) => h('tr', {},
        h('td', {}, h('span', { class: 'name', style: { '--tone': s.tone } }, h('span', { class: 'dot' }), h('span', { text: s.name }))),
        h('td', { class: 'r', text: String(s.n) }),
        h('td', { class: 'r', text: Math.round(s.n / base * 100) + '%' }),
        h('td', { class: 'r', text: i === 0 ? '—' : (st[i - 1].n ? Math.round(s.n / st[i - 1].n * 100) + '%' : '—') })))));
  }

  /* — 趋势：单序列面积 + 折线，十字准星 tooltip — */
  function weeks(rows, k = 12) {
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    const out = [];
    for (let i = k - 1; i >= 0; i--) {
      const s = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - i * 7);
      const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7);
      out.push({
        start: s, label: `${s.getMonth() + 1}/${s.getDate()}`,
        n: rows.filter(r => { const d = parseDT(r.appliedAt); return d && d >= s && d < e; }).length,
      });
    }
    return out;
  }
  function trendChart(rows, width) {
    const W = width || 720, H = 210, P = { t: 14, r: 16, b: 26, l: 34 };
    const w = weeks(rows), max = Math.max(1, ...w.map(d => d.n));
    const top = Math.max(1, Math.ceil(max / 2) * 2);
    const X = i => P.l + (w.length === 1 ? 0 : i * (W - P.l - P.r) / (w.length - 1));
    const Y = v => P.t + (1 - v / top) * (H - P.t - P.b);

    const line = w.map((d, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(d.n).toFixed(1)}`).join(' ');
    const area = `${line} L${X(w.length - 1).toFixed(1)},${Y(0)} L${X(0).toFixed(1)},${Y(0)} Z`;
    const ticks = [0, top / 2, top];

    const cross = sv('line', { class: 'crosshair', y1: P.t, y2: H - P.b, opacity: 0 });
    const focus = sv('circle', { r: 4.5, fill: 'var(--st-interview)', stroke: 'var(--surface-1)', 'stroke-width': 2, opacity: 0 });

    const svg = sv('svg', { class: 'chart-svg', viewBox: `0 0 ${W} ${H}`, role: 'img',
                            'aria-label': `每周投递量趋势，最近 ${w.length} 周` },
      ticks.map(t => sv('line', { class: t === 0 ? 'baseline' : 'gridline', x1: P.l, x2: W - P.r, y1: Y(t), y2: Y(t) })),
      ticks.map(t => sv('text', { class: 'tick', x: P.l - 8, y: Y(t) + 3.5, 'text-anchor': 'end', text: String(t) })),
      sv('path', { d: area, fill: 'var(--st-interview)', 'fill-opacity': .1 }),
      sv('path', { d: line, fill: 'none', stroke: 'var(--st-interview)', 'stroke-width': 2,
                   'stroke-linejoin': 'round', 'stroke-linecap': 'round' }),
      cross, focus,
      // 只标注末点（选择性直接标注，不是每个点都标）
      sv('circle', { cx: X(w.length - 1), cy: Y(w[w.length - 1].n), r: 4.5,
                     fill: 'var(--st-interview)', stroke: 'var(--surface-1)', 'stroke-width': 2 }),
      sv('text', { class: 'dlabel', x: X(w.length - 1), y: Y(w[w.length - 1].n) - 11,
                   'text-anchor': 'end', text: `本周 ${w[w.length - 1].n}` }),
      w.map((d, i) => (i % 2 === 0 || i === w.length - 1)
        ? sv('text', { class: 'tick', x: X(i), y: H - P.b + 15, 'text-anchor': 'middle', text: d.label }) : null),
      sv('rect', { x: 0, y: 0, width: W, height: H, fill: 'transparent' }),
    );

    svg.addEventListener('pointermove', e => {
      const box = svg.getBoundingClientRect();
      const px = (e.clientX - box.left) / box.width * W;
      let i = Math.round((px - P.l) / ((W - P.l - P.r) / Math.max(1, w.length - 1)));
      i = Math.max(0, Math.min(w.length - 1, i));
      cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.setAttribute('opacity', 1);
      focus.setAttribute('cx', X(i)); focus.setAttribute('cy', Y(w[i].n)); focus.setAttribute('opacity', 1);
      const s = w[i], e2 = new Date(s.start.getFullYear(), s.start.getMonth(), s.start.getDate() + 6);
      showTip(e, `${s.start.getMonth() + 1}月${s.start.getDate()}日 – ${e2.getMonth() + 1}月${e2.getDate()}日`,
        [['var(--st-interview)', '投递', `${s.n} 家`]]);
      moveTip(e);
    });
    svg.addEventListener('pointerleave', () => {
      cross.setAttribute('opacity', 0); focus.setAttribute('opacity', 0); hideTip();
    });
    return svg;
  }
  function trendTable(rows) {
    return h('table', { class: 'mini-tbl' },
      h('thead', {}, h('tr', {}, h('th', { text: '周（起始）' }), h('th', { class: 'r', text: '投递数' }))),
      h('tbody', {}, weeks(rows).map(d => h('tr', {},
        h('td', { text: `${d.start.getFullYear()}-${pad(d.start.getMonth() + 1)}-${pad(d.start.getDate())}` }),
        h('td', { class: 'r', text: String(d.n) })))));
  }

  /* — 渠道效果：类别多且都带意义 → 用表格，不是更多颜色 — */
  function sourceCard(rows) {
    const map = new Map();
    for (const r of rows) {
      const k = (r.source || '').trim() || '未填写渠道';
      const v = map.get(k) || { n: 0, iv: 0, of: 0 };
      v.n++; if (reachedInterview(r)) v.iv++; if (reachedOffer(r)) v.of++;
      map.set(k, v);
    }
    const list = [...map].sort((a, b) => b[1].n - a[1].n);
    const body = list.length
      ? h('table', { class: 'mini-tbl' },
          h('thead', {}, h('tr', {}, h('th', { text: '渠道' }), h('th', { class: 'r', text: '投递' }),
            h('th', { class: 'r', text: '进面试' }), h('th', { class: 'r', text: 'Offer' }), h('th', { class: 'r', text: '进面率' }))),
          h('tbody', {}, list.map(([k, v]) => h('tr', {},
            h('td', { text: k }),
            h('td', { class: 'r', text: String(v.n) }),
            h('td', { class: 'r', text: String(v.iv) }),
            h('td', { class: 'r', text: String(v.of) }),
            h('td', { class: 'r', text: Math.round(v.iv / v.n * 100) + '%' })))))
      : h('p', { class: 'empty-note', text: '当前筛选下没有数据' });
    return h('div', { class: 'chart-card' },
      h('div', { class: 'chart-head' }, h('div', {},
        h('h3', { text: '各渠道效果' }),
        h('p', { text: '渠道类别多且都带含义，这里用表格而不是更多颜色' }))),
      h('div', { class: 'chart-body' }, body));
  }

  /* ══ tooltip ════════════════════════════════════════════ */

  const tipEl = () => $('#tip');
  function showTip(e, title, rows) {
    const t = clear(tipEl());
    t.appendChild(h('div', { class: 'tip-title', text: title }));
    for (const [tone, name, val] of rows) {
      t.appendChild(h('div', { class: 'tip-row', style: { '--tone': tone } },
        h('span', { class: 'tip-key' }),
        h('span', { class: 'tip-val', text: val }),
        h('span', { class: 'tip-name', text: name })));
    }
    t.hidden = false; moveTip(e);
  }
  function moveTip(e) {
    const t = tipEl(); if (t.hidden) return;
    const b = t.getBoundingClientRect();
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + b.width > innerWidth - 8) x = e.clientX - b.width - 14;
    if (y + b.height > innerHeight - 8) y = e.clientY - b.height - 14;
    t.style.left = Math.max(8, x) + 'px';
    t.style.top = Math.max(8, y) + 'px';
  }
  const hideTip = () => { tipEl().hidden = true; };

  /* ══ 抽屉 ═══════════════════════════════════════════════ */

  function openDrawer(id) {
    openId = id;
    openIsNew = !id;
    roundDraft = null;
    if (!id) { const r = blank(); data.records.unshift(r); openId = r.id; }
    $('#scrim').hidden = false;
    $('#drawer').hidden = false;
    paintDrawer();
    setTimeout(() => $('#drawer').querySelector('input')?.focus(), 40);
  }
  function closeDrawer() {
    const r = byId(openId);
    // 新建后什么都没填 → 不留空记录（只对本次新建的生效，不会误删已有记录）
    if (openIsNew && r && !r.company.trim() && !r.role.trim() && !r.rounds.length && !r.note.trim()) {
      data.records = data.records.filter(x => x.id !== r.id);
    }
    openId = null; openIsNew = false; roundDraft = null;
    $('#scrim').hidden = true; $('#drawer').hidden = true;
    save(); render();
  }

  function paintDrawer() {
    const r = byId(openId); if (!r) return closeDrawer();
    const st = S[r.status];
    const d = clear($('#drawer'));

    const touch = () => { r.updatedAt = Date.now(); save(); render(); };
    const bind = (key, opts = {}) => ({
      value: r[key] ?? '',
      oninput: e => { r[key] = e.target.value; touch(); },
      ...opts,
    });

    d.append(
      h('div', { class: 'drawer-head' },
        h('div', {},
          h('h2', { text: r.company || '新建投递' }),
          h('p', { text: [r.role, r.city].filter(Boolean).join(' · ') || '填写下面的信息' })),
        statusPill(r.status),
        h('button', { class: 'drawer-close', 'aria-label': '关闭', text: '✕', onclick: closeDrawer })),

      h('div', { class: 'drawer-body' },

        /* 状态推进 */
        h('div', { class: 'sec' },
          h('div', { class: 'sec-title', text: '状态流转' }),
          h('div', { class: 'advance' },
            h('span', { class: 'adv-btn', 'aria-current': 'true', style: { '--tone': st.tone } },
              h('span', { class: 'glyph', 'aria-hidden': 'true', text: st.glyph }), '当前：' + st.label),
            ...NEXT[r.status].map(n => h('button', {
              class: 'adv-btn', style: { '--tone': S[n].tone },
              onclick: () => { setStatus(r, n); paintDrawer(); render(); },
            }, '→ ', h('span', { class: 'glyph', 'aria-hidden': 'true', text: S[n].glyph }), S[n].label))),
          r.history.length > 1 ? h('div', { class: 'hist', style: { 'margin-top': '10px' } },
            r.history.slice(-4).reverse().map(x => h('div', { class: 'hist-row' },
              h('time', { text: fmtWhen(localISO(x.at)) }),
              h('span', { text: `${S[x.from]?.label || x.from} → ${S[x.to]?.label || x.to}` })))) : null),

        /* 基本信息 */
        h('div', { class: 'sec' },
          h('div', { class: 'sec-title', text: '基本信息' }),
          h('div', { class: 'grid2' },
            f('公司', h('input', bind('company', { placeholder: '例：某某科技', oninput: e => { r.company = e.target.value; r.updatedAt = Date.now(); save(); $('#drawer').querySelector('h2').textContent = r.company || '新建投递'; render(); } }))),
            f('岗位', h('input', bind('role', { placeholder: '例：前端工程师' }))),
            f('城市', h('input', bind('city', { placeholder: '例：上海' }))),
            f('办公方式', sel(WORKMODE.map(m => [m.id, m.label]), r.workMode, v => { r.workMode = v; touch(); })),
            f('渠道来源', h('input', bind('source', { placeholder: '内推 / 官网 / BOSS / 猎头…', list: 'src-list' }))),
            f('薪资 / 备注', h('input', bind('salary', { placeholder: '例：30–40K ×15' }))),
            f('投递日期', h('input', bind('appliedAt', { type: 'date' }))),
            f('重点关注', sel([['0', '普通'], ['1', '★ 重点']], r.star ? '1' : '0',
              v => { r.star = v === '1'; touch(); })),
            r.status === 'closed'
              ? h('div', { class: 'full' }, f('结束原因', sel(OUTCOME.map(o => [o.id, o.label]), r.outcome || 'rejected', v => { r.outcome = v; touch(); })))
              : null,
            h('div', { class: 'full' }, f('标签（逗号分隔）', h('input', {
              value: r.tags.join(', '), placeholder: '大厂, 远程友好, 需要笔试',
              oninput: e => { r.tags = e.target.value.split(/[,，]/).map(s => s.trim()).filter(Boolean); touch(); },
            }))),
            h('div', { class: 'full' }, f('备注', h('textarea', bind('note', { placeholder: 'JD 要点、面试官反馈、待确认的问题…' })))),
          )),

        /* 面试轮次 */
        h('div', { class: 'sec' },
          h('div', { class: 'sec-title', text: `面试轮次（${r.rounds.length}）` }),
          roundDraft ? roundEditor(r) : h('button', {
            class: 'btn btn-sm', style: { 'margin-bottom': '12px' },
            onclick: () => {
              roundDraft = { id: uid(), name: ROUND_PRESETS[Math.min(r.rounds.length, ROUND_PRESETS.length - 1)],
                             at: '', mode: 'video', location: '', interviewer: '', result: 'pending', note: '' };
              paintDrawer();
            },
          }, '＋ 添加一轮'),
          r.rounds.length ? h('div', { class: 'rounds' }, sortedRounds(r).map(x => roundEl(r, x)))
                          : h('p', { class: 'hint', text: '还没有记录任何轮次。' })),
      ),

      h('div', { class: 'drawer-foot' },
        h('button', { class: 'btn btn-danger btn-sm', onclick: () => del(r) }, '删除这条'),
        h('span', { class: 'spacer' }),
        h('span', { class: 'hint', text: '改动即时保存' }),
        h('button', { class: 'btn btn-primary', onclick: closeDrawer }, '完成')),

      h('datalist', { id: 'src-list' },
        [...new Set(data.records.map(x => x.source).filter(Boolean))].map(s => h('option', { value: s }))),
    );
  }

  const f = (label, ctl) => h('label', { class: 'f' }, h('span', { text: label }), ctl);
  function sel(pairs, cur, on) {
    return h('select', { value: cur, onchange: e => on(e.target.value) },
      pairs.map(([v, t]) => h('option', { value: v, text: t, selected: v === cur })));
  }
  const sortedRounds = r => [...r.rounds].sort((a, b) => (a.at || '9999').localeCompare(b.at || '9999'));

  function roundEl(r, x) {
    const res = R[x.result] || R.pending;
    const md = MODE.find(m => m.id === x.mode);
    return h('div', { class: 'round', style: { '--tone': res.tone } },
      h('div', { class: 'round-head' },
        h('span', { class: 'round-name', text: x.name || '一轮' }),
        h('span', { class: 'round-badge', style: { '--tone': res.tone } },
          h('span', { class: 'g', 'aria-hidden': 'true', text: res.glyph }), h('span', { text: res.label })),
        x.at ? h('span', { class: 'round-when', text: fmtWhen(x.at) }) : h('span', { class: 'round-when', text: '未定时间' })),
      h('div', { class: 'round-meta' },
        md ? h('span', { text: md.label }) : null,
        x.location ? h('span', { text: '◎ ' + x.location }) : null,
        x.interviewer ? h('span', { text: '面试官 ' + x.interviewer }) : null),
      x.note ? h('div', { class: 'round-note', text: x.note }) : null,
      h('div', { class: 'round-actions' },
        ...(x.result === 'pending' ? [
          h('button', { class: 'btn btn-sm', onclick: () => { x.result = 'pass'; r.updatedAt = Date.now(); save(); paintDrawer(); render(); } }, '✓ 通过'),
          h('button', { class: 'btn btn-sm', onclick: () => { x.result = 'fail'; r.updatedAt = Date.now(); save(); paintDrawer(); render(); } }, '✕ 未过'),
        ] : [
          h('button', { class: 'btn btn-sm', onclick: () => { x.result = 'pending'; r.updatedAt = Date.now(); save(); paintDrawer(); render(); } }, '↺ 改回待定'),
        ]),
        h('button', { class: 'btn btn-sm', onclick: () => { roundDraft = { ...x }; paintDrawer(); } }, '编辑'),
        h('button', { class: 'btn btn-sm btn-danger', onclick: () => {
          r.rounds = r.rounds.filter(y => y.id !== x.id); r.updatedAt = Date.now(); save(); paintDrawer(); render();
        } }, '删除')));
  }

  function roundEditor(r) {
    const dft = roundDraft;
    const set = (k, v) => { dft[k] = v; };
    return h('div', { class: 'round-editor' },
      h('div', { class: 'grid2' },
        f('轮次名称', h('input', { value: dft.name, list: 'round-names', oninput: e => set('name', e.target.value) })),
        f('时间', h('input', { type: 'datetime-local', value: dft.at, oninput: e => set('at', e.target.value) })),
        f('形式', sel(MODE.map(m => [m.id, m.label]), dft.mode, v => set('mode', v))),
        f('结果', sel(RESULT.map(x => [x.id, x.label]), dft.result, v => set('result', v))),
        h('div', { class: 'full' }, f('地点 / 会议链接', h('input', { value: dft.location, placeholder: '例：张江某某大厦 12F，或腾讯会议号', oninput: e => set('location', e.target.value) }))),
        f('面试官', h('input', { value: dft.interviewer, placeholder: '姓名 / 职位', oninput: e => set('interviewer', e.target.value) })),
        h('div', { class: 'full' }, f('记录', h('textarea', { value: dft.note, placeholder: '问了什么、答得怎样、下次要准备的…', oninput: e => set('note', e.target.value) }))),
      ),
      h('div', { class: 'round-actions', style: { 'margin-top': '10px' } },
        h('button', { class: 'btn btn-primary btn-sm', onclick: () => {
          const i = r.rounds.findIndex(y => y.id === dft.id);
          if (i >= 0) r.rounds[i] = dft; else r.rounds.push(dft);
          // 记了轮次却还停在「已投递」→ 顺手推进到「面试中」
          if (['wish', 'applied', 'assess'].includes(r.status)) setStatus(r, 'interview', true);
          r.updatedAt = Date.now(); roundDraft = null; save(); paintDrawer(); render();
        } }, '保存这一轮'),
        h('button', { class: 'btn btn-sm', onclick: () => { roundDraft = null; paintDrawer(); } }, '取消')),
      h('datalist', { id: 'round-names' }, ROUND_PRESETS.map(n => h('option', { value: n }))));
  }

  function del(r) {
    undoBuf = { rec: r, idx: data.records.indexOf(r) };
    data.records = data.records.filter(x => x.id !== r.id);
    openId = null; $('#scrim').hidden = true; $('#drawer').hidden = true;
    save(); render();
    toast(`已删除「${r.company || '未命名'}」`, '撤销', () => {
      data.records.splice(undoBuf.idx, 0, undoBuf.rec); save(); render();
    });
  }

  /* ══ toast ══════════════════════════════════════════════ */

  function toast(msg, actionLabel, action) {
    const el = h('div', { class: 'toast' }, h('span', { text: msg }),
      action ? h('button', { class: 'btn btn-sm', onclick: () => { action(); el.remove(); } }, actionLabel) : null);
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), action ? 7000 : 2600);
  }

  /* ══ 筛选下拉同步 ═══════════════════════════════════════ */

  function syncFilterOptions() {
    const sSel = $('#f-status');
    if (!sSel.options.length) {
      sSel.appendChild(h('option', { value: 'all', text: '全部状态' }));
      STATUS.forEach(st => sSel.appendChild(h('option', { value: st.id, text: `${st.glyph} ${st.label}` })));
    }
    const cities = [...new Set(data.records.map(r => (r.city || '').trim() || '未填'))].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
    const cSel = $('#f-city');
    const want = ['all', ...cities].join('|');
    if (cSel.dataset.sig !== want) {
      cSel.dataset.sig = want;
      clear(cSel).appendChild(h('option', { value: 'all', text: '全部城市' }));
      cities.forEach(c => cSel.appendChild(h('option', { value: c, text: c })));
      cSel.value = cities.includes(ui.city) ? ui.city : 'all';
      ui.city = cSel.value;
    }
  }

  /* ══ 导入 / 导出 / 示例 ═════════════════════════════════ */

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), records: data.records }, null, 2)],
      { type: 'application/json;charset=utf-8' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `面试记录-${todayISO()}.json` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`已导出 ${data.records.length} 条记录`);
  }
  function importJSON(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const p = JSON.parse(fr.result);
        const recs = Array.isArray(p) ? p : p.records;
        if (!Array.isArray(recs)) throw new Error('格式不对');
        recs.forEach(r => { if (!r.id) r.id = uid(); normalize(r); });
        if (data.records.length && !confirm(`导入 ${recs.length} 条。\n\n确定 = 替换现有 ${data.records.length} 条\n取消 = 合并（同 id 覆盖）`)) {
          const m = new Map(data.records.map(r => [r.id, r]));
          recs.forEach(r => m.set(r.id, r));
          data.records = [...m.values()];
        } else {
          data.records = recs;
        }
        save(); render(); toast(`导入完成，现有 ${data.records.length} 条`);
      } catch (e) { toast('导入失败：不是有效的记录文件'); }
    };
    fr.readAsText(file, 'utf-8');
  }

  function loadSample() {
    const D = n => { const d = new Date(Date.now() - n * 86400e3); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
    const T = (n, hh) => { const d = new Date(Date.now() + n * 86400e3); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${hh}`; };
    const mk = o => normalize(Object.assign(blank(), o, { id: uid(), createdAt: Date.now(), updatedAt: Date.now() - (o._idle || 0) * 86400e3 }));
    data.records = [
      mk({ company: '星野科技', role: '高级前端工程师', city: '上海', source: '内推', salary: '35–45K ×15',
           appliedAt: D(21), status: 'final', reached: ['applied', 'assess', 'interview', 'final'], star: true,
           tags: ['大厂', '内推'], note: '内推人：老王。三面偏架构，准备一下微前端和构建优化。',
           rounds: [
             { id: uid(), name: '一面', at: T(-14, '14:00'), mode: 'video', location: '腾讯会议', interviewer: '李工', result: 'pass', note: '手写 Promise.all、聊了下项目性能优化。' },
             { id: uid(), name: '二面', at: T(-6, '10:30'), mode: 'video', location: '飞书会议', interviewer: '张组长', result: 'pass', note: '系统设计：前端埋点方案。' },
             { id: uid(), name: '三面（主管）', at: T(1, '15:00'), mode: 'onsite', location: '浦东新区世纪大道 100 号 28F', interviewer: '陈总监', result: 'pending', note: '' },
           ] }),
      mk({ company: '青柠网络', role: '前端工程师', city: '杭州', source: 'BOSS 直聘', salary: '30–38K ×14',
           appliedAt: D(12), status: 'interview', reached: ['applied', 'interview'], tags: ['远程友好'],
           rounds: [{ id: uid(), name: '一面', at: T(0, '19:30'), mode: 'video', location: '腾讯会议 812-334-901', interviewer: '技术负责人', result: 'pending', note: '晚上，注意别迟到' }] }),
      mk({ company: '云梯数据', role: 'Web 前端', city: '北京', source: '官网投递', appliedAt: D(30), status: 'closed',
           outcome: 'rejected', reached: ['applied', 'assess', 'interview'], tags: ['需要笔试'],
           note: '二面挂在算法上，回去补一下动态规划。',
           rounds: [
             { id: uid(), name: '一面', at: T(-22, '16:00'), mode: 'phone', location: '', interviewer: '', result: 'pass', note: '' },
             { id: uid(), name: '二面', at: T(-16, '14:00'), mode: 'video', location: 'Zoom', interviewer: '', result: 'fail', note: '算法题没做出来。' },
           ] }),
      mk({ company: '南屿智能', role: '资深前端', city: '深圳', source: '猎头', salary: '40–50K ×16',
           appliedAt: D(26), status: 'offer', reached: ['applied', 'interview', 'final', 'offer'], star: true,
           tags: ['大厂'], note: 'Offer 已发，等 HR 谈薪。给到 42K ×16。',
           rounds: [
             { id: uid(), name: '一面', at: T(-19, '10:00'), mode: 'video', location: '', interviewer: '', result: 'pass', note: '' },
             { id: uid(), name: '二面', at: T(-12, '14:00'), mode: 'onsite', location: '南山区科技园', interviewer: '', result: 'pass', note: '' },
             { id: uid(), name: 'HR 面', at: T(-5, '11:00'), mode: 'phone', location: '', interviewer: 'HR 刘女士', result: 'pass', note: '谈薪：期望 45K。' },
           ] }),
      mk({ company: '万川互娱', role: '前端开发', city: '上海', source: '内推', appliedAt: D(9), status: 'assess',
           reached: ['applied', 'assess'], tags: ['需要笔试'], note: '笔试链接三天内有效。', _idle: 0 }),
      mk({ company: '知微科技', role: '前端 / Node', city: '上海', source: 'BOSS 直聘', appliedAt: D(16),
           status: 'applied', reached: ['applied'], _idle: 14, note: '投完一直没消息，可以催一下 HR。' }),
      mk({ company: '海生医疗', role: '前端工程师', city: '广州', source: '官网投递', appliedAt: D(5),
           status: 'applied', reached: ['applied'] }),
      mk({ company: '溯光信息', role: '全栈工程师', city: '成都', source: '朋友推荐', appliedAt: D(3),
           status: 'wish', reached: ['wish'], tags: ['待考虑'], note: '还在犹豫要不要投，城市有点远。' }),
      mk({ company: '北辰云', role: '前端专家', city: '北京', source: '猎头', appliedAt: D(44), status: 'closed',
           outcome: 'declined', reached: ['applied', 'interview', 'final', 'offer'],
           note: '拿到了但薪资没谈拢，婉拒。',
           rounds: [
             { id: uid(), name: '一面', at: T(-38, '15:00'), mode: 'video', location: '', interviewer: '', result: 'pass', note: '' },
             { id: uid(), name: '终面', at: T(-31, '10:00'), mode: 'onsite', location: '海淀区中关村', interviewer: '', result: 'pass', note: '' },
           ] }),
      mk({ company: '澜图设计', role: '前端 + 可视化', city: '杭州', source: '内推', appliedAt: D(38),
           status: 'closed', outcome: 'ghosted', reached: ['applied'], _idle: 30, note: '投了就没下文了。' }),
    ];
    save(); render();
    toast('已载入 10 条示例数据 —— 随时可以全部删掉');
  }

  /* ══ 主题 ═══════════════════════════════════════════════ */

  function applyTheme() {
    if (data.theme) document.documentElement.dataset.theme = data.theme;
    else delete document.documentElement.dataset.theme;
    const dark = data.theme === 'dark' ||
      (!data.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    $('#theme-glyph').textContent = dark ? '☾' : '☀';
  }

  /* ══ 事件绑定 ═══════════════════════════════════════════ */

  function wire() {
    $('#btn-new').onclick = () => openDrawer(null);
    $('#btn-export').onclick = exportJSON;
    $('#btn-import').onclick = () => $('#file-input').click();
    $('#file-input').onchange = e => { if (e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ''; };
    $('#btn-theme').onclick = () => {
      const dark = data.theme === 'dark' || (!data.theme && matchMedia('(prefers-color-scheme: dark)').matches);
      data.theme = dark ? 'light' : 'dark';
      applyTheme(); save();
    };
    $('#scrim').onclick = closeDrawer;

    let t;
    $('#f-q').oninput = e => { clearTimeout(t); t = setTimeout(() => { ui.q = e.target.value; render(); }, 140); };
    $('#f-range').onchange = e => { ui.range = e.target.value; render(); };
    $('#f-status').onchange = e => { ui.status = e.target.value; render(); };
    $('#f-city').onchange = e => { ui.city = e.target.value; render(); };
    $('#f-sort').onchange = e => { ui.sort = e.target.value; render(); };

    document.querySelectorAll('.seg-btn[data-view]').forEach(b =>
      b.onclick = () => { data.view = b.dataset.view; save(); render(); });

    document.addEventListener('keydown', e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.key === 'Escape') { if (!$('#drawer').hidden) closeDrawer(); else if (typing) e.target.blur(); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openDrawer(null); }
      else if (e.key === '/') { e.preventDefault(); $('#f-q').focus(); }
    });

    // 主题跟随系统时，系统切换要重绘图标
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    // 趋势图按容器宽度铺满，窗口变化时重画
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (data.view === 'stats') render(); }, 200); });
  }

  /* ══ 启动 ═══════════════════════════════════════════════ */

  load();
  applyTheme();
  wire();
  $('#f-sort').value = ui.sort;
  render();
})();
