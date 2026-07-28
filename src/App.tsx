import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BoardView } from './components/BoardView';
import { CalendarView } from './components/calendar/CalendarView';
import { EmptyState } from './components/EmptyState';
import { FilterBar } from './components/FilterBar';
import { FocusBoard } from './components/FocusBoard';
import { KpiRow } from './components/KpiRow';
import { ListView } from './components/ListView';
import { StatsView } from './components/StatsView';
import { TopBar } from './components/TopBar';
import { ApplicationDrawer } from './components/drawer/ApplicationDrawer';
import { useHotkeys } from './hooks/useHotkeys';
import { applyFilters, cityOptions } from './lib/derive';
import { sampleApplications } from './lib/sample';
import { blankApplication } from './lib/storage';
import { useStore } from './store/StoreContext';
import { useToast } from './store/ToastContext';
import { STATUS_BY_ID, type Application, type Filters, type StatusId } from './types';

const INITIAL_FILTERS: Filters = {
  q: '',
  status: 'all',
  city: 'all',
  range: 'all',
  sort: 'updated',
};

/** 新建的记录要攒到有内容才落库，否则一按 N 就会在看板上留下一张空卡片 */
const hasIdentity = (a: Application) => a.company.trim().length > 0;
const hasAnyContent = (a: Application) =>
  hasIdentity(a) || a.role.trim() !== '' || a.note.trim() !== '' || a.rounds.length > 0 || a.tags.length > 0;

export default function App() {
  const { state, dispatch, persistOk } = useStore();
  const toast = useToast();

  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [draft, setDraft] = useState<Application | null>(null);
  const draftIsNew = useRef(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const { applications, view } = state;

  const cities = useMemo(() => cityOptions(applications), [applications]);
  const rows = useMemo(() => applyFilters(applications, filters), [applications, filters]);
  const sourceSuggestions = useMemo(
    () => [...new Set(applications.map((a) => a.source.trim()).filter(Boolean))],
    [applications],
  );

  /* ── 抽屉 ─────────────────────────────────────────────── */

  const openNew = useCallback(() => {
    draftIsNew.current = true;
    setDraft(blankApplication());
  }, []);

  // 用 ref 读最新数据，让 openExisting 的引用保持稳定。
  // 否则每次数据变动它都换新引用，逐层传下去会让所有卡片的 memo 全部失效 ——
  // 400 条记录时，抽屉里敲一个字要重渲染整块看板，实测 31ms。
  const appsRef = useRef(applications);
  useEffect(() => {
    appsRef.current = applications;
  }, [applications]);

  const openExisting = useCallback((id: string) => {
    const found = appsRef.current.find((a) => a.id === id);
    if (!found) return;
    draftIsNew.current = false;
    setDraft(found);
  }, []);

  const changeDraft = useCallback(
    (next: Application) => {
      setDraft(next);
      if (!draftIsNew.current || hasIdentity(next)) {
        draftIsNew.current = false;
        dispatch({ type: 'upsert', app: next });
      }
    },
    [dispatch],
  );

  const closeDrawer = useCallback(() => {
    // 只填了备注/轮次却没写公司名的，也别丢 —— 存成「未命名」
    if (draft && draftIsNew.current && hasAnyContent(draft)) {
      dispatch({ type: 'upsert', app: draft });
    }
    draftIsNew.current = false;
    setDraft(null);
  }, [dispatch, draft]);

  const deleteDraft = useCallback(() => {
    if (!draft) return;
    // 快照本次删除的记录和位置，多次删除各自撤销互不干扰
    const removed = draft;
    const index = Math.max(0, appsRef.current.findIndex((a) => a.id === removed.id));
    const existed = !draftIsNew.current;
    draftIsNew.current = false;
    setDraft(null);
    if (!existed) return;
    dispatch({ type: 'remove', id: removed.id });
    toast.push(`已删除「${removed.company || '未命名'}」`, {
      label: '撤销',
      run: () => dispatch({ type: 'restore', app: removed, index }),
    });
  }, [dispatch, draft, toast]);

  /* ── 看板拖拽 ─────────────────────────────────────────── */

  const moveTo = useCallback(
    (id: string, to: StatusId) => {
      const app = appsRef.current.find((a) => a.id === id);
      if (!app || app.status === to) return;
      dispatch({ type: 'advance', id, to });
      toast.push(`${app.company || '该投递'} → ${STATUS_BY_ID[to].label}`);
    },
    [dispatch, toast],
  );

  /* ── 快捷键（抽屉打开时让路）─────────────────────────── */

  useHotkeys({
    enabled: draft === null,
    onNew: openNew,
    onSearch: () => searchRef.current?.focus(),
  });

  const loadSample = useCallback(() => {
    dispatch({ type: 'replaceAll', apps: sampleApplications() });
    toast.push('已载入 10 条示例数据 —— 随时可以全部删掉');
  }, [dispatch, toast]);

  const empty = applications.length === 0;

  return (
    <>
      <TopBar onNew={openNew} />

      <main className="page">
        {!persistOk && (
          <div className="persist-warning" role="alert">
            <strong>改动没能写进浏览器本地存储。</strong>
            可能是隐私/无痕模式，或者存储空间已满 —— 现在的修改只存在于这个页面，
            刷新就会丢失。建议先用右上角的「导出」保存一份 JSON。
          </div>
        )}
        {!empty && <FocusBoard applications={applications} onOpen={openExisting} />}
        {!empty && <KpiRow rows={rows} total={applications.length} />}

        <FilterBar
          ref={searchRef}
          filters={filters}
          onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
          cities={cities}
          view={view}
          onView={(v) => dispatch({ type: 'setView', view: v })}
        />

        {!empty && (
          <p className="result-count">
            {rows.length} 家 / 共 {applications.length} 家
            {rows.length !== applications.length && '（已筛选）'}
          </p>
        )}

        {empty ? (
          <EmptyState onNew={openNew} onLoadSample={loadSample} />
        ) : view === 'board' ? (
          <BoardView rows={rows} onOpen={openExisting} onMove={moveTo} />
        ) : view === 'calendar' ? (
          <CalendarView rows={rows} onOpen={openExisting} />
        ) : view === 'list' ? (
          <ListView rows={rows} onOpen={openExisting} />
        ) : (
          <StatsView rows={rows} />
        )}
      </main>

      {draft && (
        <ApplicationDrawer
          key={draft.id}
          app={draft}
          onChange={changeDraft}
          onClose={closeDrawer}
          onDelete={deleteDraft}
          sourceSuggestions={sourceSuggestions}
        />
      )}
    </>
  );
}
