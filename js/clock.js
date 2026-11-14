(function () { try {
(function () {
const el = document.getElementById('clock');
if (!el) return;
const pad = (n) => (n < 10 ? '0' + n : '' + n);
function update() {
const d = new Date();
el.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
}
update();
setInterval(update, 15000); // 每 15 秒校准一次
})();
(function () {
const OFFICIAL_NOTICE = 'https://yanxu233.github.io/jinzhierchuan/notice.json'; // 2026-10-30 作者换仓库：旧 ling233330-star.github.io/mochi 已失效
const MARK_KEY = '小红书@言序（1842523578）';
const POLICY_ANCHOR = '禁止二传链接';
const BARS = [
{ tag: '1', title: '免费 · 署名 · 防倒卖', keys: ['alert', 'alert2'],
marks: ['免费', '诈骗', '署名', '倒卖', MARK_KEY] }
];
const texts = {}; // notice 字段 -> 当前权威文案（先本地兜底，官方拉取后覆盖）
texts['alert'] = '本站完全免费，没有收过任何人一分钱，个人出资和花费时间搭建的。开源可学、私人二改随意，但禁止以盈利为目的。Mochi字卡网站完全免费。作者只有两个账号：小红书@言序（1842523578）和抖音@言序（58334080131）。作者以前不常看抖音（最近看了才发现 mochi 的二传范围和影响远比想象中大，之前低估了），是看到有人想花钱求网站才开的号，主要用于发布本站链接。本站不收取任何费用，如有出现任何收费情况，均为诈骗，注意防止被骗。2026.10.30 起本站禁止二传链接：本站链接与代码库链接都算，任何形式的传播都算二传，链接只能自己留着、自己用，需要链接请到作者主页简介里拿：抖音 @言序（58334080131）、小红书 @言序（1842523578）。';
texts['alert2'] = '2026.10.30 起，本站禁止二传链接：任何形式的传播都算二传，包括把链接分享到抖音、小红书等公开平台、转发到群聊或给第三人。链接请自己留着、自己用；从作者本人主页拿链接、自己收藏，都不违反这一条。需要链接请到作者主页简介里拿：抖音 @言序（58334080131）、小红书 @言序（1842523578）。截图、分享网站里的聊天记录是正常使用，随意；把字卡内容整理打包发到别处仍须标注作者署名（小红书 @言序 1842523578）。禁止删除或修改署名。严禁冒为自己制作、删除篡改署名，或以任何形式收费倒卖本站链接、安装包——本站完全免费，收费即诈骗。如果你是花钱买来的链接：你被骗了，请拒付退款并举报卖家。为什么这么改：链接被大范围公开二传、很多二传连作者署名都不标；还有人明知违规仍继续，甚至拿本站去引流。二传的人太多，大量圈外人误入、站点被迫扩圈——作者最近看了抖音，才发现影响远比想象中大。所以链接只能自己留着用，需要链接请到作者主页简介里拿：抖音 @言序（58334080131）、小红书 @言序（1842523578）。';
function barText(bar) { return bar.keys.map(function (k) { return texts[k] || ''; }).filter(Boolean).join(' '); }
function marked(box, bar) {
const t = (box.textContent || '').replace(/\s+/g, '');
const title = bar.title.replace(/\s+/g, '');
return t.indexOf(title) > -1 && bar.marks.every(function (m) { return t.indexOf(m) > -1; });
}
function splashHost() {
return document.getElementById('splash-mustread') || document.getElementById('splash-notice');
}
function splashScope() {
return document.getElementById('splash-box') || document;
}
function ensureBar(bar, refNode) {
const host = splashHost();
if (!host) return null;
const scope = splashScope();
let box = scope.querySelector('.splash-alert[data-anti-scam="' + bar.tag + '"]');
if (!box) {
const heads = scope.querySelectorAll('.splash-alert .splash-alert-t');
for (let i = 0; i < heads.length; i++) {
if (heads[i].textContent.trim() === bar.title) { box = heads[i].parentNode; break; }
}
}
if (!box) {
box = document.createElement('div');
box.className = 'splash-alert';
host.insertBefore(box, refNode || host.firstChild);
}
box.setAttribute('data-anti-scam', bar.tag);
if (!marked(box, bar)) { // 缺失或被改 → 重建/改写回官方文案
box.innerHTML = '<div class="splash-alert-t"></div><p></p>';
box.querySelector('.splash-alert-t').textContent = bar.title;
box.querySelector('p').textContent = barText(bar);
}
return box;
}
function ensureSettings() {
const page = document.getElementById('page-setting');
if (!page) return;
let box = page.querySelector('.set-alert');
const st = box ? (box.textContent || '') : '';
if (box && MARK_KEY && st.indexOf(MARK_KEY) > -1 && st.indexOf('免费') > -1 && st.indexOf('倒卖') > -1) return;
if (!box) {
box = document.createElement('div');
const anchor = page.querySelector('.ver-credit') || null;
page.insertBefore(box, anchor ? anchor.nextSibling : null);
}
box.className = 'set-alert';
box.setAttribute('data-anti-scam', 's');
box.innerHTML = '<b></b>';
box.querySelector('b').textContent = texts['alert'];
box.appendChild(document.createTextNode(' ' + texts['alert2']));
}
let bulletin = null;
function ensureBulletin() {
const host = splashHost(); // #976：与置顶声明卡同一宿主（必读卡组，回退公告卡）
if (!host) return;
const scope = splashScope();
let box = scope.querySelector('.splash-alert[data-anti-scam="3"]');
const active = !!(bulletin && typeof bulletin.text === 'string' && bulletin.text.trim()
&& (!bulletin.until || Date.now() < bulletin.until));
if (!active) { if (box) box.remove(); return; }
const want = bulletin.text.trim();
if (!box) {
box = document.createElement('div');
box.className = 'splash-alert';
const b1 = scope.querySelector('.splash-alert[data-anti-scam="1"]');
host.insertBefore(box, b1 ? b1.nextSibling : host.firstChild);
}
box.setAttribute('data-anti-scam', '3');
if (box.textContent !== '公告' + want) { // 内容变化 → 重写（标题固定「公告」）
box.innerHTML = '<div class="splash-alert-t"></div><p></p>';
box.querySelector('.splash-alert-t').textContent = '公告';
box.querySelector('p').textContent = want;
}
}
function run() {
ensureBar(BARS[0], null);
ensureSettings();
ensureBulletin();
setupCardLockCard();
}
function cardLockStateKnown() {
try { return typeof window.cardLockOpen === 'function' ? !!window.cardLockOpen() : false; } catch (e) { return false; }
}
function cardLockTap(el, fn) {
if (window.mochiTapOn && window.mochiTapOn(el, fn)) return;
el.addEventListener('click', fn);
}
let cardLockFixTimer = null;
document.addEventListener('click', function (e) {
try {
const t = e.target;
if (!t || !t.closest) return;
const btn = t.closest('.cardlock-btn');
if (!btn || !btn.closest('#splash-cardlock-actions')) return;
const mk = document.getElementById('modal-mask');
if (mk && !mk.hidden) return;   // 已有弹窗在前：不叠加
if (String(btn.textContent || '').indexOf('输入密码解锁') === 0) promptCardUnlock();
} catch (err) {}
}, true);
let cardLockMissMsg = '';
function cardLockReady() { return !!(window.cardLockTryUnlock && window.openModal); }
function cardLockMissingNote(miss, okState) {
let host = okState;
if (!host) {
const actions = document.getElementById('splash-cardlock-actions');
if (actions) {
host = actions.querySelector('.cardlock-state');
if (!host) { host = document.createElement('div'); host.className = 'cardlock-state'; actions.appendChild(host); }
}
}
const msg = '解锁要用的 ' + miss + ' 这次没加载成功（不是密码不对）——顶部若出现「点此重试」点它，或重开一次页面；组件一到位这里自己恢复。';
cardLockMissMsg = msg;
if (host) host.textContent = msg;
else if (window.toast) window.toast(msg); // 开屏已隐藏（进入后的提醒弹窗那条路）时至少给一句真话
if (cardLockFixTimer) return;
let waited = 0;
cardLockFixTimer = setInterval(function () {
waited += 1200;
if (window.cardLockOpen && window.cardLockTryUnlock && window.openModal) {
clearInterval(cardLockFixTimer); cardLockFixTimer = null;
cardLockMissMsg = '';
setupCardLockCard(); // 整卡重渲染＝按钮接回真流程，状态行随之消失
return;
}
if (waited >= 20000) { clearInterval(cardLockFixTimer); cardLockFixTimer = null; }
}, 1200);
}
function setupCardLockCard() {
const card = document.getElementById('splash-cardlock');
if (!card) return;
const tip = document.getElementById('splash-cardlock-tip');
const actions = document.getElementById('splash-cardlock-actions');
if (!actions) return;
const open = cardLockStateKnown();
if (tip) tip.textContent = open
? '系统内置字卡已解锁（成年人验证已通过）。如需恢复未成年人保护，可重新上锁。'
: '系统内置字卡已全部锁定，这是面向未成年人的保护措施，不是 bug。锁定影响：默认聊天字卡、词典（含词典拼字）、其他系统预设互动字卡全部停用；你自建的字卡与情绪 / 心意 / 意图字卡不受影响。豁免说明：聊天情绪字卡、TA 的心情、聊天回应字卡这三大互动链不受锁定影响，未解锁也照常触发与抽取。所以若发现「某功能开关都开了却没效果」，先看是不是锁定中。不输密码也能正常使用全部功能，密码只管两件事：解锁系统内置字卡、跳过开屏的 2 个问答。注意：锁定时若自定义字卡（含 mj 字卡）一张都没添加，回复会更单薄（情绪/回应字卡仍在，但少了系统预设内容），自己在自定义字卡里添加几张即可。密码一共 6 位数字：前两位是 99，后 4 位是 mochi 字卡生日的字面数字（把生日日期原样写成 4 位数），生日写在开屏第一页的章节目录里（点开第一页顶部的「目录」逐章翻一下就能找到）——第一页的章节目录里和第二页最顶那张时间线卡都写着——日期一直是很简单的字面意思，不是隐藏答案；开屏最底下的部署时间不算（那只是用来判断有没有更新到新版本）。这个密码与开屏问答页的「暗号」是同一个。解开密码请勿二传（不要告诉别人），一旦有人二传，密码就会被重新设置。';
actions.innerHTML = '';
const state = document.createElement('div');
state.className = 'cardlock-state';
if (open) {
const relock = document.createElement('button');
relock.className = 'cardlock-btn cardlock-btn-ghost';
relock.type = 'button';
relock.textContent = '重新上锁';
cardLockTap(relock, function () {
window.cardLockRelock();
state.textContent = '已重新上锁，页面即将刷新…';
const goReloadAfterPersist = function () { setTimeout(function () { location.reload(); }, 300); };
if (window.cardLockConfirmPersisted) window.cardLockConfirmPersisted('locked', goReloadAfterPersist);
else setTimeout(function () { location.reload(); }, 900);
});
actions.appendChild(relock);
} else {
const unlock = document.createElement('button');
unlock.className = 'cardlock-btn';
unlock.type = 'button';
unlock.textContent = '输入密码解锁';
cardLockTap(unlock, function () {
promptCardUnlock(state);
});
actions.appendChild(unlock);
cardLockTap(actions, function () { promptCardUnlock(state); });
const ph = function (tag) { try { if (window.__mochiPhase) window.__mochiPhase(tag); } catch (e) {} };
['touchstart', 'pointerdown', 'click'].forEach(function (evName) {
actions.addEventListener(evName, function () { ph('锁卡' + evName); }, { capture: true, passive: true });
});
}
actions.appendChild(state);
if (cardLockMissMsg && !cardLockReady()) state.textContent = cardLockMissMsg;
}
function promptCardUnlock(okState) {
const miss = !window.cardLockTryUnlock ? 'js/card-lock.js' : (!window.openModal ? 'js/personalize.js' : '');
if (miss) { cardLockMissingNote(miss, okState); return; }
const exMask = document.getElementById('modal-mask');
if (exMask && !exMask.hidden) {
const ti = exMask.querySelector('.modal-t') || exMask.querySelector('.modal-title');
if (ti && String(ti.textContent || '').indexOf('二级验证') === 0) return;
}
const splash = document.getElementById('splash');
const mask = document.getElementById('modal-mask');
const splashVisible = splash && !splash.classList.contains('hide');
if (splashVisible) splash.classList.add('under-modal');
let mo = null;
if (splashVisible && mask && 'MutationObserver' in window) {
mo = new MutationObserver(function () { if (mask.hidden) { splash.classList.remove('under-modal'); } });
mo.observe(mask, { attributes: true, attributeFilter: ['hidden'] });
}
const ctl = window.openModal('二级验证 · 输入解锁密码', '', function (v) {
const r = window.cardLockTryUnlock(String(v == null ? '' : v).trim());
if (!r.ok) { ctl.hint(r.msg || '密码不对'); ctl.stay(); return; }
if (okState) okState.textContent = '验证通过';
if (mo) { try { mo.disconnect(); } catch (e) {} }
const sizeTip = window.mochiPresetSizeTip;
if (sizeTip && window.openModal) {
const ctl2 = window.openModal('解锁成功 · 字卡使用提醒', '', function () {
}, { noInput: true, big: true, warn: true, lock: true, staticText: '系统内置字卡已解锁，聊天与各功能可以正常取用。\n\n' + sizeTip });
if (ctl2 && ctl2.okText) ctl2.okText('知道了');
}
}, { inputmode: 'numeric', placeholder: '输入二级验证密码', staticText: '密码一共 6 位数字：前两位是 99，后 4 位是 mochi 字卡生日的字面数字（把生日日期原样写成 4 位数），生日就在开屏第一页的章节目录里（点开顶部的「目录」逐章翻一下就能找到）——第一页的章节目录里和第二页最顶那张时间线卡都写着——日期一直是很简单的字面意思，不是隐藏答案；开屏最底下的部署时间不算（那只是用来判断有没有更新到新版本）。解开密码请勿二传（不要告诉别人），一旦有人二传，密码就会被重新设置。这个密码与开屏问答页的「暗号」是同一个（同一串 6 位数字）：在开屏问答页点「输暗号跳过问答」用的也是它。' });
}
document.addEventListener('mochi-cardlock-open', setupCardLockCard);
document.addEventListener('mochi-cardlock-locked', setupCardLockCard);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
else run();
fetch(OFFICIAL_NOTICE, { cache: 'no-store' })
.then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
.then(function (d) {
let dirty = false;
['alert', 'alert2'].forEach(function (k) {
if (d && typeof d[k] === 'string' && d[k].trim() && d[k].trim() !== texts[k]) {
if (d[k].indexOf(POLICY_ANCHOR) < 0) return;
texts[k] = d[k].trim();
dirty = true;
}
});
if (d && typeof d.bulletin === 'object' && d.bulletin) {
const nb = { text: String(d.bulletin.text || ''), until: Number(d.bulletin.until) || 0 };
if (nb.text && (!bulletin || bulletin.text !== nb.text || bulletin.until !== nb.until)) {
bulletin = nb;
dirty = true;
} else if (!nb.text && bulletin) {
bulletin = null;
dirty = true;
}
}
if (dirty) run(); // 强刷回写
})
.catch(function () { /* 保留本地兜底 */ });
})();
if (window.__mochiLoaded) window.__mochiLoaded.push("clock.js");
} catch (__e) { if (window.__mochiErrLoaded) window.__mochiErrLoaded.push("clock.js"); try { console.error("[JS] clock.js", __e && __e.message || __e); } catch (x) {} if (window.__jsErrors) window.__jsErrors.push("[clock.js] " + String(__e && __e.message || __e)); } })();