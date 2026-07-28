import { describe, expect, it } from 'vitest';

import { parseImport } from './backup';
import { blankApplication, normalize } from './storage';

describe('normalize（外部数据兜底）', () => {
  it('完全空的对象也能补成合法记录', () => {
    const a = normalize({});
    expect(a.id).toBeTruthy();
    expect(a.status).toBe('applied');
    expect(a.rounds).toEqual([]);
    expect(a.tags).toEqual([]);
    expect(a.reached).toEqual(['applied']);
  });

  it('null / undefined / 非对象都不炸', () => {
    expect(() => normalize(null)).not.toThrow();
    expect(() => normalize(undefined)).not.toThrow();
    expect(normalize(null).status).toBe('applied');
  });

  it('非法状态回落到 applied', () => {
    expect(normalize({ status: '乱写的' }).status).toBe('applied');
  });

  it('字段类型不对时用默认值，不把脏数据带进界面', () => {
    const a = normalize({ company: 123, tags: 'not-an-array', rounds: null, star: 'yes' });
    expect(a.company).toBe('');
    expect(a.tags).toEqual([]);
    expect(a.rounds).toEqual([]);
    expect(a.star).toBe(false); // 只有严格 true 才算重点
  });

  it('tags 里的非字符串项被剔除', () => {
    expect(normalize({ tags: ['ok', 42, null, '好'] }).tags).toEqual(['ok', '好']);
  });

  it('非 closed 状态强制清空 outcome', () => {
    expect(normalize({ status: 'interview', outcome: 'rejected' }).outcome).toBe('');
  });

  it('closed 状态缺 outcome 时补成「未通过」', () => {
    expect(normalize({ status: 'closed' }).outcome).toBe('rejected');
  });

  it('reached 里不允许出现 closed', () => {
    const a = normalize({ status: 'closed', reached: ['applied', 'closed', 'interview'] });
    expect(a.reached).toEqual(['applied', 'interview']);
  });

  it('当前状态会被补进 reached', () => {
    expect(normalize({ status: 'final', reached: ['applied'] }).reached).toContain('final');
  });

  it('轮次缺 id 时补一个，结果非法时回落到待定', () => {
    const a = normalize({ rounds: [{ name: '一面', result: '瞎写' }] });
    expect(a.rounds[0].id).toBeTruthy();
    expect(a.rounds[0].result).toBe('pending');
    expect(a.rounds[0].mode).toBe('video');
  });

  it('history 里的非法状态被规整而不是丢弃整条', () => {
    const a = normalize({ history: [{ at: 123, from: '乱', to: 'offer' }] });
    expect(a.history).toHaveLength(1);
    expect(a.history[0].from).toBe('applied');
    expect(a.history[0].to).toBe('offer');
  });

  it('保留合法的原值', () => {
    const src = { ...blankApplication(), company: '星野科技', city: '上海', status: 'offer' as const };
    const a = normalize(src);
    expect(a.company).toBe('星野科技');
    expect(a.city).toBe('上海');
    expect(a.status).toBe('offer');
  });
});

describe('parseImport', () => {
  it('接受 { applications: [...] }', () => {
    const text = JSON.stringify({ applications: [{ company: 'A' }, { company: 'B' }] });
    expect(parseImport(text)).toHaveLength(2);
  });

  it('接受裸数组', () => {
    expect(parseImport(JSON.stringify([{ company: 'A' }]))).toHaveLength(1);
  });

  it('兼容原生 JS 版导出的 { records: [...] }', () => {
    const text = JSON.stringify({ records: [{ company: '旧版' }] });
    expect(parseImport(text)[0].company).toBe('旧版');
  });

  it('导入的记录同样过 normalize', () => {
    const text = JSON.stringify({ applications: [{ company: 'A', status: '瞎写', tags: null }] });
    const [a] = parseImport(text);
    expect(a.status).toBe('applied');
    expect(a.tags).toEqual([]);
  });

  it('结构不对时抛错而不是静默返回空', () => {
    expect(() => parseImport('{"foo":1}')).toThrow();
    expect(() => parseImport('null')).toThrow();
    expect(() => parseImport('不是 JSON')).toThrow();
  });
});
