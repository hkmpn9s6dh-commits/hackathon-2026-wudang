/**
 * 两套材质。同一座山、同一个动作，换的是「这东西是什么做的」。
 *
 * paper  —— 纸与墨。文人的看山方式。
 * bronze —— 暗铜与鎏金。金顶太和宫是明代铜铸鎏金殿，金顶之名由此而来；
 *           铜会氧化、会磨，吸气时被擦亮一点，呼气又暗回去。
 *
 * 之所以要第二套：米白纸 + 宋体竖排 + 朱砂小印，已经成了「AI 新中式」的通用配方，
 * 好看但没有作者。稀缺性只能从「具体的物」里来，不能从「更极简」里来。
 */

export type ThemeId = 'paper' | 'bronze';

export interface Theme {
  id: ThemeId;
  /** 底色三段：上、中、下 */
  base: [string, string, string];
  /** 山体叠上去的颜色（在深底上是「受光」） */
  range: string;
  /** 山脚化开时用的底色 */
  fade: string;
  /** 化开方式：erase = 擦掉露出纸；paint = 用底色盖回去（深底上更稳） */
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
  /** 纸纹强度 */
  grain: number;
  /** 金顶上方那抹天光 */
  glow: string;
}

export const THEMES: Record<ThemeId, Theme> = {
  paper: {
    id: 'paper',
    base: ['#faf6ec', '#f5efe3', '#eee5d5'],
    range: '27,25,22',
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
    glow: '198,158,104',
  },
  bronze: {
    id: 'bronze',
    // 夜里的铜：暗部近黑，只有受光的边是金的。不是"暖色调照片"
    base: ['#0b0a08', '#100e09', '#0a0806'],
    range: '46,37,22',
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
    glow: '226,186,116',
  },
};

export function themeFrom(search: string): Theme {
  const param = new URLSearchParams(search).get('theme');
  if (param === 'bronze' || param === 'paper') return THEMES[param];
  // 默认是铜版：这是这一版要去撞的东西。想看旧版加 ?theme=paper
  return THEMES.bronze;
}
