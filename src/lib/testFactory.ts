/** 测试用的数据工厂。只被 *.test.ts 引用。 */

import type { Application, Round } from '../types';
import { blankApplication } from './storage';

let seq = 0;

export function makeApp(patch: Partial<Application> = {}): Application {
  seq += 1;
  return {
    ...blankApplication(),
    id: `app-${seq}`,
    company: `公司${seq}`,
    role: '前端工程师',
    city: '上海',
    source: '内推',
    ...patch,
  };
}

export function makeRound(patch: Partial<Round> = {}): Round {
  seq += 1;
  return {
    id: `round-${seq}`,
    name: '一面',
    at: '',
    mode: 'video',
    location: '',
    interviewer: '',
    result: 'pending',
    note: '',
    ...patch,
  };
}
