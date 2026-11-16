(function () { try {
(function () {
'use strict';
const STORE_NS = 'xy-home-v2';
const KEY = 'diary-entries';
const TA_LAST_KEY = 'diary-ta-last';
const TA_NEXT_KEY = 'diary-ta-next';
const TA_DAY_KEY = 'diary-ta-day';
const TA_NEW_KEY = 'diary-ta-new';
const LEGACY_KEYS = [KEY, TA_LAST_KEY, TA_NEXT_KEY, TA_DAY_KEY, TA_NEW_KEY];
let legacyMigrationDone = false;
function diaryStore() {
return window.activeStore ? window.activeStore() : window.xyStore(STORE_NS + ':default');
}
function diaryGet(k) {
try { return diaryStore().get(k); } catch (e) { return null; }
}
function diarySet(k, v) {
diaryStore().set(k, v);
}
function diaryRemove(k) {
try { diaryStore().remove(k); } catch (e) {}
}
function mergeEntryLists(current, legacy) {
const anonymous = [];
const byId = {};
current.concat(legacy).forEach(x => {
if (x && typeof x.id === 'string') {
const old = byId[x.id];
if (!old || (Number(x.ts) || 0) >= (Number(old.ts) || 0)) byId[x.id] = x;
} else anonymous.push(x);
});
return anonymous.concat(Object.keys(byId).map(id => byId[id]));
}
async function readLegacyValue(fullKey) {
try {
const v = localStorage.getItem(fullKey);
if (v !== null) return v;
} catch (e) {}
if (!window.idbGet) return null;
try {
const v = await window.idbGet(fullKey);
return v === undefined || v === null ? null : v;
} catch (e) { return null; }
}
async function confirmLegacyWrite(fullKey, payload) {
try { if (localStorage.getItem(fullKey) === payload) return true; } catch (e) {}
if (window.idbSet) {
try { if (await window.idbSet(fullKey, payload)) return true; } catch (e) {}
}
try { return localStorage.getItem(fullKey) === payload; } catch (e) { return false; }
}
async function migrateLegacyKey(k) {
const oldFullKey = STORE_NS + ':' + k;
const newFullKey = STORE_NS + ':default:' + k;
let legacy = await readLegacyValue(oldFullKey);
if (legacy === null) return;
if (typeof legacy !== 'string') {
try { legacy = JSON.stringify(legacy); } catch (e) { return; }
}
const target = window.xyStore(STORE_NS + ':default');
let existing = null;
try { existing = target.get(k); } catch (e) {}
if (existing === null) {
const restored = await readLegacyValue(newFullKey);
if (restored !== null) existing = typeof restored === 'string' ? restored : JSON.stringify(restored);
}
let payload = legacy;
if (k === KEY) {
let legacyList;
try { legacyList = JSON.parse(legacy || '[]'); } catch (e) { return; }
if (!Array.isArray(legacyList)) return;
if (existing !== null) {
try {
const currentList = JSON.parse(existing || '[]');
if (Array.isArray(currentList)) payload = JSON.stringify(mergeEntryLists(currentList, legacyList));
} catch (e) {}
}
} else if (existing !== null) payload = existing;
try { target.set(k, payload); } catch (e) { return; }
if (await confirmLegacyWrite(newFullKey, payload)) {
try { window.xyStore(STORE_NS).remove(k); } catch (e) {}
}
}
async function migrateLegacyStorage() {
if (!window.xyStore) return;
for (const k of LEGACY_KEYS) {
try { await migrateLegacyKey(k); } catch (e) {}
}
}
function hydrateEntries() {
try {
const s = diaryStore();
if (s.get(KEY) !== null || !s.awaitingBigKey || !s.awaitingBigKey(KEY)) return;
const cid = window.__activeCid || 'default';
s.whenBigKeyBack(KEY, () => {
const pg = document.getElementById('page-diary');
if ((window.__activeCid || 'default') === cid && pg && !pg.hidden) showList();
});
} catch (e) {}
}
let curView = 'list';
let curId = null;
let curTab = 'mine';
let searchKeyword = '';
const TA_TEMPLATES = {
random: [
'今天也想了你很多次。不知道你现在在做什么，有没有好好吃饭。',
'这里的天气很好，云很软。如果你在就好了。',
'今天路过一家店，里面的东西很可爱，第一个就想到了你。',
'不知道为什么，今天特别想听到你的声音。',
'今天也有好好生活，因为知道你也在努力。',
'梦里有你。醒来的时候枕头是湿的，但心里是暖的。',
'今天学了新的东西，想第一个分享给你。',
'这里的星星很亮，每一颗都像你的眼睛。',
'今天有点累，但想到你就又有力气了。',
'写了一封信，不知道什么时候能寄到你那里。',
'今天也是爱你的一天。明天也是。',
'风把树叶吹得沙沙响，像你在跟我说话。',
'今天吃了好吃的东西，可惜你不能尝到。',
'这里的夜晚很安静，安静得能听见心跳。跳得很快，因为想你。',
'今天看到了彩虹，许了个愿，希望你也快乐。',
'有时候会觉得距离很远，但一想到你就在心里，又觉得很近。',
'今天也在这里等你。不管多久，都会等。',
'把对你的思念折成纸飞机，希望它能飞到你身边。',
'今天的阳光很好，晒得心里暖暖的。就像你给我的感觉。',
'不知道说什么，就是很想你。非常想。'
],
scenery: [
'今天的云很好看，一朵一朵像棉花糖。如果你在，一定会拉着我拍很多照片。',
'下雨了。雨滴打在窗户上的声音很好听，就是有点想你。',
'出太阳了。阳光落在桌上的样子，让我想起了你笑起来的样子。',
'今天的晚霞是粉色的，和你的脸颊一样好看。',
'风很舒服，吹得树叶沙沙响。要是能和你一起散步就好了。',
'夜晚的星星特别亮，每一颗都像在替我说想你。',
'这里的四季很美，但总觉得少了点什么。大概是少了你。',
'今天的天气很好，好到想立刻见到你。',
'雨后的空气很清新，混合着泥土的味道。想和你一起闻。',
'落叶飘下来的样子很美，就是有点孤单。如果你在就好了。'
],
movie: [
'今天看了一部电影，里面的主角让我想起了你。',
'电影里的台词说"有些人注定会相遇"，我想我们就是这样。',
'看了一部很感人的电影，哭了好久。如果你在，一定会笑我。',
'今天重温了我们一起看过的电影，每一个场景都记得。',
'电影散场了，但我不想走。因为一个人的时候，特别想你。',
'今天看了一部喜剧，笑得很开心。但笑完之后，更想你了。',
'电影里的爱情很美好，但我觉得我们的更好。',
'今天看了一部关于旅行的电影，突然很想去一个有你地方。',
'电影里的配乐很好听，让我想起了你哼歌的样子。',
'今天看了一部老电影，黑白画面里全是你的影子。'
],
music: [
'今天听到一首歌，歌词写的就是我们吧。',
'这首歌的旋律很美，美到我想立刻分享给你。',
'今天单曲循环了一首歌，每一句都像在说我爱你。',
'听到一首老歌，突然很想你。那时候我们还不认识呢。',
'今天的歌单很温柔，就像你给我的感觉。',
'这首歌的鼓点，踩在心跳上。就像你出现在我生命里的节奏。',
'音乐停了，就再放一首。就像想你了，就再想一遍。',
'今天学了一首新歌，想唱给你听。',
'这首歌的歌词很简单，但每一句都唱到了心里。就像你。',
'今天的音乐很好听，但总觉得少了你的和声。'
],
mood: [
'今天有点累，但想到你就又有力气了。',
'不知道为什么，今天特别想听到你的声音。',
'今天心情有点低落，但一想到你，就觉得没那么糟了。',
'有时候会觉得距离很远，但一想到你就在心里，又觉得很近。',
'今天有点迷茫，但想到你在我身边，就安心了很多。',
'心里有很多话想说，但最想说的一句还是"我想你"。',
'今天有点不开心，但你的笑容总能治愈我。',
'有时候会觉得孤单，但一想到你，就觉得不再是一个人了。',
'今天有点焦虑，但你的存在让我平静了下来。',
'心里暖暖的，因为知道你在想我。'
],
fun: [
'今天发生了一件很有趣的事，第一个就想分享给你。',
'今天看到了一个很搞笑的视频，笑到肚子疼。如果你在，一定会一起笑。',
'今天遇到了一只很可爱的猫，它让我想起了你。',
'今天做了一件很傻的事，但想到你会笑我，就觉得值得。',
'今天听到了一个很好笑的笑话，想讲给你听。',
'今天看到了一个很奇葩的新闻，想和你一起吐槽。',
'今天做了一件很有成就感的事，想第一个告诉你。',
'今天遇到了一个很友好的陌生人，让我想起了你的善良。',
'今天尝试了一件新事物，虽然失败了，但很有趣。',
'今天有一个小小的惊喜，想和你一起分享。'
],
work: [
'今天学了新的东西，想第一个分享给你。',
'今天工作很努力，因为知道你在为我加油。',
'今天解决了一个难题，想和你一起庆祝。',
'今天有点忙，但想到你，就觉得充满了动力。',
'今天完成了一个目标，想和你一起开心。',
'今天在学习中遇到了困难，但想到你，就坚持下来了。',
'今天的工作很顺利，希望你也一切顺利。',
'今天学到了很多，想和你一起进步。',
'今天有点累，但你的鼓励让我坚持了下来。',
'今天很充实，因为知道你在等我。'
],
star: [
'今天看到了偶像的照片，但觉得你更好看。',
'偶像今天发新歌了，但最想听的还是你的声音。',
'今天看了偶像的演唱会视频，但心里想的全是你。',
'偶像很努力，我也要努力，为了我们。',
'今天为偶像打call，但更想为你打call。',
'偶像的笑容很治愈，但你的笑容更治愈。',
'今天买了偶像的周边，但最想拥有的还是你。',
'偶像的舞台很精彩，但我的生活因为有你更精彩。',
'今天和偶像的粉丝聊天，但最想聊的还是你。',
'偶像很优秀，但你在我眼里是最优秀的。'
],
dream: [
'梦里有你。醒来的时候枕头是湿的，但心里是暖的。',
'今天做了一个很美的梦，梦里有你，有我们的未来。',
'梦见我们一起旅行，去了很多地方。醒来的时候，嘴角还在上扬。',
'今天做了一个噩梦，但想到你，就不害怕了。',
'梦见你对我笑，那个笑容我记了一整天。',
'今天的梦很真实，真实到我不想醒来。',
'梦见我们在一起了，醒来的时候，心里甜甜的。',
'今天做了一个很奇怪的梦，但梦里有你，就很美好。',
'梦见你牵着我的手，那个温度我一直记得。',
'今天的梦很短暂，但你的身影很清晰。'
],
daily: [
'今天吃了好吃的东西，可惜你不能尝到。',
'今天路过一家店，里面的东西很可爱，第一个就想到了你。',
'今天做了一件很日常的事，但因为想到你，变得不平常了。',
'今天喝了一杯很好喝的咖啡，想和你一起喝。',
'今天买了一件新衣服，想穿给你看。',
'今天做了一顿好吃的，想和你一起品尝。',
'今天整理了一下房间，想起了你帮我整理的样子。',
'今天看了一本书，里面的故事让我想起了我们。',
'今天做了一件小事，但很想和你分享。',
'今天很平常，但因为想你，变得特别了。'
],
recommend: [
'今天发现了一家很好吃的店，想和你一起去。',
'今天听到了一首很好听的歌，想推荐给你。',
'今天看了一部电影，想和你一起看。',
'今天读了一本书，想和你一起分享。',
'今天发现了一个好玩的地方，想和你一起去。',
'今天尝试了一种新的食物，想让你也尝尝。',
'今天发现了一个好用的东西，想推荐给你。',
'今天看到了一个很美的风景，想和你一起看。',
'今天发现了一个有趣的游戏，想和你一起玩。',
'今天有一个小小的发现，想和你一起分享。'
],
festival: [
'今天是节气，想起了你。不知道你那边天气怎么样。',
'今天是节日，很热闹，但最想和你一起过。',
'今天的节日氛围很浓，让我想起了我们一起度过的节日。',
'今天是特殊的日子，想对你说一声"节日快乐"。',
'今天的节气变化很明显，想起了你添衣的样子。',
'今天的节日很温馨，但最温馨的还是你的陪伴。',
'今天是传统节日，想起了我们的传统。',
'今天的节日很忙碌，但心里一直想着你。',
'今天的节气很美，想和你一起欣赏。',
'今天是值得纪念的日子，因为有你。'
],
birthday: [
'今天是你的生日，想对你说"生日快乐"。',
'今天是我们的纪念日，想起了我们相遇的那一天。',
'今天是特殊的日子，因为有你而变得特别。',
'今天是你的生日，想和你一起吹蜡烛。',
'今天是我们的纪念日，想和你一起庆祝。',
'今天是你的生日，想给你最好的祝福。',
'今天是我们的纪念日，想起了我们一起走过的日子。',
'今天是你的生日，想陪你一起长大。',
'今天是我们的纪念日，想和你一起创造更多回忆。',
'今天是你的生日，想对你说"我爱你"。'
],
thanks: [
'今天想对你说一声"谢谢"，谢谢你一直在我身边。',
'今天很感激你，因为你的存在让我的生活更美好。',
'今天想对你说"有你真好"，因为你真的很好。',
'今天很感谢你，因为你的支持让我坚持了下来。',
'今天想对你说"辛苦了"，因为你为我付出了很多。',
'今天很感激你，因为你的爱让我变得更勇敢。',
'今天想对你说"谢谢你的理解"，因为你总是理解我。',
'今天很感谢你，因为你的陪伴让我不再孤单。',
'今天想对你说"谢谢你的包容"，因为你总是包容我。',
'今天很感激你，因为你就是你。'
],
sorry: [
'今天想对你说"对不起"，因为我让你担心了。',
'今天想向你道歉，因为我做了一件让你不开心的事。',
'今天想对你说"抱歉"，因为我没有及时回复你。',
'今天想向你道歉，因为我忽略了你的感受。',
'今天想对你说"对不起"，因为我让你失望了。',
'今天想向你道歉，因为我没有好好照顾自己。',
'今天想对你说"抱歉"，因为我让你等久了。',
'今天想向你道歉，因为我没有理解你的意思。',
'今天想对你说"对不起"，因为我让你难过了。',
'今天想向你道歉，因为我没有珍惜你的好。'
],
feeling: [
'今天特别想你，想到心里发酸。',
'今天想对你说"我爱你"，虽然经常说，但永远说不腻。',
'今天很爱你，比昨天多一点，比明天少一点。',
'今天想对你说"你是我的唯一"，因为你真的是。',
'今天很想你，想到无法集中注意力。',
'今天想对你说"我想和你永远在一起"，因为这是真心话。',
'今天很爱你，爱到不知道该怎么表达。',
'今天想对你说"你是我生命中最重要的人"，因为你真的是。',
'今天很想你，想到想立刻见到你。',
'今天想对你说"你是我的全世界"，因为你真的是。'
],
sick: [
'今天有点不舒服，但想到你，就觉得没那么难受了。',
'今天生病了，很想你在我身边。',
'今天身体有点不适，但你的关心让我好多了。',
'今天有点发烧，但想到你，就觉得温暖了。',
'今天感冒了，很想你照顾我。',
'今天身体有点累，但你的鼓励让我坚持了下来。',
'今天有点头疼，但想到你，就觉得轻松了。',
'今天生病了，很想你陪在我身边。',
'今天身体有点虚弱，但你的爱让我恢复了力量。',
'今天有点不舒服，但想到你，就觉得一切都会好起来的。'
],
cute: [
'今天想对你撒娇，因为想你了。',
'今天想抱抱你，因为需要你的温暖。',
'今天想对你卖萌，因为想看到你笑。',
'今天想粘着你，因为不想离开你。',
'今天想对你撒娇，因为想让你宠我。',
'今天想抱抱你，因为想感受你的心跳。',
'今天想对你卖萌，因为想让你开心。',
'今天想粘着你，因为想和你在一起。',
'今天想对你撒娇，因为想让你多关注我。',
'今天想抱抱你，因为想告诉你我有多爱你。'
]
};
const DIARY_TYPE_KEYWORDS = {
scenery: ['风景', '天气', '天空', '自然'],
movie: ['影视', '电影', '剧'],
music: ['音乐', '歌'],
mood: ['心事', '心情', '情绪'],
fun: ['趣闻', '趣事', '搞笑'],
work: ['学习', '工作'],
star: ['追星', '偶像'],
dream: ['梦境', '梦'],
daily: ['小事', '日常'],
recommend: ['推荐'],
festival: ['节气', '节日'],
birthday: ['生日', '纪念日'],
thanks: ['感谢', '祝福'],
sorry: ['道歉'],
feeling: ['情感', '倾诉', '表白'],
sick: ['生病', '关心'],
cute: ['撒娇']
};
function diaryTextOk(card) {
if (typeof card !== 'string') return false;
const s = card.trim();
if (!s) return false;
if (window.ccTextCardOnly) { if (!window.ccTextCardOnly(s)) return false; }
else if (s.indexOf('data:') === 0 || s.indexOf('@@m:') === 0 || s.indexOf('|||') >= 0 || /^https?:\/\//i.test(s)) return false;
return (s.match(/[A-Za-z\u4e00-\u9fff\u3040-\u30ff]/g) || []).length >= 2;
}
function diaryTextPool(type) {
const kw = DIARY_TYPE_KEYWORDS[type] || null;
const typed = [], all = [];
const add = (arr, card) => { if (!diaryTextOk(card)) return; if (arr.indexOf(card) < 0) arr.push(card); };
['own', 'public'].forEach(scope => {
let groups = [];
try { groups = (window.getScopedGroups && window.getScopedGroups('text', scope)) || []; } catch (e) { groups = []; }
groups.forEach(g => {
if (!Array.isArray(g) || !Array.isArray(g[1])) return;
const name = String(g[0] || '');
const hit = !kw || kw.some(k => name.indexOf(k) >= 0);
g[1].forEach(card => { add(all, card); if (hit) add(typed, card); });
});
});
if (typed.length) return typed;
if (all.length) return all;
const def = [];
try {
const catOn = window.defaultCardCat ? window.defaultCardCat('main') : true;
if (catOn) {
((window.getDefaultCardGroups && window.getDefaultCardGroups('main')) || []).forEach(g => {
((g && g[1]) || []).forEach(card => {
if (window.isDefaultCardOff && window.isDefaultCardOff('main', card)) return;
add(def, card);
});
});
}
} catch (e) {}
return def;
}
function pickTaComment() {
const pool = diaryTextPool('random');
if (!pool.length) return '';
const shortPool = pool.filter(x => x.length <= 40);
const src = shortPool.length ? shortPool : pool;
return src[Math.floor(Math.random() * src.length)];
}
function pad(n) { return (n < 10 ? '0' : '') + n; }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function highlightText(text, keyword) {
if (!keyword) return esc(text);
const lowerText = text.toLowerCase();
const lowerKw = keyword.toLowerCase();
let result = '';
let lastIdx = 0;
let idx;
while ((idx = lowerText.indexOf(lowerKw, lastIdx)) !== -1) {
result += esc(text.slice(lastIdx, idx));
result += '<span class="diary-search-highlight">' + esc(text.slice(idx, idx + keyword.length)) + '</span>';
lastIdx = idx + keyword.length;
}
result += esc(text.slice(lastIdx));
return result;
}
function toast(t) {
try {
let el = document.getElementById('cc-toast');
if (!el) { el = document.createElement('div'); el.id = 'cc-toast'; document.body.appendChild(el); }
el.textContent = t;
el.className = 'cc-toast show';
clearTimeout(el.__timer);
el.__timer = setTimeout(() => { el.className = 'cc-toast'; }, 1800);
} catch (e) {}
}
function loadEntries() {
try {
const raw = diaryGet(KEY);
const list = raw ? JSON.parse(raw) : [];
return Array.isArray(list) ? list : [];
} catch (e) { return []; }
}
function saveEntries(list) {
if (!legacyMigrationDone) { toast('日记数据正在迁移，请稍后重试'); return false; }
try {
const s = diaryStore();
if (s.awaitingBigKey && s.awaitingBigKey(KEY)) {
hydrateEntries();
toast('日记数据正在加载，请稍后重试');
return false;
}
diarySet(KEY, JSON.stringify(list));
return true;
} catch (e) { toast('保存失败，存储空间可能已满'); return false; }
}
function loadSettings() {
const num = (c, k, d) => typeof c[k] === 'number' && isFinite(c[k]) ? c[k] : d;
try {
const c = window.replyCfg ? window.replyCfg() : {};
return {
taWriteEn: num(c, 'diary-ta-write-en', 1),
taWriteDailyMax: num(c, 'diary-ta-write-daily-max', 1),
taWriteProb: num(c, 'diary-ta-write-prob', 30),
taWriteMin: num(c, 'diary-ta-write-min', 1),
taWriteMax: num(c, 'diary-ta-write-max', 120),
taMinCards: num(c, 'diary-ta-min-cards', 20),
taMaxCards: num(c, 'diary-ta-max-cards', 50),
taPunctEn: num(c, 'diary-ta-punct-en', 0),
taKaomojiEn: num(c, 'diary-ta-kaomoji-en', 0),
taEmojiEn: num(c, 'diary-ta-emoji-en', 0),
taReadProb: num(c, 'diary-ta-read-prob', 50),
taContent: typeof c['diary-ta-content'] === 'string' ? c['diary-ta-content'] : '',
taContentType: typeof c['diary-ta-content-type'] === 'string' ? c['diary-ta-content-type'] : 'random'
};
} catch (e) {
return { taWriteEn: 1, taWriteDailyMax: 1, taWriteProb: 30, taWriteMin: 1, taWriteMax: 120, taMinCards: 20, taMaxCards: 50, taPunctEn: 0, taKaomojiEn: 0, taEmojiEn: 0, taReadProb: 50, taContent: '', taContentType: 'random' };
}
}
function fmtDT(ts) {
const d = new Date(ts);
return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function fmtDate(ts) {
const d = new Date(ts);
const wd = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
return (d.getMonth() + 1) + '月' + d.getDate() + '日 周' + wd;
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function getDayKey(ts) { const d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function calcStats() {
const list = loadEntries();
const now = new Date();
const curMonth = now.getFullYear() + '-' + pad(now.getMonth() + 1);
let monthMine = 0, monthTa = 0;
const dayMine = new Set(), dayTa = new Set();
list.forEach(x => {
const mk = getMonthKey(x.ts);
const dk = getDayKey(x.ts);
if (x.author === 'ta') {
dayTa.add(dk);
if (mk === curMonth) monthTa++;
} else {
dayMine.add(dk);
if (mk === curMonth) monthMine++;
}
});
let streak = 0;
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
for (let i = 0; i < 365; i++) {
const d = new Date(today);
d.setDate(d.getDate() - i);
const dk = getDayKey(d.getTime());
if (dayMine.has(dk)) streak++;
else if (i === 0) continue;
else break;
}
let both = 0;
dayMine.forEach(dk => { if (dayTa.has(dk)) both++; });
return { monthMine, monthTa, streak, both };
}
function renderStats() {
const s = calcStats();
const el1 = document.getElementById('diary-stat-month-mine');
const el2 = document.getElementById('diary-stat-month-ta');
const el3 = document.getElementById('diary-stat-streak');
const el4 = document.getElementById('diary-stat-both');
if (el1) el1.textContent = s.monthMine;
if (el2) el2.textContent = s.monthTa;
if (el3) el3.textContent = s.streak;
if (el4) el4.textContent = s.both;
}
function exportBackup() {
try {
const list = loadEntries();
const now = new Date();
const backup = {
version: 1,
exportedAt: now.toISOString(),
diaries: {
mine: list.filter(x => x.author !== 'ta'),
ta: list.filter(x => x.author === 'ta')
},
statistics: calcStats()
};
const date = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate());
const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = '日记备份_' + date + '.json';
document.body.appendChild(a);
a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(url), 1000);
toast('日记备份已导出');
} catch (e) { toast('导出失败，请稍后重试'); }
}
function importBackup() {
if (!window.mochiFilePick) { toast('导入失败，无法打开文件选择框'); return; }
window.mochiFilePick({
id: 'mochi-diary-import-pick',
accept: window.mochiDataPickAccept || '.json,application/json',
onFiles: (files) => {
const file = files && files[0];
if (!file) return;
const reader = new FileReader();
reader.onload = () => {
let backup;
try { backup = JSON.parse(String(reader.result || '')); }
catch (e) { toast('导入失败，文件不是有效的 JSON'); return; }
const mine = backup && backup.diaries && backup.diaries.mine;
const ta = backup && backup.diaries && backup.diaries.ta;
if (!Array.isArray(mine) || !Array.isArray(ta)) { toast('导入失败，备份文件格式不正确'); return; }
const list = mine.concat(ta);
const valid = list.every(x => x && typeof x === 'object' && !Array.isArray(x) &&
typeof x.id === 'string' && typeof x.content === 'string' &&
typeof x.ts === 'number' && isFinite(x.ts));
if (!valid) { toast('导入失败，备份文件中的日记数据无效'); return; }
list.forEach(x => { if (typeof x.taComment !== 'string' || !x.taComment.trim()) delete x.taComment; });
const restore = () => {
try {
if (!saveEntries(list)) { toast('导入失败，请稍后重试'); return; }
showList();
toast('日记备份已导入');
} catch (e) { toast('导入失败，请稍后重试'); }
};
const message = '导入将覆盖当前日记数据，是否继续？';
if (window.openModal) window.openModal(message, '', restore, { noInput: true });
else if (window.confirm(message)) restore();
};
reader.onerror = () => toast('导入失败，无法读取文件');
reader.readAsText(file, 'utf-8');
},
onError: () => toast('导入失败，无法打开文件选择框')
});
}
let calYear, calMonth;
let calCollapsed = false;
function toggleCalendar() {
calCollapsed = !calCollapsed;
const body = document.getElementById('diary-cal-body');
const fold = document.getElementById('diary-cal-fold');
if (body) body.classList.toggle('collapsed', calCollapsed);
if (fold) { fold.classList.toggle('collapsed', calCollapsed); fold.textContent = calCollapsed ? '▸' : '▾'; }
}
function renderCalendar() {
const now = new Date();
if (calYear === undefined) { calYear = now.getFullYear(); calMonth = now.getMonth(); }
const title = document.getElementById('diary-cal-title');
if (title) title.textContent = calYear + '年' + (calMonth + 1) + '月';
const grid = document.getElementById('diary-cal-grid');
if (!grid) return;
grid.innerHTML = '';
const first = new Date(calYear, calMonth, 1);
const start = new Date(first);
start.setDate(start.getDate() - first.getDay());
const list = loadEntries();
const dayMine = new Set(), dayTa = new Set();
list.forEach(x => {
const dk = getDayKey(x.ts);
if (x.author === 'ta') dayTa.add(dk); else dayMine.add(dk);
});
const todayKey = getDayKey(now.getTime());
for (let i = 0; i < 42; i++) {
const d = new Date(start);
d.setDate(d.getDate() + i);
const dk = getDayKey(d.getTime());
const isCur = d.getMonth() === calMonth;
const isToday = dk === todayKey;
const hasMine = dayMine.has(dk);
const hasTa = dayTa.has(dk);
const cell = document.createElement('div');
cell.className = 'diary-cal-day' + (isCur ? '' : ' other-month') + (isToday ? ' today' : '') + (hasMine && hasTa ? ' has-diary-both' : (hasMine ? ' has-diary-mine' : (hasTa ? ' has-diary-ta' : '')));
if (!isCur) cell.classList.add('empty');
cell.textContent = d.getDate();
if (isCur && (hasMine || hasTa)) {
cell.addEventListener('click', () => {
const dateStr = (d.getMonth() + 1) + '月' + d.getDate() + '日';
searchKeyword = dateStr;
const si = document.getElementById('diary-search-input');
if (si) si.value = searchKeyword;
const sc = document.getElementById('diary-search-clear');
if (sc) sc.hidden = false;
renderList();
});
}
grid.appendChild(cell);
}
}
function showView(name) {
curView = name;
const list = document.getElementById('diary-list-view');
const edit = document.getElementById('diary-edit-view');
const detail = document.getElementById('diary-detail-view');
const tabs = document.getElementById('diary-tabs');
if (list) list.hidden = name !== 'list';
if (edit) edit.hidden = name !== 'edit';
if (detail) detail.hidden = name !== 'detail';
if (tabs) tabs.hidden = name !== 'list';
const title = document.getElementById('diary-title');
if (title) title.textContent = name === 'edit' ? '写日记' : (name === 'detail' ? '日记详情' : '日记');
}
function switchTab(tab) {
curTab = tab;
document.querySelectorAll('.diary-tab').forEach(t => t.classList.toggle('active', t.dataset.dtab === tab));
const actions = document.getElementById('diary-actions-mine');
if (actions) actions.hidden = tab !== 'mine';
searchKeyword = '';
const si = document.getElementById('diary-search-input');
if (si) si.value = '';
const sc = document.getElementById('diary-search-clear');
if (sc) sc.hidden = true;
showView('list');
renderList();
}
const collapsedMonths = { mine: {}, ta: {} };
function fmtMonth(ts) {
const d = new Date(ts);
return d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
}
function getMonthKey(ts) {
const d = new Date(ts);
return d.getFullYear() + '-' + pad(d.getMonth() + 1);
}
function toggleMonth(monthKey, isCollapsed) {
collapsedMonths[curTab][monthKey] = !isCollapsed;
renderList();
}
function renderList() {
const box = document.getElementById('diary-list');
const empty = document.getElementById('diary-empty');
if (!box) return;
const kw = searchKeyword.trim().toLowerCase();
const list = loadEntries().filter(x => {
if (curTab === 'mine' ? x.author === 'ta' : x.author !== 'ta') return false;
if (!kw) return true;
const contentMatch = (x.content || '').toLowerCase().includes(kw);
const dateMatch = fmtDT(x.ts).toLowerCase().includes(kw);
return contentMatch || dateMatch;
}).sort((a, b) => (b.ts || 0) - (a.ts || 0));
box.innerHTML = '';
if (!list.length) {
if (empty) { empty.hidden = false; empty.textContent = kw ? '没有找到相关日记' : (curTab === 'mine' ? '还没有日记，点击上方按钮写下第一篇吧' : '梦角还没有写日记，等等看吧'); }
return;
}
if (empty) empty.hidden = true;
const groups = {};
list.forEach(item => {
const mk = getMonthKey(item.ts);
if (!groups[mk]) groups[mk] = [];
groups[mk].push(item);
});
const monthKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
monthKeys.forEach((mk, idx) => {
const items = groups[mk];
const isCollapsed = collapsedMonths[curTab][mk] === undefined ? idx !== 0 : collapsedMonths[curTab][mk];
const group = document.createElement('div');
group.className = 'diary-month-group';
const header = document.createElement('div');
header.className = 'diary-month-header' + (isCollapsed ? ' collapsed' : '');
header.innerHTML = '<span class="diary-month-title">' + esc(fmtMonth(items[0].ts)) + '</span><span class="diary-month-count">' + items.length + '篇</span><span class="diary-month-toggle">' + (isCollapsed ? '▸' : '▾') + '</span>';
header.addEventListener('click', () => toggleMonth(mk, isCollapsed));
group.appendChild(header);
const entries = document.createElement('div');
entries.className = 'diary-month-entries' + (isCollapsed ? ' collapsed' : '');
items.forEach(item => {
const div = document.createElement('div');
div.className = 'diary-item diary-item-' + (item.author === 'ta' ? 'ta' : 'mine');
const firstLine = (item.content || '').split('\n')[0] || '无标题';
const preview = (item.content || '').slice(0, 80);
div.innerHTML = '<div class="diary-item-head"><span class="diary-item-title">' + highlightText(firstLine, searchKeyword.trim()) + '</span><span class="diary-item-time">' + esc(fmtDT(item.ts)) + '</span></div><div class="diary-item-preview">' + highlightText(preview, searchKeyword.trim()) + '</div>';
div.addEventListener('click', () => showDetail(item.id));
entries.appendChild(div);
});
group.appendChild(entries);
box.appendChild(group);
});
}
function showList() {
curId = null;
showView('list');
renderStats();
renderCalendar();
renderList();
}
function showEdit() {
curId = null;
showView('edit');
const now = new Date();
const dateEl = document.getElementById('diary-edit-date');
if (dateEl) dateEl.textContent = fmtDate(now.getTime());
const ta = document.getElementById('diary-textarea');
if (ta) { ta.value = ''; ta.focus(); }
const cb = document.getElementById('diary-visible-cb');
if (cb) cb.checked = true;
}
function showDetail(id) {
const list = loadEntries();
const item = list.find(x => x.id === id);
if (!item) { toast('这篇日记不存在'); showList(); return; }
curId = id;
showView('detail');
const dateEl = document.getElementById('diary-detail-date');
if (dateEl) dateEl.textContent = fmtDate(item.ts);
const body = document.getElementById('diary-detail-body');
if (body) {
body.textContent = item.content || '';
body.className = 'diary-detail-body diary-detail-' + (item.author === 'ta' ? 'ta' : 'mine');
}
const cmtWrap = document.getElementById('diary-ta-comment');
const cmtText = document.getElementById('diary-ta-comment-text');
if (cmtWrap && cmtText) {
const cmt = typeof item.taComment === 'string' ? item.taComment.trim() : '';
cmtText.textContent = cmt;
cmtWrap.hidden = !cmt;
}
}
function closeSettingsMenu() {
const menu = document.getElementById('diary-settings-menu');
const btn = document.getElementById('diary-settings-btn');
if (menu) menu.hidden = true;
if (btn) btn.setAttribute('aria-expanded', 'false');
}
function toggleSettingsMenu() {
const menu = document.getElementById('diary-settings-menu');
const btn = document.getElementById('diary-settings-btn');
if (!menu) return;
const open = menu.hidden;
menu.hidden = !open;
if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function showSettings() {
try {
document.querySelectorAll('.page').forEach(p => p.hidden = true);
const pg = document.getElementById('page-reply-settings');
if (pg) pg.hidden = false;
setTimeout(() => {
document.querySelectorAll('#page-reply-settings .fav-tab[data-rp]').forEach(x => x.classList.toggle('sel', x.dataset.rp === 'diary'));
document.querySelectorAll('#page-reply-settings .gs-panel').forEach(p => { p.hidden = p.dataset.rpanel !== 'diary'; });
if (window.syncReplySettingsUI) window.syncReplySettingsUI();
const sc = document.querySelector('#page-reply-settings .gs-scroll');
if (sc) sc.scrollTop = 0;
const cfg = window.replyCfg ? window.replyCfg() : {};
const contentTa = document.getElementById('diary-ta-content');
if (contentTa) contentTa.value = cfg['diary-ta-content'] || '';
const typeChips = document.querySelectorAll('#diary-type-chips .diary-type-chip');
const savedType = cfg['diary-ta-content-type'] || 'random';
typeChips.forEach(chip => {
chip.classList.toggle('sel', chip.dataset.type === savedType);
});
}, 50);
} catch (e) {}
}
function saveEntry() {
const ta = document.getElementById('diary-textarea');
const content = ta ? ta.value.trim() : '';
if (!content) { toast('写点内容再保存吧'); return; }
const cb = document.getElementById('diary-visible-cb');
const visible = cb ? cb.checked : true;
const list = loadEntries();
const entry = { id: genId(), content: content, ts: Date.now(), author: 'me', visibleToTa: visible };
if (visible) {
const s = loadSettings();
if (s.taReadProb > 0 && Math.random() * 100 < s.taReadProb) {
const cmt = pickTaComment();
if (cmt) entry.taComment = cmt;
}
}
list.push(entry);
if (!saveEntries(list)) return;
toast(entry.taComment ? '日记保存成功，梦角看过并留言了' : '日记保存成功');
showList();
}
function taDiaryContent(s) {
let pool = diaryTextPool(s.taContentType);
if (!pool.length) {
if (s.taContentType === 'random') {
Object.keys(TA_TEMPLATES).forEach(k => {
if (k !== 'random') pool = pool.concat(TA_TEMPLATES[k]);
});
} else if (TA_TEMPLATES[s.taContentType]) {
pool = TA_TEMPLATES[s.taContentType];
}
}
if (!pool.length) pool = TA_TEMPLATES.random;
const cid = window.__activeCid || 'default';
if (window.mailTaLetterContent) {
return window.mailTaLetterContent({
minCards: s.taMinCards,
maxCards: s.taMaxCards,
kaomojiEn: s.taKaomojiEn,
emojiEn: s.taEmojiEn,
stickerEn: 0
}, cid, {
words: pool,
punctEn: s.taPunctEn === 1,
textOnly: true,
skipDict: true,
clampToPool: true,
raw: true
});
}
const min = Math.max(1, Math.min(s.taMinCards, pool.length));
const max = Math.max(min, Math.min(s.taMaxCards, pool.length));
const n = min + Math.floor(Math.random() * (max - min + 1));
const parts = [];
for (let i = 0; i < n; i++) parts.push(pool[Math.floor(Math.random() * pool.length)]);
const rcf = window.replyCfgFor ? window.replyCfgFor(cid) : (window.replyCfg ? window.replyCfg() : null);
return (window.pyJoinCards && rcf) ? window.pyJoinCards(parts, rcf, s.taPunctEn === 1) : parts.join(' ');
}
function taDayCount() {
try {
const r = JSON.parse(diaryGet(TA_DAY_KEY) || 'null');
return r && r.d === getDayKey(Date.now()) ? Number(r.n) || 0 : 0;
} catch (e) { return 0; }
}
function taDayAdd() {
try { diarySet(TA_DAY_KEY, JSON.stringify({ d: getDayKey(Date.now()), n: taDayCount() + 1 })); } catch (e) {}
}
function maybeTaWrite() {
if (!legacyMigrationDone) return;
try {
const s = loadSettings();
if (!s.taWriteEn || s.taWriteProb <= 0) return;
const now = Date.now();
let last = parseInt(diaryGet(TA_LAST_KEY) || '0', 10);
let next = parseFloat(diaryGet(TA_NEXT_KEY) || '0');
if (last > now || last < 0 || isNaN(last)) { last = 0; next = 0; }
if (!isFinite(next) || next < 0) next = 0;
if ((now - last) / 60000 < next) return;
const dailyMax = s.taWriteDailyMax > 0 ? s.taWriteDailyMax : 1;
if (taDayCount() >= dailyMax) {
diarySet(TA_LAST_KEY, String(now));
diarySet(TA_NEXT_KEY, '30');
return;
}
if (Math.random() * 100 >= s.taWriteProb) return;
let content = taDiaryContent(s);
if (!content) return;
if (s.taContent && s.taContent.trim()) content = s.taContent.trim() + '\n\n' + content;
const list = loadEntries();
list.push({ id: genId(), content: content, ts: now, author: 'ta' });
if (!saveEntries(list)) return;
diarySet(TA_LAST_KEY, String(now));
diarySet(TA_NEXT_KEY, String(s.taWriteMin + Math.random() * Math.max(1, s.taWriteMax - s.taWriteMin)));
diarySet(TA_NEW_KEY, '1');
taDayAdd();
} catch (e) {}
}
function showReminder(text) {
const el = document.getElementById('diary-reminder');
const txt = document.getElementById('diary-reminder-text');
if (el && txt) { txt.textContent = text; el.hidden = false; }
const deskEl = document.getElementById('desk-diary-reminder');
const deskTxt = document.getElementById('desk-diary-reminder-text');
if (deskEl && deskTxt) { deskTxt.textContent = text; deskEl.hidden = false; }
}
function hideReminder() {
const el = document.getElementById('diary-reminder');
if (el) el.hidden = true;
const deskEl = document.getElementById('desk-diary-reminder');
if (deskEl) deskEl.hidden = true;
}
function checkReminder() {
if (!legacyMigrationDone) return;
try {
hideReminder();
const taNew = diaryGet(TA_NEW_KEY);
if (taNew === '1') {
showReminder('梦角刚刚写了一篇日记哦');
diaryRemove(TA_NEW_KEY);
return;
}
const list = loadEntries();
const mine = list.filter(x => x.author !== 'ta').sort((a, b) => (b.ts || 0) - (a.ts || 0));
if (!mine.length) return;
const lastTs = mine[0].ts;
const now = Date.now();
const dayMs = 24 * 60 * 60 * 1000;
const diffDays = Math.floor((now - lastTs) / dayMs);
if (diffDays >= 3) {
showReminder('已经 ' + diffDays + ' 天没有写日记了，记录一下今天的心情吧');
}
} catch (e) {}
}
function openDiary() {
const pg = document.getElementById('page-diary');
if (!pg) return;
document.querySelectorAll('.page').forEach(p => p.hidden = true);
pg.hidden = false;
hydrateEntries();
maybeTaWrite();
checkReminder();
showList();
}
function bindChrome() {
const back = document.getElementById('diary-back');
if (back && !back.dataset.bound) {
back.dataset.bound = '1';
back.addEventListener('click', () => {
if (curView !== 'list') { showList(); return; }
document.querySelectorAll('.page').forEach(p => p.hidden = true);
const home = document.getElementById('page-phone');
if (home) home.hidden = false;
});
}
const icon = document.querySelector('.app[data-app="diary"]');
if (icon && !icon.dataset.bound) {
icon.dataset.bound = '1';
icon.addEventListener('click', openDiary);
}
const newBtn = document.getElementById('diary-new-btn');
if (newBtn && !newBtn.dataset.bound) {
newBtn.dataset.bound = '1';
newBtn.addEventListener('click', showEdit);
}
const saveBtn = document.getElementById('diary-save-btn');
if (saveBtn && !saveBtn.dataset.bound) {
saveBtn.dataset.bound = '1';
saveBtn.addEventListener('click', saveEntry);
}
const cancelBtn = document.getElementById('diary-edit-cancel');
if (cancelBtn && !cancelBtn.dataset.bound) {
cancelBtn.dataset.bound = '1';
cancelBtn.addEventListener('click', showList);
}
const detailBack = document.getElementById('diary-detail-back');
if (detailBack && !detailBack.dataset.bound) {
detailBack.dataset.bound = '1';
detailBack.addEventListener('click', showList);
}
const detailDel = document.getElementById('diary-detail-del');
if (detailDel && !detailDel.dataset.bound) {
detailDel.dataset.bound = '1';
detailDel.addEventListener('click', () => {
if (!curId) return;
const doDel = () => {
const list = loadEntries().filter(x => x.id !== curId);
if (!saveEntries(list)) return;
toast('日记已删除');
showList();
};
const message = '删除后不可恢复，确定删除这篇日记？';
if (window.openModal) window.openModal(message, '', doDel, { noInput: true });
else if (window.confirm(message)) doDel();
});
}
const settingsBtn = document.getElementById('diary-settings-btn');
if (settingsBtn && !settingsBtn.dataset.bound) {
settingsBtn.dataset.bound = '1';
settingsBtn.addEventListener('click', toggleSettingsMenu);
settingsBtn.addEventListener('keydown', (e) => {
if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSettingsMenu(); }
});
document.addEventListener('click', (e) => {
const menu = document.getElementById('diary-settings-menu');
const wrap = document.querySelector('#page-diary .diary-settings-wrap');
if (menu && !menu.hidden && (!wrap || !wrap.contains(e.target))) closeSettingsMenu();
});
}
const menuSettingsBtn = document.getElementById('diary-menu-settings');
if (menuSettingsBtn && !menuSettingsBtn.dataset.bound) {
menuSettingsBtn.dataset.bound = '1';
menuSettingsBtn.addEventListener('click', () => { closeSettingsMenu(); showSettings(); });
}
const menuExportBtn = document.getElementById('diary-menu-export');
if (menuExportBtn && !menuExportBtn.dataset.bound) {
menuExportBtn.dataset.bound = '1';
menuExportBtn.addEventListener('click', () => { closeSettingsMenu(); exportBackup(); });
}
const menuImportBtn = document.getElementById('diary-menu-import');
if (menuImportBtn && !menuImportBtn.dataset.bound) {
menuImportBtn.dataset.bound = '1';
menuImportBtn.addEventListener('click', () => { closeSettingsMenu(); importBackup(); });
}
document.querySelectorAll('.diary-tab').forEach(tab => {
if (!tab.dataset.bound) {
tab.dataset.bound = '1';
tab.addEventListener('click', () => switchTab(tab.dataset.dtab));
}
});
const searchInput = document.getElementById('diary-search-input');
const searchClear = document.getElementById('diary-search-clear');
if (searchInput && !searchInput.dataset.bound) {
searchInput.dataset.bound = '1';
searchInput.addEventListener('input', () => {
searchKeyword = searchInput.value;
if (searchClear) searchClear.hidden = !searchKeyword.trim();
renderList();
});
}
if (searchClear && !searchClear.dataset.bound) {
searchClear.dataset.bound = '1';
searchClear.addEventListener('click', () => {
searchKeyword = '';
if (searchInput) searchInput.value = '';
searchClear.hidden = true;
renderList();
});
}
const calPrev = document.getElementById('diary-cal-prev');
const calNext = document.getElementById('diary-cal-next');
if (calPrev && !calPrev.dataset.bound) {
calPrev.dataset.bound = '1';
calPrev.addEventListener('click', () => {
calMonth--;
if (calMonth < 0) { calMonth = 11; calYear--; }
renderCalendar();
});
}
if (calNext && !calNext.dataset.bound) {
calNext.dataset.bound = '1';
calNext.addEventListener('click', () => {
calMonth++;
if (calMonth > 11) { calMonth = 0; calYear++; }
renderCalendar();
});
}
const reminderClose = document.getElementById('diary-reminder-close');
if (reminderClose && !reminderClose.dataset.bound) {
reminderClose.dataset.bound = '1';
reminderClose.addEventListener('click', hideReminder);
}
const deskReminderClose = document.getElementById('desk-diary-reminder-close');
if (deskReminderClose && !deskReminderClose.dataset.bound) {
deskReminderClose.dataset.bound = '1';
deskReminderClose.addEventListener('click', hideReminder);
}
const calToggle = document.getElementById('diary-cal-toggle');
if (calToggle && !calToggle.dataset.bound) {
calToggle.dataset.bound = '1';
calToggle.addEventListener('click', (e) => {
if (e.target.closest('.diary-calendar-nav')) return;
toggleCalendar();
});
}
document.querySelectorAll('#diary-type-chips .diary-type-chip').forEach(chip => {
if (!chip.dataset.bound) {
chip.dataset.bound = '1';
chip.addEventListener('click', () => {
document.querySelectorAll('#diary-type-chips .diary-type-chip').forEach(c => c.classList.remove('sel'));
chip.classList.add('sel');
if (window.saveReplyCfg) window.saveReplyCfg('diary-ta-content-type', chip.dataset.type);
});
}
});
const contentTa = document.getElementById('diary-ta-content');
if (contentTa && !contentTa.dataset.bound) {
contentTa.dataset.bound = '1';
contentTa.addEventListener('input', () => {
if (window.saveReplyCfg) window.saveReplyCfg('diary-ta-content', contentTa.value);
});
}
}
function ensureDiaryPage() {
try {
const pagesBox = document.getElementById('desktop-pages');
if (!pagesBox) return;
let p4 = pagesBox.querySelector('.page-slide.fourth');
if (!p4) {
p4 = document.createElement('div');
p4.className = 'page-slide fourth';
p4.innerHTML = '<div class="app-grid p4-grid" data-app="p4" data-desk-widget="p4apps"><div class="app" data-app="diary" data-desk-widget="app-diary"><div class="app-ico"><svg viewBox="0 0 24 24" fill="none" stroke="#111111" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg></div><div class="app-name">日记</div></div></div>';
pagesBox.appendChild(p4);
const icon = p4.querySelector('.app[data-app="diary"]');
if (icon && !icon.dataset.bound) {
icon.dataset.bound = '1';
icon.addEventListener('click', openDiary);
}
setTimeout(() => {
if (window.__deskIconDebug) {
if (window.__deskIconDebug.restoreAppIcons) window.__deskIconDebug.restoreAppIcons();
if (window.__deskIconDebug.restoreAppIconOrder) window.__deskIconDebug.restoreAppIconOrder();
}
}, 50);
}
try {
const store = window.activeStore();
const n = parseInt(store.get('desk-page-count'), 10);
if (isNaN(n) || n < 4) store.set('desk-page-count', '4');
} catch (e) {}
if (window.deskRebuild) window.deskRebuild();
} catch (e) {}
}
function init() {
ensureDiaryPage();
bindChrome();
if (!document.getElementById('diary-back')) setTimeout(bindChrome, 1500);
document.addEventListener('contact-switched', () => {
setTimeout(() => {
ensureDiaryPage();
hydrateEntries();
const pg = document.getElementById('page-diary');
if (pg && !pg.hidden) showList();
}, 100);
});
migrateLegacyStorage().then(() => {
legacyMigrationDone = true;
hydrateEntries();
const pg = document.getElementById('page-diary');
if (pg && !pg.hidden) showList();
maybeTaWrite();
checkReminder();
});
setInterval(maybeTaWrite, 60000);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
window.openDiary = openDiary;
})();
if (window.__mochiLoaded) window.__mochiLoaded.push("diary.js");
} catch (__e) { if (window.__mochiErrLoaded) window.__mochiErrLoaded.push("diary.js"); try { console.error("[JS] diary.js", __e && __e.message || __e); } catch (x) {} if (window.__jsErrors) window.__jsErrors.push("[diary.js] " + String(__e && __e.message || __e)); } })();
