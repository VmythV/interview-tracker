import { forwardRef } from 'react';

import { STATUS, type Filters, type RangeId, type SortId, type StatusId, type ViewId } from '../types';

interface Props {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  cities: string[];
  view: ViewId;
  onView: (v: ViewId) => void;
}

const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'board', label: '看板' },
  { id: 'calendar', label: '日历' },
  { id: 'list', label: '列表' },
  { id: 'stats', label: '统计' },
];

/** 一整行筛选，作用于下方所有内容 —— 图表、统计、列表用的永远是同一片数据。 */
export const FilterBar = forwardRef<HTMLInputElement, Props>(function FilterBar(
  { filters, onChange, cities, view, onView },
  searchRef,
) {
  return (
    <section className="filters" aria-label="筛选">
      <div className="field-search">
        <span className="search-glyph" aria-hidden="true">
          ⌕
        </span>
        <input
          ref={searchRef}
          type="search"
          value={filters.q}
          placeholder="搜索公司 / 岗位 / 城市 / 标签…"
          aria-label="搜索"
          onChange={(e) => onChange({ q: e.target.value })}
        />
        <kbd className="search-kbd">/</kbd>
      </div>

      <label className="field">
        <span>时间</span>
        <select
          value={filters.range}
          onChange={(e) => onChange({ range: e.target.value as RangeId })}
        >
          <option value="all">全部时间</option>
          <option value="7">近 7 天</option>
          <option value="30">近 30 天</option>
          <option value="90">近 90 天</option>
        </select>
      </label>

      <label className="field">
        <span>状态</span>
        <select
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value as StatusId | 'all' })}
        >
          <option value="all">全部状态</option>
          {STATUS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.glyph} {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>城市</span>
        <select value={filters.city} onChange={(e) => onChange({ city: e.target.value })}>
          <option value="all">全部城市</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>排序</span>
        <select value={filters.sort} onChange={(e) => onChange({ sort: e.target.value as SortId })}>
          <option value="updated">最近更新</option>
          <option value="applied">投递时间</option>
          <option value="next">最近面试</option>
          <option value="company">公司名</option>
        </select>
      </label>

      <span className="filters-spacer" />

      <div className="seg" role="tablist" aria-label="视图">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            className="seg-btn"
            aria-selected={view === v.id}
            onClick={() => onView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>
    </section>
  );
});
