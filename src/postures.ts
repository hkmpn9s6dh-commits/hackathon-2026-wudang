/**
 * 十三势 —— 作品的全部文字内容与姿态参数。
 *
 * 势名与「掤在两臂、捋在掌中……」取自武当/太极一脉相传的十三势行功心解；
 * 后半句是为金顶这一处山写的，不复述原诀。
 * 《十三势歌》为王宗岳旧文，公有领域，逐势引一句。
 */

export interface Pose {
  /** 上身倾角，度，正为向右前俯 */
  lean: number;
  /** 屈膝下沉 0..1 */
  sink: number;
  /** 两脚开度系数 0.55..1.15 */
  stance: number;
  /** 头偏，度 */
  head: number;
  /** 左臂：上臂角、前臂角，度。0 为向下，90 为向右手边，-90 为向左手边 */
  armL: [number, number];
  armR: [number, number];
}

export interface Posture {
  /** 势名，一个字 */
  name: string;
  /** 行功心解原文半句 */
  classic: string;
  /** 为这座山写的半句 */
  gloss: string;
  /** 《十三势歌》一句 */
  verse: string;
  pose: Pose;
}

export const POSTURES: readonly Posture[] = [
  {
    name: '掤',
    classic: '掤在两臂',
    gloss: '如捧一炁于胸前',
    verse: '十三势势莫轻视，命意源头在腰隙。',
    pose: { lean: 0, sink: 0.12, stance: 0.82, head: 0, armL: [-58, -118], armR: [58, 118] },
  },
  {
    name: '捋',
    classic: '捋在掌中',
    gloss: '引云下七十二峰',
    verse: '变转虚实须留意，气遍身躯不稍滞。',
    pose: { lean: -7, sink: 0.2, stance: 0.9, head: -10, armL: [-104, -142], armR: [-24, -62] },
  },
  {
    name: '挤',
    classic: '挤在手背',
    gloss: '推山不动，山自开',
    verse: '静中触动动犹静，因敌变化示神奇。',
    pose: { lean: 5, sink: 0.18, stance: 0.76, head: 0, armL: [-34, -152], armR: [34, 152] },
  },
  {
    name: '按',
    classic: '按在腰攻',
    gloss: '按到金顶，云落为阶',
    verse: '势势存心揆用意，得来不觉费功夫。',
    pose: { lean: 3, sink: 0.3, stance: 0.84, head: 4, armL: [-26, -14], armR: [26, 14] },
  },
  {
    name: '采',
    classic: '采在十指',
    gloss: '摘一枝松，松不折',
    verse: '刻刻留心在腰间，腹内松净气腾然。',
    pose: { lean: -4, sink: 0.16, stance: 0.78, head: -12, armL: [-138, -158], armR: [-18, -40] },
  },
  {
    name: '挒',
    classic: '挒在两肱',
    gloss: '分开云海，各归其壑',
    verse: '尾闾中正神贯顶，满身轻利顶头悬。',
    pose: { lean: 0, sink: 0.14, stance: 0.95, head: 0, armL: [-146, -168], armR: [34, 48] },
  },
  {
    name: '肘',
    classic: '肘在屈使',
    gloss: '寸劲不出三寸',
    verse: '仔细留心向推求，屈伸开合听自由。',
    pose: { lean: 6, sink: 0.2, stance: 0.74, head: 6, armL: [-38, -86], armR: [22, 132] },
  },
  {
    name: '靠',
    classic: '靠在肩胸',
    gloss: '倚住山门，门不关',
    verse: '入门引路须口授，功夫无息法自修。',
    pose: { lean: 15, sink: 0.24, stance: 0.72, head: 10, armL: [-30, -124], armR: [58, 84] },
  },
  {
    name: '进',
    classic: '进在云手',
    gloss: '一步一息，息到顶',
    verse: '若言体用何为准，意气君来骨肉臣。',
    pose: { lean: 9, sink: 0.26, stance: 0.6, head: 2, armL: [-30, -20], armR: [30, 20] },
  },
  {
    name: '退',
    classic: '退在转肱',
    gloss: '退一步，山更高',
    verse: '详推用意终何在，益寿延年不老春。',
    pose: { lean: -11, sink: 0.22, stance: 1.02, head: -4, armL: [-86, -106], armR: [86, 106] },
  },
  {
    name: '顾',
    classic: '顾在三前',
    gloss: '左看，云自谷底生',
    verse: '歌兮歌兮百卅字，字字真切义无遗。',
    pose: { lean: -5, sink: 0.16, stance: 0.8, head: -22, armL: [-96, -112], armR: [36, 62] },
  },
  {
    name: '盼',
    classic: '盼在七星',
    gloss: '右看，日从崖上来',
    verse: '若不向此推求去，枉费功夫贻叹息。',
    pose: { lean: 5, sink: 0.16, stance: 0.8, head: 22, armL: [-36, -62], armR: [96, 112] },
  },
  {
    name: '定',
    classic: '定在有隙',
    gloss: '定，然后一炁朝元',
    verse: '太极者，无极而生，动静之机，阴阳之母也。',
    pose: { lean: 0, sink: 0.04, stance: 0.7, head: 0, armL: [-9, -5], armR: [9, 5] },
  },
];

/** 无极：还没吸气时的样子，也是每一势的起手。 */
export const WUJI: Pose = { lean: 0, sink: 0.02, stance: 0.68, head: 0, armL: [-7, -4], armR: [7, 4] };

export function postureAt(index: number): Posture {
  const n = POSTURES.length;
  const wrapped = ((index % n) + n) % n;
  const found = POSTURES[wrapped];
  if (!found) throw new Error(`no posture at ${index}`);
  return found;
}

export function isComplete(index: number): boolean {
  return index >= POSTURES.length;
}

/** 线性插值两个姿态；t=0 取 a，t=1 取 b。用于无极→势、势→无极的过渡。 */
export function blendPose(a: Pose, b: Pose, t: number): Pose {
  const k = clamp01(t);
  const mix = (x: number, y: number): number => x + (y - x) * k;
  return {
    lean: mix(a.lean, b.lean),
    sink: mix(a.sink, b.sink),
    stance: mix(a.stance, b.stance),
    head: mix(a.head, b.head),
    armL: [mix(a.armL[0], b.armL[0]), mix(a.armL[1], b.armL[1])],
    armR: [mix(a.armR[0], b.armR[0]), mix(a.armR[1], b.armR[1])],
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
