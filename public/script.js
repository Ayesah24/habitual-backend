const API_BASE = '/api';
const TOKEN_KEY = 'habitual_token';
const THEME_KEY = 'habitual_theme';
const $ = (id) => document.getElementById(id);

const state = {
  token: localStorage.getItem(TOKEN_KEY) || '',
  user: null,
  habits: [],
  filter: 'all',
  activeSection: 'dashboard',
};

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

function dateKey(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function today() {
  return dateKey();
}

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function pct(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

function apiRequest(path, options = {}) {
  const token = state.token;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  }).then(async (res) => {
    const data = await res.json().catch(() => ({ message: 'Unknown error' }));
    if (!res.ok) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  });
}

function setMessage(text, success = false) {
  const el = $('authError');
  if (!el) return;
  el.textContent = text || '';
  el.classList.toggle('success-message', !!success);
}

function showAuth(show) {
  $('authScreen')?.classList.toggle('hidden', !show);
  document.body.classList.toggle('auth-active', !!show);
}

function setUserUI(user) {
  const box = $('accountBox');
  if (!box) return;
  if (!user) {
    box.style.display = 'none';
    if ($('accountName')) $('accountName').textContent = 'User';
    if ($('accountEmail')) $('accountEmail').textContent = '';
    return;
  }

  box.style.display = 'flex';
  if ($('accountName')) $('accountName').textContent = user.username || user.email.split('@')[0];
  if ($('accountEmail')) $('accountEmail').textContent = user.email;
  if ($('accountAvatar')) $('accountAvatar').textContent = (user.username || user.email || 'U').charAt(0).toUpperCase();
}

function updateFields(signup) {
  const ug = $('signupUsernameGroup');
  const cg = $('signupConfirmGroup');
  if (ug) ug.style.display = signup ? '' : 'none';
  if (cg) cg.style.display = signup ? '' : 'none';
  if ($('authUsername')) $('authUsername').required = signup;
  if ($('authConfirmPassword')) $('authConfirmPassword').required = signup;
  if ($('authPassword')) $('authPassword').autocomplete = signup ? 'new-password' : 'current-password';
}

function switchMode(signup) {
  const form = $('authForm');
  if (!form) return;
  form.dataset.mode = signup ? 'signup' : 'login';
  if ($('authTitle')) $('authTitle').textContent = signup ? 'Create your account' : 'Welcome back';
  if ($('authSubtitle')) $('authSubtitle').textContent = signup ? 'Create an account to start tracking your habits.' : 'Log in to continue to your dashboard.';
  if ($('authSubmit')) $('authSubmit').textContent = signup ? 'Sign Up' : 'Log In';
  if ($('authSwitch')) $('authSwitch').textContent = signup ? 'Already have an account? Log In' : "Don't have an account? Sign Up";
  updateFields(signup);
  setMessage('');
}

function saveToken(token) {
  state.token = token || '';
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function initializeAuth() {
  if (!state.token) {
    state.user = null;
    setUserUI(null);
    showAuth(true);
    switchMode(false);
    return;
  }

  try {
    const data = await apiRequest('/auth/me');
    state.user = data.user;
    setUserUI(data.user);
    showAuth(false);
    await loadHabits();
    render();
  } catch (error) {
    saveToken('');
    state.user = null;
    setUserUI(null);
    showAuth(true);
    switchMode(false);
  }
}

async function doSignup() {
  const email = $('authEmail')?.value.trim();
  const username = $('authUsername')?.value.trim();
  const password = $('authPassword')?.value || '';
  const confirm = $('authConfirmPassword')?.value || '';

  if (!username) return setMessage('Please enter a username.');
  if (!email) return setMessage('Please enter your email.');
  if (password.length < 4) return setMessage('Password must be at least 4 characters.');
  if (password !== confirm) return setMessage('Passwords do not match.');

  try {
    const data = await apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    saveToken(data.token);
    state.user = data.user;
    setUserUI(data.user);
    showAuth(false);
    await loadHabits();
    render();
    setMessage('', false);
  } catch (error) {
    setMessage(error.message || 'Signup failed.');
  }
}

async function doLogin() {
  const email = $('authEmail')?.value.trim();
  const password = $('authPassword')?.value || '';

  if (!email || !password) return setMessage('Please enter your email and password.');

  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    saveToken(data.token);
    state.user = data.user;
    setUserUI(data.user);
    showAuth(false);
    await loadHabits();
    render();
    setMessage('', false);
  } catch (error) {
    setMessage(error.message || 'Login failed.');
  }
}

