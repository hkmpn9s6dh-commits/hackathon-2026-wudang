/**
 * 三套画法。同一座山、同一个动作，换的是「这是什么画」。
 *
 * qinglu —— 青绿：石青石绿赭石打底、赭墨勾勒、蛤白堆云、绢纹做底。
 *            这是《千里江山图》《桃源仙境图》画仙境用的语言。默认。
 * paper  —— 纸与墨，平滑渐变的那种。留着对照——它正是「AI 新中式」的样子。
 * bronze —— 暗铜鎏金。技术成立，但礼器的重量和仙气相反，只作实验。
 *
 * 为什么默认青绿：奶油底 + 平滑渐变剪影 + 居中大字 + 朱红小方印，
 * 是 2024 年以后「东方美学」生成图的通用配方。要破它，只能换画种——
 * 青绿有套色、有轮廓线、有绢纹、有光向，这些是生成器不会做的。
 */

export type ThemeId = 'qinglu' | 'paper' | 'bronze';

export interface Theme {
  id: ThemeId;
  /** 渲染方式：flat = 平涂块面 + 勾线（青绿/木版）；wash = 渐变晕染（纸墨） */
  render: 'flat' | 'wash';
  /** 底色三段：上、中、下。青绿的天要染石青，不是白纸 */
  base: [string, string, string];
  /** 山体颜色；flat 下按远中近分别取 */
  range: string;
  rangeColors?: [string, string, string];
  /** 轮廓线颜色 */
  contour: string;
  /** 山脚化开时用的底色 */
  fade: string;
  fadeMode: 'erase' | 'paint';
  /** 云 */
  cloud: string;
  /** 脊线与它的高光 */
  ridge: string;
  rim: string;
  /** 人物 */
  ink: string;
  inkEdge: string | null;
  /** 殿 */
  hall: string;
  /** 印章与文末的字 */
  seal: string;
  sealInk: string;
  /** 页面文字 */
  text: string;
  textSoft: string;
  textFaint: string;
  /** 纹理强度 */
  grain: number;
  /** 绢纹强度（横向细丝） */
  silk: number;
  /** 金顶上方那抹天光 */
  glow: string;
}

export const THEMES: Record<ThemeId, Theme> = {
  qinglu: {
    id: 'qinglu',
    render: 'flat',
    // 天染石青，地是绢色。这一条就把「奶油白」破了
    base: ['#dfe4dd', '#e6e2d4', '#ece6d8'],
    range: '120,144,120',
    // 远：石青灰；中：石绿；近：赭石
    rangeColors: ['150,166,166', '138,156,134', '170,146,112'],
    contour: '88,76,58',
    fade: '#e8e2d2',
    fadeMode: 'paint',
    cloud: '250,247,238',
    ridge: '196,160,96',
    rim: '176,138,74',
    ink: '#1e1c16',
    inkEdge: null,
    hall: '44,36,26',
    seal: '#a5342a',
    sealInk: '#f6efe0',
    text: '#241f18',
    textSoft: 'rgba(36,31,24,0.66)',
    textFaint: 'rgba(36,31,24,0.4)',
    grain: 0.05,
    silk: 0.055,
    glow: '232,212,158',
  },
  paper: {
    id: 'paper',
    render: 'wash',
    base: ['#faf6ec', '#f5efe3', '#eee5d5'],
    range: '27,25,22',
    contour: '22,19,16',
    fade: '#f2ece0',
    fadeMode: 'erase',
    cloud: '255,253,246',
    ridge: '22,19,16',
    rim: '184,137,74',
    ink: '#1b1916',
    inkEdge: null,
    hall: '22,19,16',
    seal: '#a33a2c',
    sealInk: '#f7f1e5',
    text: '#1b1916',
    textSoft: 'rgba(27,25,22,0.62)',
    textFaint: 'rgba(27,25,22,0.38)',
    grain: 0.04,
    silk: 0,
    glow: '198,158,104',
  },
  bronze: {
    id: 'bronze',
    render: 'flat',
    // 夜里的铜：暗部近黑，只有受光的边是金的
    base: ['#0b0a08', '#100e09', '#0a0806'],
    range: '46,37,22',
    contour: '226,186,116',
    fade: '#0a0806',
    fadeMode: 'paint',
    cloud: '226,190,132',
    ridge: '226,186,116',
    rim: '214,168,92',
    ink: '#0b0906',
    inkEdge: 'rgba(226,186,116,0.7)',
    hall: '10,8,5',
    seal: '#9c3226',
    sealInk: '#efe2c6',
    text: '#e6cf9a',
    textSoft: 'rgba(230,207,154,0.62)',
    textFaint: 'rgba(230,207,154,0.36)',
    grain: 0.05,
    silk: 0,
    glow: '226,186,116',
  },
};

export function themeFrom(search: string): Theme {
  const param = new URLSearchParams(search).get('theme');
  if (param === 'qinglu' || param === 'paper' || param === 'bronze') return THEMES[param];
  return THEMES.paper;
}
