function updateThemeButton() {
  const button = document.getElementById('theme-toggle');
  if (button) button.textContent = document.body.classList.contains('light') ? '☾ nuit' : '☀ jour';
}

function initTheme() {
  if (localStorage.getItem('izmir-theme') === 'light') {
    document.body.classList.add('light');
  }
  updateThemeButton();

  const button = document.getElementById('theme-toggle');
  if (button && !button.hasAttribute('onclick')) {
    button.addEventListener('click', toggleTheme);
  }
}

/* Theme toggle button */
function toggleTheme(){
  const body = document.body;
  const isLight = body.classList.toggle('light');
  localStorage.setItem('izmir-theme', isLight ? 'light' : 'dark');
  updateThemeButton();
}

document.addEventListener("DOMContentLoaded", async () => {
  initTheme();

  const headerSlot = document.getElementById("site-header");
  if (!headerSlot) return;

  try {
    const res = await fetch("/header.html");
    const html = await res.text();

    headerSlot.innerHTML = html;

    // highlight active page AFTER injection
    const page = location.pathname.split('/').pop().replace('.html', '');
    const link = document.querySelector(
      '#site-header [data-page="' + page + '"]'
    );

    if (link) link.classList.add('active');

    updateThemeButton();

  } catch (err) {
    console.error("Erreur chargement header :", err);
  }
});