async function doForgotPassword() {
  const email = window.prompt('Enter the email address you used when you signed up:');
  if (!email) return;

  const password = window.prompt('Enter your new password (at least 4 characters):');
  if (password === null) return;

  const confirm = window.prompt('Re-enter your new password:');
  if (confirm === null) return;

  try {
    const data = await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email, password, confirmPassword: confirm }),
    });
    setMessage(data.message || 'Password updated successfully.', true);
    if ($('authEmail')) $('authEmail').value = email;
    if ($('authPassword')) $('authPassword').value = '';
    switchMode(false);
  } catch (error) {
    setMessage(error.message || 'Password reset failed.');
  }
}

function doLogout() {
  saveToken('');
  state.user = null;
  state.habits = [];
  setUserUI(null);
  showAuth(true);
  switchMode(false);
  if ($('authEmail')) $('authEmail').value = '';
  if ($('authPassword')) $('authPassword').value = '';
  if ($('authUsername')) $('authUsername').value = '';
  if ($('authConfirmPassword')) $('authConfirmPassword').value = '';
  $('authEmail')?.focus();
  render();
}

async function loadHabits() {
  if (!state.token) {
    state.habits = [];
    return;
  }

  try {
    const data = await apiRequest('/habits');
    state.habits = Array.isArray(data.habits) ? data.habits : [];
  } catch (error) {
    state.habits = [];
  }
}

function scheduled(habit) {
  return (habit.days || []).includes(new Date().getDay());
}

function done(habit, targetDate = today()) {
  return !!(habit.completions || {})[targetDate];
}

