const STORAGE_KEY = 'yuzi-feeding-workbench-v1';
const CATEGORIES = [
  { value: 'grain', label: '谷薯类' },
  { value: 'veg', label: '蔬果类' },
  { value: 'oil', label: '油' },
  { value: 'protein', label: '肉类' },
  { value: 'pending', label: '待确认' }
];
const CATEGORY_MAP = {
  grain: ['米', '米粉', '粥', '燕麦', '面', '小米', '藜麦', '土豆', '马铃薯', '山药', '红薯', '紫薯', '南瓜'],
  veg: ['西红柿', '番茄', '西兰花', '胡萝卜', '菠菜', '白菜', '青菜', '芦笋', '玉米', '苹果', '梨', '香蕉', '牛油果', '蓝莓', '桃', '蔬菜', '水果'],
  oil: ['油', '核桃油', '橄榄油', '亚麻籽油'],
  protein: ['牛肉', '猪肉', '三文鱼', '鳕鱼', '虾', '鸡肉', '鸡蛋', '鱼', '肉']
};
const initialState = {
  baby: { name: '柚子', age: '7 月龄' },
  recipes: [
    { id: 'sample-1', title: '南瓜小米糊', url: 'https://example.com/yuzi-sample-pumpkin', source: '示例菜品', note: '虚构示例，用于体验记录流程。', cookNote: '', photo: '', favorite: true, sample: true, ingredients: [{ name: '南瓜', category: 'veg' }, { name: '小米', category: 'grain' }] },
    { id: 'sample-2', title: '西兰花牛肉泥', url: 'https://example.com/yuzi-sample-beef', source: '示例菜品', note: '虚构示例，用于体验记录流程。', cookNote: '', photo: '', favorite: true, sample: true, ingredients: [{ name: '西兰花', category: 'veg' }, { name: '牛肉', category: 'protein' }] }
  ],
  meals: { morning: null, afternoon: null },
  ingredients: [
    { id: 'i-potato', name: '土豆', status: 'tried', note: '已吃过' },
    { id: 'i-tomato', name: '西红柿', status: 'tried', note: '已吃过' },
    { id: 'i-yam', name: '山药', status: 'tried', note: '已吃过' },
    { id: 'i-broccoli', name: '西兰花', status: 'tried', note: '已吃过' },
    { id: 'i-pumpkin', name: '南瓜', status: 'tried', note: '已吃过' },
    { id: 'i-beef', name: '牛肉', status: 'new', note: '备餐库存可记录' },
    { id: 'i-pork', name: '猪肉', status: 'new', note: '备餐库存可记录' },
    { id: 'i-salmon', name: '三文鱼', status: 'new', note: '备餐库存可记录' },
    { id: 'i-cod', name: '鳕鱼', status: 'new', note: '备餐库存可记录' },
    { id: 'i-shrimp', name: '虾', status: 'new', note: '备餐库存可记录' }
  ],
  observations: [],
  inventory: { '牛肉': 0, '猪肉': 0, '三文鱼': 0, '鳕鱼': 0, '虾': 0 },
  weekBasket: [],
  weekPlan: {},
  mealHistory: []
};
let state = loadState();
let currentPage = 'today';
let ingredientTab = 'tried';
let recipeQuery = '';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!raw) return clone(initialState);
    const base = Object.assign({}, clone(initialState), raw);
    base.weekBasket = base.weekBasket || [];
    base.weekPlan = base.weekPlan || {};
    base.mealHistory = base.mealHistory || [];
    base.recipes = (base.recipes || []).map(r => Object.assign({ cookNote: '', photo: '' }, r));
    base.observations = (base.observations || []).map(o => Object.assign({ photo: '' }, o));
    return base;
  } catch (error) { return clone(initialState); }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function uid(prefix = 'id') { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function esc(value = '') { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
function categoryLabel(value) { return CATEGORIES.find(item => item.value === value)?.label || '待确认'; }
function formatDate(date = new Date()) { return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(date); }
function pushMealHistory(meal) {
  if (!meal) return;
  const existing = state.mealHistory.findIndex(m => m.date === meal.date && m.slot === meal.slot);
  if (existing >= 0) state.mealHistory[existing] = { date: meal.date, slot: meal.slot, title: meal.title, ingredients: clone(meal.ingredients), recipeId: meal.recipeId };
  else state.mealHistory.push({ date: meal.date, slot: meal.slot, title: meal.title, ingredients: clone(meal.ingredients), recipeId: meal.recipeId });
}
function weekDates() {
  const now = new Date(); const day = (now.getDay() + 6) % 7; // 周一=0
  const monday = new Date(now); monday.setDate(now.getDate() - day);
  const out = [];
  for (let i = 0; i < 7; i++) { const d = new Date(monday); d.setDate(monday.getDate() + i); out.push({ dow: '周' + '一二三四五六日'[i], date: d.toISOString().slice(0, 10), label: `${i + 1}日` }); }
  return out;
}
function recipeById(id) { return state.recipes.find(r => r.id === id); }
function aggregateHistory() {
  const map = new Map();
  for (const m of state.mealHistory) {
    if (!map.has(m.title)) map.set(m.title, { title: m.title, count: 0, dates: [], recipeId: m.recipeId });
    const item = map.get(m.title); item.count++; item.dates.push(m.date); if (m.recipeId) item.recipeId = m.recipeId;
  }
  return [...map.values()].sort((a, b) => b.dates[b.dates.length - 1].localeCompare(a.dates[a.dates.length - 1]));
}
function cookNoteForm(recipe) {
  return `<form id="cooknote-form"><p class="helper">记录做法，下次做的时候翻出来看。</p><div class="form-field"><label for="cooknote">做法</label><textarea id="cooknote" name="cooknote" placeholder="例如：南瓜蒸熟碾泥，兑入熬好的小米粥…" style="min-height:120px">${esc(recipe?.cookNote || '')}</textarea></div><div class="modal-footer"><button class="btn secondary" data-action="close-modal" type="button">取消</button><button class="btn" type="submit">保存做法</button></div></form>`;
}
function openCookNote(title, recipeId) {
  const recipe = recipeId ? recipeById(recipeId) : state.recipes.find(r => r.title === title);
  openModal(`做法 · ${esc(recipe?.title || title)}`, cookNoteForm(recipe));
  document.querySelector('#cooknote-form').dataset.recipeId = recipe?.id || '';
}
function saveCookNote(form) {
  const recipeId = form.dataset.recipeId; const text = formDataValue(form, 'cooknote');
  if (!recipeId) { closeModal(); showToast('这道菜是手动记录的，先存为菜品再写做法'); return; }
  const recipe = recipeById(recipeId); if (recipe) { recipe.cookNote = text; saveState(); closeModal(); showToast('做法已保存'); }
}
function autoPlanWeek() {
  state.weekPlan = {};
  const days = weekDates(); const ids = state.weekBasket.filter(id => recipeById(id));
  if (!ids.length) { showToast('菜篮还是空的，先选几道菜'); return; }
  let idx = 0;
  for (const day of days) {
    const p = {};
    for (const slot of ['morning', 'afternoon']) { p[slot] = ids[idx % ids.length]; idx++; }
    state.weekPlan[day.date] = p;
  }
}
function openPlanPicker(date, slot) {
  const favorited = state.recipes.filter(r => r.favorite);
  const content = `<form id="plan-picker"><p class="helper">${date} ${slot === 'morning' ? '上午餐' : '下午餐'}，选一道或清空。</p><div class="plan-choices">${favorited.map(r => `<button class="plan-choice ${(state.weekPlan[date]?.[slot]) === r.id ? 'active' : ''}" data-action="plan-pick" data-date="${date}" data-slot="${slot}" data-value="${r.id}" type="button">${esc(r.title)}</button>`).join('')}<button class="plan-choice muted" data-action="plan-pick" data-date="${date}" data-slot="${slot}" data-value="" type="button">清空这一餐</button></div><div class="modal-footer"><button class="btn secondary" data-action="close-modal" type="button">关闭</button></div></form>`;
  openModal('换一道', content);
}
function pickPlan(date, slot, value) {
  state.weekPlan[date] = state.weekPlan[date] || {};
  state.weekPlan[date][slot] = value || null;
  saveState(); closeModal(); render(); showToast('已更新');
}
function suggestCategory(name) {
  const normalized = name.replace(/（.*?）|\(.*?\)/g, '').trim();
  for (const [category, words] of Object.entries(CATEGORY_MAP)) if (words.some(word => normalized.includes(word))) return category;
  return 'pending';
}
function parseIngredients(text) {
  return [...new Set(text.split(/[，,、;；\n\t]+/).map(item => item.trim().replace(/^[-*•\d.、\s]+/, '')).filter(Boolean))].map(name => ({ name, category: suggestCategory(name) }));
}
function showToast(message) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200); }
function mealItems(meal) { return meal?.ingredients || []; }
function mealCategoryItems(meal, category) { return mealItems(meal).filter(item => item.category === category); }
function mealLabel(meal) { return meal?.title || (meal ? '手动记录的一餐' : '还没有记录'); }
function inventoryLine(name) { return Object.prototype.hasOwnProperty.call(state.inventory, name) ? `${name}(库存${state.inventory[name]}份)` : name; }
function categoryTiles(meal) { return CATEGORIES.slice(0, 4).map(category => { const found = mealCategoryItems(meal, category.value); return `<div class="category-tile ${found.length ? '' : 'is-empty'}"><span class="cat-name">${category.label}</span><span class="cat-food">${found.length ? esc(found.map(i => category.value === 'protein' ? inventoryLine(i.name) : i.name).join('、')) : '待补充'}</span></div>`; }).join(''); }
function mealCard(slot, title, subtitle, icon) {
  const meal = state.meals[slot];
  return `<article class="card meal-card"><div class="meal-head"><div class="meal-title"><span class="meal-mark" aria-hidden="true">${icon}</span><div><strong>${title}</strong><small>${subtitle}</small></div></div><button class="text-btn" data-action="edit-meal" data-slot="${slot}" type="button">${meal ? '编辑' : '添加记录'}</button></div>${meal ? `<div class="meal-recipe"><span>${esc(mealLabel(meal))}</span>${meal.recipeId ? `<button class="text-btn" data-action="open-recipe" data-id="${meal.recipeId}" type="button">看菜品</button>` : '<em>手动记录</em>'}</div><div class="ingredient-grid">${categoryTiles(meal)}</div><div class="actions-row">${meal.url ? `<button class="btn secondary small" data-action="open-url" data-url="${esc(meal.url)}" type="button">打开教程</button>` : ''}<button class="btn secondary small" data-action="edit-meal" data-slot="${slot}" type="button">修改食材</button></div>` : `<div class="empty-meal">记录这一餐实际吃了什么，分类可随时修改。</div><button class="btn small" data-action="edit-meal" data-slot="${slot}" type="button">+ 记录${title}</button>`}</article>`;
}
function renderToday() {
  const triedCount = state.ingredients.filter(i => i.status === 'tried').length;
  const observingCount = state.ingredients.filter(i => i.status === 'observing').length;
  return `<div class="page-intro"><div><p class="eyebrow">TODAY'S TABLE</p><h2>今天吃什么</h2><p>把实际吃过的，轻轻记下来。</p></div><div class="date-stamp">${formatDate()}<br>两餐记录</div></div><div class="tip-banner"><strong>记录原则</strong><br>这里只记录食材与当天状态，不自动判断营养或过敏。</div>${mealCard('morning', '上午餐', '一顿简单的开始', '早')}${mealCard('afternoon', '下午餐', '留一点时间给观察', '午')}<div class="section-label"><h3>小小记录</h3><span>LOCAL NOTES</span></div><div class="stats-strip"><div class="stat"><strong>${triedCount}</strong><span>已吃过食材</span></div><div class="stat"><strong>${state.recipes.filter(r => r.favorite).length}</strong><span>收藏菜品</span></div><div class="stat"><strong>${observingCount}</strong><span>观察中</span></div></div><div class="section-label"><h3>吃过的菜</h3><span>${state.mealHistory.length} 次</span></div>${state.mealHistory.length ? `<div class="history-list">${aggregateHistory().slice(0, 5).map(item => `<div class="card history-card"><div class="history-head"><strong>${esc(item.title)}</strong><span>${item.count} 次</span></div><div class="history-body">${item.dates.slice().reverse().slice(0, 3).map(d => `<span class="tag">${d}</span>`).join('')}</div><button class="text-btn" data-action="edit-cooknote" data-title="${esc(item.title)}" data-recipeid="${esc(item.recipeId || '')}" type="button">${item.recipeId ? '写做法' : ''}</button></div>`).join('')}</div>` : '<div class="muted-empty">记第一餐后，这里会显示吃过的菜。</div>'}`;
}
function recipeCard(recipe) {
  return `<article class="card recipe-card"><div class="recipe-top"><span class="recipe-seal" aria-hidden="true">${recipe.sample ? '样' : '菜'}</span><div><h3>${esc(recipe.title)}</h3><div class="recipe-meta">${esc(recipe.source || '手动保存')}${recipe.sample ? ' · 虚构示例' : ''}</div></div>${recipe.photo ? `<img class="photo-thumb recipe-photo" src="${recipe.photo}" alt="${esc(recipe.title)}照片" />` : ''}</div><div class="recipe-ingredients">${recipe.ingredients.map(item => `<span class="tag ${item.category === 'pending' ? 'pending' : ''}">${esc(item.name)} · ${categoryLabel(item.category)}</span>`).join('') || '<span class="tag pending">暂无食材</span>'}</div>${recipe.note ? `<div class="recipe-meta" style="margin-bottom:10px">${esc(recipe.note)}</div>` : ''}${recipe.cookNote ? `<div class="recipe-cooknote">做法：${esc(recipe.cookNote)}</div>` : ''}<div class="recipe-actions"><button class="icon-btn ${recipe.favorite ? 'favorite' : ''}" data-action="toggle-favorite" data-id="${recipe.id}" type="button">${recipe.favorite ? '★ 已收藏' : '☆ 收藏'}</button><button class="icon-btn" data-action="add-to-meal" data-id="${recipe.id}" data-slot="morning" type="button">加入上午餐</button><button class="icon-btn" data-action="add-to-meal" data-id="${recipe.id}" data-slot="afternoon" type="button">加入下午餐</button><button class="icon-btn" data-action="edit-cooknote" data-title="${esc(recipe.title)}" data-recipeid="${recipe.id}" type="button">做法</button><button class="icon-btn" data-action="open-url" data-url="${esc(recipe.url)}" type="button">打开教程</button><button class="icon-btn" data-action="edit-recipe" data-id="${recipe.id}" type="button">编辑</button></div></article>`;
}
function renderRecipes() {
  const recipes = state.recipes.filter(recipe => `${recipe.title} ${recipe.ingredients.map(i => i.name).join(' ')}`.toLowerCase().includes(recipeQuery.toLowerCase()) && recipe.favorite);
  return `<div class="page-intro"><div><p class="eyebrow">SAVED RECIPES</p><h2>菜品</h2><p>把教程链接和食材放在一起。</p></div></div><div class="toolbar"><button class="btn" data-action="add-recipe" type="button">+ 保存抖音教程</button></div><input class="search" aria-label="搜索收藏菜品" data-action="recipe-search" value="${esc(recipeQuery)}" placeholder="搜索菜名或食材" />${recipes.length ? recipes.map(recipeCard).join('') : '<div class="muted-empty card">还没有匹配的收藏菜品。<br>先保存一个教程链接吧。</div>'}`;
}
const ingredientTabs = [['tried', '已吃过'], ['new', '待尝试'], ['observing', '观察中'], ['paused', '暂缓观察'], ['pending', '待确认']];
function ingredientForm(ingredient = null) {
  return `<form id="ingredient-form"><div class="form-field"><label for="ing-name">食材名称（必填）</label><input id="ing-name" name="name" required placeholder="例如：牛肉" value="${esc(ingredient?.name || '')}" /></div><div class="form-field"><label for="ing-status">状态</label><select id="ing-status" name="status">${ingredientTabs.map(([value, label]) => `<option value="${value}" ${ingredient?.status === value ? 'selected' : ''}>${label}</option>`).join('')}</select></div><div class="form-field"><label for="ing-note">备注（可选）</label><input id="ing-note" name="note" placeholder="例如：6 月龄吃过" value="${esc(ingredient?.note || '')}" /></div><div class="modal-footer"><button class="btn secondary" data-action="close-modal" type="button">取消</button><button class="btn" type="submit">保存食材</button></div></form>`;
}
function openIngredientModal(ingredient = null) { openModal(ingredient ? '编辑食材' : '添加食材', ingredientForm(ingredient)); document.querySelector('#ingredient-form').dataset.id = ingredient?.id || ''; }
function saveIngredient(form) {
  const name = formDataValue(form, 'name'); if (!name) return;
  const data = { name, status: formDataValue(form, 'status') || 'new', note: formDataValue(form, 'note') };
  const id = form.dataset.id;
  if (id) { const item = state.ingredients.find(i => i.id === id); if (item) { item.name = data.name; item.status = data.status; item.note = data.note; } }
  else { state.ingredients.push({ id: uid('i'), name: data.name, status: data.status, note: data.note }); }
  saveState(); closeModal(); ingredientTab = data.status; render(); showToast('食材已保存');
}
function renderIngredients() {
  const groups = state.ingredients.filter(item => item.status === ingredientTab);
  const records = state.observations;
  return `<div class="page-intro"><div><p class="eyebrow">FOOD NOTES</p><h2>食材</h2><p>按实际记录整理，不替你下结论。</p></div></div><div class="tabs">${ingredientTabs.map(([value, label]) => `<button class="tab ${ingredientTab === value ? 'active' : ''}" data-action="ingredient-tab" data-tab="${value}" type="button">${label}</button>`).join('')}</div><div class="ingredient-group"><div class="toolbar"><button class="btn" data-action="add-ingredient" type="button">+ 添加食材</button></div><h3>${ingredientTabs.find(t => t[0] === ingredientTab)[1]} <span class="count">${groups.length}</span></h3><div class="food-list">${groups.length ? groups.map(item => `<div class="food-row"><div><span class="food-name">${esc(item.name)}</span><span class="food-note">${esc(item.note || '暂无备注')}</span></div><div class="food-actions"><button data-action="edit-ingredient" data-id="${item.id}" type="button">编辑</button><button data-action="observe" data-id="${item.id}" type="button">记录状态</button></div></div>`).join('') : '<div class="muted-empty card">这里暂时没有食材记录。</div>'}</div></div><div class="section-label"><h3>排敏观察记录</h3><span>${records.length} 条</span></div>${records.length ? records.slice().reverse().map(record => `<div class="card record"><div class="record-head"><strong>${esc(record.ingredient)} · ${record.slot === 'morning' ? '上午餐' : '下午餐'}</strong><span>${esc(record.date)}</span></div><p>食用量：${esc(record.amount || '未填写')}<br>皮肤：${esc(record.skin)}　消化：${esc(record.digestive)}　精神：${esc(record.mood)}${record.abnormal ? `<br><strong style="color:var(--rose)">异常事实：${esc(record.abnormal)}</strong>` : ''}${record.note ? `<br>备注：${esc(record.note)}` : ''}</p>${record.photo ? `<img class="photo-thumb record-photo" src="${record.photo}" alt="观察照片" />` : ''}<div class="photo-actions"><input type="file" accept="image/*" class="photo-input" data-target="observation" data-id="${esc(record.id)}" aria-label="给这条观察添加照片" /><button class="icon-btn" data-action="remove-photo" data-target="observation" data-id="${esc(record.id)}" type="button" ${record.photo ? '' : 'disabled'}>删除照片</button></div></div>`).join('') : '<div class="muted-empty">记录会显示在这里，内容以你填写的事实为准。</div>'}`;
}
function renderBackup() {
  return `<div class="section-label"><h3>数据备份</h3><span>BACKUP</span></div><div class="tip-banner"><strong>数据只存在这台设备</strong><br>定期导出备份，换手机、清缓存都不怕。导入会覆盖当前这台设备的数据。</div><div class="backup-actions"><button class="btn" data-action="export-backup" type="button">导出备份</button><label class="btn secondary file-btn">导入备份<input type="file" accept="application/json,.json" class="backup-input" aria-label="选择备份文件" /></label></div>`;
}
function renderPrep() {
  const foods = Object.keys(state.inventory);
  const basketItems = state.weekBasket.map(recipeById).filter(Boolean);
  const days = weekDates();
  const planCells = days.map(day => { const p = state.weekPlan[day.date] || {}; const m = recipeById(p.morning); const a = recipeById(p.afternoon); return `<div class="week-row"><span class="week-day">${day.dow}</span><div class="week-cells">${[['morning', m], ['afternoon', a]].map(([slot, r]) => `<button class="week-cell ${r ? '' : 'is-empty'}" data-action="plan-slot" data-date="${day.date}" data-slot="${slot}" type="button"><span class="wc-slot">${slot === 'morning' ? '早' : '午'}</span><span class="wc-name">${r ? esc(r.title) : '换一道'}</span></button>`).join('')}</div></div>`; }).join('');
  return `<div class="page-intro"><div><p class="eyebrow">PREP DRAWER</p><h2>备餐</h2><p>肉泥库存 · 每份按你自己的习惯计算。</p></div></div><div class="tip-banner"><strong>库存只做数量记录</strong><br>增加或减少一份，不关联食用结论。</div><div class="section-label"><h3>肉泥库存</h3><span>PROTEIN</span></div><div class="inventory">${foods.map(food => `<div class="card inventory-card"><div><strong>${food}</strong><small>冷冻肉泥 / 份</small></div><div class="stepper"><button data-action="inventory" data-food="${food}" data-change="-1" aria-label="减少${food}库存" type="button">−</button><b>${state.inventory[food]}</b><button data-action="inventory" data-food="${food}" data-change="1" aria-label="增加${food}库存" type="button">+</button></div></div>`).join('')}</div><div class="section-label"><h3>本周菜篮</h3><span>${basketItems.length} 道</span></div><div class="tag-list">${state.recipes.filter(r => r.favorite).map(r => `<button class="tag ${state.weekBasket.includes(r.id) ? 'basket-in' : 'basket-out'}" data-action="toggle-basket" data-id="${r.id}" type="button">${state.weekBasket.includes(r.id) ? '✓ ' : '+ '}${esc(r.title)}</button>`).join('') || '<div class="muted-empty">先收藏几道菜，再来排这周。</div>'}</div><div class="toolbar" style="margin-top:14px"><button class="btn" data-action="auto-plan" type="button">自动排一周</button></div><div class="section-label"><h3>本周安排</h3><span>照做即可</span></div><div class="week-plan">${planCells}</div><div class="muted-empty card" style="margin-top:14px">排好后回到「今天」页记录当天实际吃的，四类搭配会自动带库存。</div>${renderBackup()}`;
}
function render() {
  const pages = { today: renderToday, recipes: renderRecipes, ingredients: renderIngredients, prep: renderPrep };
  document.querySelector('#app').innerHTML = pages[currentPage]();
  document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('is-active', button.dataset.page === currentPage));
}
function openModal(title, content) {
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><h2 id="modal-title">${title}</h2><button class="close" data-action="close-modal" type="button" aria-label="关闭">×</button></div>${content}</section></div>`;
  document.querySelector('#modal-root .modal-backdrop').addEventListener('click', event => { if (event.target === event.currentTarget) closeModal(); });
}
function closeModal() { document.querySelector('#modal-root').innerHTML = ''; }
function recipeForm(recipe = null) {
  const ingredients = recipe?.ingredients || [];
  return `<form id="recipe-form"><div class="form-field"><label for="recipe-url">教程链接（必填）</label><input id="recipe-url" name="url" type="url" required placeholder="粘贴抖音分享链接" value="${esc(recipe?.url || '')}" /></div><div class="form-field"><label for="recipe-title">菜品名称（必填）</label><input id="recipe-title" name="title" required placeholder="例如：南瓜小米糊" value="${esc(recipe?.title || '')}" /></div><div class="form-field"><label for="recipe-source">来源平台 / 作者（可选）</label><input id="recipe-source" name="source" placeholder="例如：抖音 · @某位妈妈" value="${esc(recipe?.source || '')}" /></div><div class="form-field"><label for="recipe-ingredients">食材清单</label><textarea id="recipe-ingredients" name="ingredients" placeholder="用逗号分隔，例如：南瓜，小米，食用油">${esc(ingredients.map(i => i.name).join('，'))}</textarea></div><p class="helper">输入后会按常见词给出建议；每一项都可以在下一步修改。无法识别的会先放入待确认。</p><div class="form-field"><label for="recipe-note">备注（可选）</label><textarea id="recipe-note" name="note" placeholder="记一点做法或自己的观察">${esc(recipe?.note || '')}</textarea></div>${recipe ? `<div class="form-field"><label>菜品照片</label>${photoField('recipe', recipe.photo)}</div>` : ''}<label class="checkbox-line"><input name="favorite" type="checkbox" ${recipe?.favorite !== false ? 'checked' : ''} /> 保存到收藏</label><div class="modal-footer"><button class="btn secondary" data-action="close-modal" type="button">取消</button><button class="btn" type="submit">下一步：确认分类</button></div></form>`;
}
function classificationForm(data) {
  return `<form id="classification-form"><p class="helper">系统只给建议，最后以你的选择为准。分类可随时修改。</p><div class="classification-list">${data.ingredients.map((item, index) => `<div class="classification-row"><input name="name-${index}" aria-label="食材名称 ${index + 1}" value="${esc(item.name)}" required /><select name="category-${index}" aria-label="${esc(item.name)} 分类">${CATEGORIES.map(cat => `<option value="${cat.value}" ${item.category === cat.value ? 'selected' : ''}>${cat.label}</option>`).join('')}</select></div>`).join('')}</div><div class="modal-footer"><button class="btn secondary" data-action="back-recipe-form" type="button">返回修改</button><button class="btn" type="submit">保存菜品</button></div></form>`;
}
function mealForm(slot) {
  const meal = state.meals[slot];
  const ingredients = meal?.ingredients || [];
  return `<form id="meal-form" data-slot="${slot}"><div class="form-field"><label for="meal-title">这餐的名称（可选）</label><input id="meal-title" name="title" placeholder="例如：土豆泥" value="${esc(meal?.title || '')}" /></div><div class="form-field"><label for="meal-ingredients">实际吃到的食材</label><textarea id="meal-ingredients" name="ingredients" required placeholder="用逗号分隔，例如：土豆，西兰花，牛肉">${esc(ingredients.map(i => i.name).join('，'))}</textarea></div><p class="helper">分类会先按常见词建议，你可以在下一步调整。记录实际吃到的即可。</p><div class="modal-footer"><button class="btn secondary" data-action="close-modal" type="button">取消</button><button class="btn" type="submit">下一步：确认分类</button></div></form>`;
}
function observationForm(item) {
  return `<form id="observation-form" data-ingredient="${item.id}"><div class="form-field"><label for="obs-date">日期</label><input id="obs-date" name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required /></div><div class="form-field"><label for="obs-slot">餐次</label><select id="obs-slot" name="slot"><option value="morning">上午餐</option><option value="afternoon">下午餐</option></select></div><div class="form-field"><label for="obs-amount">食用量（可选）</label><input id="obs-amount" name="amount" placeholder="例如：2 小勺" /></div><div class="form-field"><label for="obs-skin">皮肤状态</label><input id="obs-skin" name="skin" required placeholder="例如：无明显变化" /></div><div class="form-field"><label for="obs-digestive">消化状态</label><input id="obs-digestive" name="digestive" required placeholder="例如：无明显变化" /></div><div class="form-field"><label for="obs-mood">精神状态</label><input id="obs-mood" name="mood" required placeholder="例如：和平时一样" /></div><div class="form-field"><label for="obs-abnormal">异常事实（没有可留空）</label><textarea id="obs-abnormal" name="abnormal" placeholder="只记录看到的事实，例如：当天出现红疹"></textarea></div><div class="form-field"><label for="obs-note">备注（可选）</label><textarea id="obs-note" name="note"></textarea></div><div class="modal-footer"><button class="btn secondary" data-action="close-modal" type="button">取消</button><button class="btn" type="submit">保存记录</button></div></form>`;
}
function openRecipeModal(id) { openModal('编辑菜品', recipeForm(state.recipes.find(r => r.id === id))); document.querySelector('#recipe-form').dataset.id = id; }
function handleRecipeForm(form) {
  const formData = new FormData(form); const data = { id: form.dataset.id || uid('recipe'), title: formData.get('title').trim(), url: formData.get('url').trim(), source: formData.get('source').trim(), note: formData.get('note').trim(), favorite: formData.get('favorite') === 'on', ingredients: parseIngredients(formData.get('ingredients') || '') };
  openModal('确认食材分类', classificationForm(data)); document.querySelector('#classification-form').dataset.recipe = JSON.stringify(data);
}
function saveClassified(form) {
  const data = JSON.parse(form.dataset.recipe); data.ingredients = data.ingredients.map((_, index) => ({ name: formDataValue(form, `name-${index}`), category: formDataValue(form, `category-${index}`) })).filter(item => item.name);
  const index = state.recipes.findIndex(r => r.id === data.id); if (index >= 0) state.recipes[index] = data; else state.recipes.unshift(data);
  saveState(); closeModal(); currentPage = 'recipes'; render(); showToast('菜品已保存，分类可以继续编辑');
}
function formDataValue(form, key) { return new FormData(form).get(key)?.trim() || ''; }
function addRecipeToMeal(recipeId, slot) { const recipe = state.recipes.find(r => r.id === recipeId); if (!recipe) return; state.meals[slot] = { id: uid('meal'), date: new Date().toISOString().slice(0, 10), slot, recipeId: recipe.id, title: recipe.title, url: recipe.url, ingredients: clone(recipe.ingredients) }; pushMealHistory(state.meals[slot]); saveState(); currentPage = 'today'; render(); showToast(`已加入${slot === 'morning' ? '上午餐' : '下午餐'}`); }
function openMealModal(slot) { openModal(slot === 'morning' ? '记录上午餐' : '记录下午餐', mealForm(slot)); }
function saveMeal(form) { const slot = form.dataset.slot; const data = { id: state.meals[slot]?.id || uid('meal'), date: new Date().toISOString().slice(0, 10), slot, title: formDataValue(form, 'title') || '手动记录的一餐', url: '', ingredients: parseIngredients(formDataValue(form, 'ingredients')) }; openModal('确认本餐分类', classificationForm(data)); document.querySelector('#classification-form').dataset.meal = JSON.stringify(data); }
function saveClassifiedMeal(form) { const data = JSON.parse(form.dataset.meal); data.ingredients = data.ingredients.map((_, index) => ({ name: formDataValue(form, `name-${index}`), category: formDataValue(form, `category-${index}`) })).filter(item => item.name); state.meals[data.slot] = data; pushMealHistory(data); saveState(); closeModal(); currentPage = 'today'; render(); showToast('这餐已记录'); }
function openObservation(id) { const item = state.ingredients.find(i => i.id === id); if (item) openModal(`记录 ${item.name}`, observationForm(item)); }
function saveObservation(form) { const data = Object.fromEntries(new FormData(form).entries()); const item = state.ingredients.find(i => i.id === form.dataset.ingredient); if (!item) return; item.status = 'observing'; item.note = '已有排敏观察记录'; state.observations.push({ ...data, ingredient: item.name, id: uid('obs') }); saveState(); closeModal(); render(); showToast('观察记录已保存'); }
function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 1200; let w = img.width, h = img.height; const scale = Math.min(1, max / Math.max(w, h)); w = Math.round(w * scale); h = Math.round(h * scale);
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => callback(null);
    img.src = reader.result;
  };
  reader.onerror = () => callback(null);
  reader.readAsDataURL(file);
}
function photoField(target, currentPhoto) {
  return `<div class="photo-field">${currentPhoto ? `<img class="photo-thumb" src="${currentPhoto}" alt="照片缩略图" />` : ''}<div class="photo-actions"><input type="file" accept="image/*" data-target="${target}" ${'data-current="' + (currentPhoto ? '1' : '0') + '"'} class="photo-input" aria-label="选择照片" /><button class="icon-btn" data-action="remove-photo" data-target="${target}" type="button" ${currentPhoto ? '' : 'disabled'}>删除照片</button></div></div>`;
}
function readPhotoInto(fileInput, key, id) {
  const file = fileInput.files && fileInput.files[0]; if (!file) return;
  compressImage(file, dataUrl => {
    if (!dataUrl) { showToast('无法读取这张图，换个试试'); return; }
    try {
      if (key === 'recipe') { const r = recipeById(id); if (r) r.photo = dataUrl; }
      else if (key === 'observation') { const o = state.observations.find(x => x.id === id); if (o) o.photo = dataUrl; }
      saveState(); closeModal(); render(); showToast('照片已保存');
    } catch (e) { showToast('照片过大，已略过（本地存储已满）'); }
  });
}
function exportBackup() {
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `柚子辅食备份-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('备份已下载，请存到网盘或微信收藏');
}
function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== 'object' || !Array.isArray(data.recipes)) { showToast('这不是有效的备份文件'); return; }
      const merged = Object.assign({}, clone(initialState), data);
      merged.weekBasket = merged.weekBasket || [];
      merged.weekPlan = merged.weekPlan || {};
      merged.mealHistory = merged.mealHistory || [];
      merged.recipes = (merged.recipes || []).map(r => Object.assign({ cookNote: '', photo: '' }, r));
      merged.observations = (merged.observations || []).map(o => Object.assign({ photo: '' }, o));
      state = merged;
      saveState(); render(); showToast('备份已导入');
    } catch (e) { showToast('导入失败，文件不是有效的备份'); }
  };
  reader.onerror = () => showToast('无法读取这个文件');
  reader.readAsText(file);
}
function removePhoto(target, id) {
  if (target === 'recipe') { const r = recipeById(id); if (r) { r.photo = ''; saveState(); } }
  else if (target === 'observation') { const o = state.observations.find(x => x.id === id); if (o) { o.photo = ''; saveState(); } }
  render(); showToast('照片已删除');
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]'); if (!button) return; const action = button.dataset.action;
  if (action === 'close-modal') closeModal();
  if (action === 'add-recipe') openModal('保存抖音教程', recipeForm());
  if (action === 'edit-recipe') openRecipeModal(button.dataset.id);
  if (action === 'toggle-favorite') { const recipe = state.recipes.find(r => r.id === button.dataset.id); recipe.favorite = !recipe.favorite; saveState(); render(); showToast(recipe.favorite ? '已加入收藏' : '已取消收藏'); }
  if (action === 'add-to-meal') addRecipeToMeal(button.dataset.id, button.dataset.slot);
  if (action === 'open-url') { if (button.dataset.url && !button.dataset.url.includes('example.com')) window.open(button.dataset.url, '_blank', 'noopener'); else showToast('这是虚构示例链接，真实菜品可打开原教程'); }
  if (action === 'open-recipe') { currentPage = 'recipes'; render(); const card = document.querySelector(`[data-action="edit-recipe"][data-id="${button.dataset.id}"]`); card?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  if (action === 'edit-meal') openMealModal(button.dataset.slot);
  if (action === 'ingredient-tab') { ingredientTab = button.dataset.tab; render(); }
  if (action === 'observe') openObservation(button.dataset.id);
  if (action === 'add-ingredient') openIngredientModal();
  if (action === 'edit-ingredient') openIngredientModal(state.ingredients.find(i => i.id === button.dataset.id));
  if (action === 'inventory') { const food = button.dataset.food; state.inventory[food] = Math.max(0, state.inventory[food] + Number(button.dataset.change)); saveState(); render(); }
  if (action === 'toggle-basket') { const id = button.dataset.id; const i = state.weekBasket.indexOf(id); if (i >= 0) state.weekBasket.splice(i, 1); else state.weekBasket.push(id); saveState(); render(); showToast(i >= 0 ? '已移出菜篮' : '已加入菜篮'); }
  if (action === 'auto-plan') { autoPlanWeek(); saveState(); render(); showToast('本周安排已生成'); }
  if (action === 'plan-slot') { openPlanPicker(button.dataset.date, button.dataset.slot); }
  if (action === 'plan-pick') { pickPlan(button.dataset.date, button.dataset.slot, button.dataset.value); }
  if (action === 'edit-cooknote') openCookNote(button.dataset.title, button.dataset.recipeid);
  if (action === 'remove-photo') removePhoto(button.dataset.target, button.dataset.id);
  if (action === 'export-backup') exportBackup();
  if (action === 'back-recipe-form') { const data = JSON.parse(document.querySelector('#classification-form').dataset.recipe); openModal('保存抖音教程', recipeForm(data)); document.querySelector('#recipe-form').dataset.id = data.id; }
});
document.addEventListener('input', event => { if (event.target.dataset.action === 'recipe-search') { recipeQuery = event.target.value; renderRecipesInPlace(); } });
document.addEventListener('submit', event => { event.preventDefault(); if (event.target.id === 'recipe-form') handleRecipeForm(event.target); if (event.target.id === 'classification-form') { if (event.target.dataset.meal) saveClassifiedMeal(event.target); else saveClassified(event.target); } if (event.target.id === 'meal-form') saveMeal(event.target); if (event.target.id === 'observation-form') saveObservation(event.target); if (event.target.id === 'ingredient-form') saveIngredient(event.target); if (event.target.id === 'cooknote-form') saveCookNote(event.target); });
document.addEventListener('change', event => { if (event.target.classList.contains('photo-input')) { const key = event.target.dataset.target === 'recipe' ? 'recipe' : 'observation'; readPhotoInto(event.target, key, event.target.dataset.id || (document.querySelector('#recipe-form')?.dataset.id)); } if (event.target.classList.contains('backup-input')) { importBackup(event.target.files && event.target.files[0]); event.target.value = ''; } });
document.addEventListener('click', event => { const nav = event.target.closest('.nav-item'); if (nav) { currentPage = nav.dataset.page; render(); } });
function renderRecipesInPlace() { const app = document.querySelector('#app'); if (currentPage === 'recipes') { app.innerHTML = renderRecipes(); document.querySelector('.search')?.focus(); } }
render();
