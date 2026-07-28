/** 示例数据 —— 只在用户主动点「载入示例数据」时生成，不会自动塞进去。 */

import type { Application, Round } from '../types';
import { localISO } from './date';
import { uid } from './id';
import { blankApplication } from './storage';

/** n 天前的日期 */
const ago = (n: number) => localISO(Date.now() - n * 86_400_000);
/** n 天后的 'YYYY-MM-DDTHH:mm'（n 为负则是过去） */
const at = (n: number, hhmm: string) => `${localISO(Date.now() + n * 86_400_000)}T${hhmm}`;

const round = (r: Partial<Round> & Pick<Round, 'name'>): Round => ({
  id: uid(),
  at: '',
  mode: 'video',
  location: '',
  interviewer: '',
  result: 'pending',
  note: '',
  ...r,
});

const make = (o: Partial<Application> & { idleDays?: number }): Application => {
  const { idleDays = 0, ...rest } = o;
  return {
    ...blankApplication(),
    ...rest,
    id: uid(),
    createdAt: Date.now(),
    updatedAt: Date.now() - idleDays * 86_400_000,
  };
};

export function sampleApplications(): Application[] {
  return [
    make({
      company: '星野科技',
      role: '高级前端工程师',
      city: '上海',
      source: '内推',
      salary: '35–45K ×15',
      appliedAt: ago(21),
      status: 'final',
      reached: ['applied', 'assess', 'interview', 'final'],
      star: true,
      tags: ['大厂', '内推'],
      note: '内推人：老王。三面偏架构，准备一下微前端和构建优化。',
      rounds: [
        round({ name: '一面', at: at(-14, '14:00'), location: '腾讯会议', interviewer: '李工', result: 'pass', note: '手写 Promise.all、聊了下项目性能优化。' }),
        round({ name: '二面', at: at(-6, '10:30'), location: '飞书会议', interviewer: '张组长', result: 'pass', note: '系统设计：前端埋点方案。' }),
        round({ name: '三面（主管）', at: at(1, '15:00'), mode: 'onsite', location: '浦东新区世纪大道 100 号 28F', interviewer: '陈总监' }),
      ],
    }),
    make({
      company: '青柠网络',
      role: '前端工程师',
      city: '杭州',
      source: 'BOSS 直聘',
      salary: '30–38K ×14',
      appliedAt: ago(12),
      status: 'interview',
      reached: ['applied', 'interview'],
      tags: ['远程友好'],
      rounds: [
        round({ name: '一面', at: at(0, '19:30'), location: '腾讯会议 812-334-901', interviewer: '技术负责人', note: '晚上，注意别迟到' }),
      ],
    }),
    make({
      company: '云梯数据',
      role: 'Web 前端',
      city: '北京',
      source: '官网投递',
      appliedAt: ago(30),
      status: 'closed',
      outcome: 'rejected',
      reached: ['applied', 'assess', 'interview'],
      tags: ['需要笔试'],
      note: '二面挂在算法上，回去补一下动态规划。',
      rounds: [
        round({ name: '一面', at: at(-22, '16:00'), mode: 'phone', result: 'pass' }),
        round({ name: '二面', at: at(-16, '14:00'), location: 'Zoom', result: 'fail', note: '算法题没做出来。' }),
      ],
    }),
    make({
      company: '南屿智能',
      role: '资深前端',
      city: '深圳',
      source: '猎头',
      salary: '40–50K ×16',
      appliedAt: ago(26),
      status: 'offer',
      reached: ['applied', 'interview', 'final', 'offer'],
      star: true,
      tags: ['大厂'],
      note: 'Offer 已发，等 HR 谈薪。给到 42K ×16。',
      rounds: [
        round({ name: '一面', at: at(-19, '10:00'), result: 'pass' }),
        round({ name: '二面', at: at(-12, '14:00'), mode: 'onsite', location: '南山区科技园', result: 'pass' }),
        round({ name: 'HR 面', at: at(-5, '11:00'), mode: 'phone', interviewer: 'HR 刘女士', result: 'pass', note: '谈薪：期望 45K。' }),
      ],
    }),
    make({
      company: '万川互娱',
      role: '前端开发',
      city: '上海',
      source: '内推',
      appliedAt: ago(9),
      status: 'assess',
      reached: ['applied', 'assess'],
      tags: ['需要笔试'],
      note: '笔试链接三天内有效。',
    }),
    make({
      company: '知微科技',
      role: '前端 / Node',
      city: '上海',
      source: 'BOSS 直聘',
      appliedAt: ago(16),
      status: 'applied',
      reached: ['applied'],
      idleDays: 14,
      note: '投完一直没消息，可以催一下 HR。',
    }),
    make({
      company: '海生医疗',
      role: '前端工程师',
      city: '广州',
      source: '官网投递',
      appliedAt: ago(5),
      status: 'applied',
      reached: ['applied'],
    }),
    make({
      company: '溯光信息',
      role: '全栈工程师',
      city: '成都',
      source: '朋友推荐',
      appliedAt: ago(3),
      status: 'wish',
      reached: ['wish'],
      tags: ['待考虑'],
      note: '还在犹豫要不要投，城市有点远。',
    }),
    make({
      company: '北辰云',
      role: '前端专家',
      city: '北京',
      source: '猎头',
      appliedAt: ago(44),
      status: 'closed',
      outcome: 'declined',
      reached: ['applied', 'interview', 'final', 'offer'],
      note: '拿到了但薪资没谈拢，婉拒。',
      rounds: [
        round({ name: '一面', at: at(-38, '15:00'), result: 'pass' }),
        round({ name: '终面', at: at(-31, '10:00'), mode: 'onsite', location: '海淀区中关村', result: 'pass' }),
      ],
    }),
    make({
      company: '澜图设计',
      role: '前端 + 可视化',
      city: '杭州',
      source: '内推',
      appliedAt: ago(38),
      status: 'closed',
      outcome: 'ghosted',
      reached: ['applied'],
      idleDays: 30,
      note: '投了就没下文了。',
    }),
  ];
}