async function toggleHabitById(habitId) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) return;

  try {
    const res = await apiRequest(`/habits/${habitId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ date: today() }),
    });
    const updated = res.habit;
    state.habits = state.habits.map((item) => (item.id === habitId ? updated : item));
    render();
    toast(updated.completions && updated.completions[today()] ? 'Habit completed!' : 'Habit unchecked.');
  } catch (error) {
    toast(error.message || 'Unable to update habit.');
  }
}

function streak(habit) {
  let count = 0;
  let day = new Date();
  while (done(habit, dateKey(day))) {
    count += 1;
    day.setDate(day.getDate() - 1);
  }
  return count;
}

function bestStreak(habit) {
  const dates = Object.keys(habit.completions || {}).filter((date) => habit.completions[date]).sort();
  let best = 0;
  let current = 0;
  let previous = null;

  for (const date of dates) {
    if (!previous) {
      current = 1;
    } else {
      const prevDate = new Date(`${previous}T00:00:00`);
      const currDate = new Date(`${date}T00:00:00`);
      const diffDays = (currDate - prevDate) / 86400000;
      current = diffDays === 1 ? current + 1 : 1;
    }
    best = Math.max(best, current);
    previous = date;
  }

  return best;
}

function render() {
  if (!state.user) {
    return;
  }

  const todayHabits = state.habits.filter((habit) => scheduled(habit));
  const completedToday = todayHabits.filter((habit) => done(habit)).length;
  const totalHabits = state.habits.length;
  const totalCompletions = state.habits.reduce((total, habit) => total + Object.values(habit.completions || {}).filter(Boolean).length, 0);
  const best = state.habits.reduce((max, habit) => Math.max(max, bestStreak(habit)), 0);

  $('currentDate').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  $('todayProgress').textContent = `${pct(completedToday, todayHabits.length)}%`;
  $('completedToday').textContent = `${completedToday} / ${todayHabits.length}`;
  $('totalHabits').textContent = String(totalHabits);
  $('bestStreak').textContent = `${best} days`;
  $('progressBestStreak').textContent = `${best} days`;
  $('activeHabits').textContent = String(totalHabits);
  $('totalCompletions').textContent = String(totalCompletions);
  $('averageCompletion').textContent = `${weekly()}%`;

  renderToday(todayHabits);
  renderAll();
  renderCharts();
  renderHistory();
  $('weeklyCompletion').textContent = `${weekly()}%`;
}

function renderToday(list) {
  const box = $('todayHabits');
  const empty = $('emptyToday');
  box.innerHTML = '';
  empty.classList.toggle('show', list.length === 0);

  list.forEach((habit) => {
    const item = document.createElement('div');
    item.className = 'habit-item';
    item.innerHTML = `
      <div class="habit-icon">${esc(habit.icon || '✓')}</div>
      <div class="habit-info">
        <h3>${esc(habit.name)}</h3>
        <p>${esc(habit.category)} • 🔥 ${streak(habit)} day streak</p>
      </div>
      <button class="check-btn ${done(habit) ? 'completed' : ''}" onclick="toggleHabitById('${habit.id}')">${done(habit) ? '✓' : ''}</button>
    `;
    box.appendChild(item);
  });
}

function renderAll() {
  const box = $('allHabits');
  const empty = $('emptyAll');
  const list = state.filter === 'all' ? state.habits : state.habits.filter((habit) => habit.category === state.filter);
  box.innerHTML = '';
  empty.classList.toggle('show', list.length === 0);

  list.forEach((habit) => {
    const item = document.createElement('div');
    item.className = 'habit-card';
    item.innerHTML = `
      <div class="habit-card-top">
        <div class="habit-card-icon">${esc(habit.icon || '✓')}</div>
        <span class="category">${esc(habit.category)}</span>
      </div>
      <h3>${esc(habit.name)}</h3>
      <p>${habit.days.length === 7 ? 'Every day' : `${habit.days.length} days per week`}</p>
      <div class="card-footer">
        <span class="streak">🔥 ${streak(habit)} day streak</span>
        <div class="card-actions">
          <button class="icon-btn" onclick="editHabit('${habit.id}')">✎</button>
          <button class="icon-btn" onclick="deleteHabit('${habit.id}')">×</button>
          <button class="check-btn ${done(habit) ? 'completed' : ''}" onclick="toggleHabitById('${habit.id}')">${done(habit) ? '✓' : ''}</button>
        </div>
      </div>
    `;
    box.appendChild(item);
  });
}

function renderCharts() {
  const data = weekData();
  $('weekChart').innerHTML = data.map((entry) => `
    <div class="day-column">
      <div class="day-bar-container"><div class="day-bar" style="height:${entry.p}%"></div></div>
      <span class="day-label">${entry.label}</span>
    </div>
  `).join('');

  $('largeWeekChart').innerHTML = data.map((entry) => `
    <div class="large-day">
      <div class="large-bar-container"><div class="large-bar" style="height:${entry.p}%"></div></div>
      <span>${entry.label}</span>
    </div>
  `).join('');
}

function weekData() {
  const result = [];
  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    const dayKey = dateKey(date);
    const eligible = state.habits.filter((habit) => (habit.days || []).includes(date.getDay()));
    const doneCount = eligible.filter((habit) => done(habit, dayKey)).length;
    result.push({
      label: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
      p: pct(doneCount, eligible.length),
    });
  }
  return result;
}

function weekly() {
  const data = weekData();
  return pct(data.reduce((sum, item) => sum + item.p, 0), data.length * 100);
}

function renderHistory() {
  const records = [];
  state.habits.forEach((habit) => {
    Object.keys(habit.completions || {}).forEach((date) => {
      if (habit.completions[date]) {
        records.push({ habit, date });
      }
    });
  });

  records.sort((a, b) => b.date.localeCompare(a.date));
  const box = $('historyList');
  const empty = $('emptyHistory');
  box.innerHTML = '';
  empty.classList.toggle('show', records.length === 0);

  records.slice(0, 30).forEach(({ habit, date }) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-icon">✓</div>
      <div class="history-info">
        <strong>${esc(habit.name)}</strong>
        <span>${esc(habit.icon)} ${esc(habit.category)}</span>
      </div>
      <span class="history-date">${date === today() ? 'Today' : formatDate(date)}</span>
    `;
    box.appendChild(item);
  });
}

function toast(message) {
  const toastEl = $('toast');
  const text = $('toastMessage');
  if (!toastEl || !text) return;
  text.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function nav(section) {
  state.activeSection = section;
  document.querySelectorAll('.page-section').forEach((panel) => {
    panel.classList.toggle('active', panel.id === section);
  });
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.section === section);
  });
  if (location.hash !== `#${section}`) location.hash = section;
  const sideBar = $('sidebar');
  if (sideBar) sideBar.classList.remove('open');
}

async function saveHabit(habitData) {
  if (!state.user) return;

  try {
    let response;
    if (habitData.id) {
      response = await apiRequest(`/habits/${habitData.id}`, {
        method: 'PUT',
        body: JSON.stringify(habitData),
      });
      state.habits = state.habits.map((habit) => (habit.id === habitData.id ? response.habit : habit));
    } else {
      response = await apiRequest('/habits', {
        method: 'POST',
        body: JSON.stringify(habitData),
      });
      state.habits.push(response.habit);
    }
    render();
    toast(habitData.id ? 'Habit updated!' : 'Habit created!');
  } catch (error) {
    toast(error.message || 'Unable to save habit.');
  }
}

async function deleteHabit(habitId) {
  if (!confirm('Delete this habit?')) return;

  try {
    await apiRequest(`/habits/${habitId}`, { method: 'DELETE' });
    state.habits = state.habits.filter((habit) => habit.id !== habitId);
    render();
    toast('Habit deleted.');
  } catch (error) {
    toast(error.message || 'Unable to delete habit.');
  }
}

function openModal(habit = null) {
  $('habitModal').classList.add('show');
  $('modalTitle').textContent = habit ? 'Edit Habit' : 'Create a Habit';
  $('habitId').value = habit?.id || '';
  $('habitName').value = habit?.name || '';
  $('habitCategory').value = habit?.category || 'personal';
  $('habitIcon').value = habit?.icon || '✓';
  document.querySelectorAll('.day-checkbox').forEach((checkbox) => {
    checkbox.checked = habit ? (habit.days || []).includes(Number(checkbox.value)) : [1, 2, 3, 4, 5].includes(Number(checkbox.value));
  });
  $('habitName').focus();
}

function closeModal() {
  $('habitModal').classList.remove('show');
}

function editHabit(habitId) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (habit) openModal(habit);
}

function setup() {
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      nav(link.dataset.section);
    });
  });

  document.querySelectorAll('[data-section-link]').forEach((element) => {
    element.addEventListener('click', () => nav(element.dataset.sectionLink));
  });

  [$('openAddHabit'), $('openAddHabit2'), $('emptyAddHabit')].forEach((button) => button?.addEventListener('click', () => openModal()));
  $('closeModal').onclick = closeModal;
  $('cancelModal').onclick = closeModal;
  $('habitModal').addEventListener('click', (event) => { if (event.target.id === 'habitModal') closeModal(); });

  $('habitForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = $('habitName').value.trim();
    const days = [...document.querySelectorAll('.day-checkbox:checked')].map((box) => Number(box.value));
    if (!name || !days.length) {
      alert('Enter a habit name and select at least one day.');
      return;
    }

    const habitData = {
      id: $('habitId').value || null,
      name,
      category: $('habitCategory').value,
      icon: $('habitIcon').value,
      days,
      completions: {}
    };

    const existing = state.habits.find((habit) => habit.id === habitData.id);
    if (existing) {
      habitData.completions = existing.completions || {};
    }

    await saveHabit(habitData);
    closeModal();
  });

  document.querySelectorAll('.filter-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach((target) => target.classList.remove('active'));
      button.classList.add('active');
      state.filter = button.dataset.filter;
      renderAll();
    });
  });

  $('themeBtn').onclick = () => {
    document.body.classList.toggle('dark');
    const dark = document.body.classList.contains('dark');
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    $('themeText').textContent = dark ? 'Light Mode' : 'Dark Mode';
  };

  $('menuBtn').onclick = () => $('sidebar').classList.toggle('open');
  $('authForm').addEventListener('submit', (event) => {
    event.preventDefault();
    if (event.currentTarget.dataset.mode === 'signup') doSignup();
    else doLogin();
  });
  $('authSwitch').addEventListener('click', (event) => {
    event.preventDefault();
    switchMode($('authForm').dataset.mode !== 'signup');
  });
  $('forgotPassword').addEventListener('click', doForgotPassword);
  $('sidebarLogout').addEventListener('click', doLogout);

  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    $('themeText').textContent = 'Light Mode';
  }

  if (location.hash) nav(location.hash.slice(1));

  initializeAuth();
}

document.addEventListener('DOMContentLoaded', setup);
