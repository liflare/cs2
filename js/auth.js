(function() {
  const PASS = "c7z06";
  const STORAGE_KEY = "cs2_team_unlocked";

  if (localStorage.getItem(STORAGE_KEY) === "true") return;

  // Прячем содержимое страницы до ввода пароля
  document.documentElement.style.overflow = "hidden";

  window.addEventListener("DOMContentLoaded", () => {
    const overlay = document.createElement("div");
    overlay.id = "auth-overlay";
    overlay.style.cssText = `
      position: fixed; inset: 0; background: #0f1115; z-index: 999999;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: sans-serif; color: #fff; padding: 20px;
    `;

    overlay.innerHTML = `
      <div style="background: #181b20; border: 1px solid #2c313a; padding: 30px; border-radius: 12px; width: 100%; max-width: 320px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <h2 style="margin: 0 0 10px 0; font-size: 20px;">🔒 Закрытый доступ</h2>
        <p style="margin: 0 0 20px 0; font-size: 13px; color: #8a94a6;">Введите командный код доступа</p>
        <input type="password" id="auth-input" placeholder="Пароль..." style="width: 100%; padding: 12px; border-radius: 6px; border: 1px solid #383e4a; background: #0f1115; color: #fff; font-size: 16px; box-sizing: border-box; text-align: center; margin-bottom: 12px;">
        <button id="auth-submit" style="width: 100%; padding: 12px; border: none; border-radius: 6px; background: #2ecc71; color: #fff; font-weight: bold; font-size: 15px; cursor: pointer;">Войти</button>
        <div id="auth-error" style="color: #e74c3c; font-size: 13px; margin-top: 10px; display: none;">Неверный пароль!</div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = document.getElementById("auth-input");
    const btn = document.getElementById("auth-submit");
    const err = document.getElementById("auth-error");

    function checkPass() {
      if (input.value.trim() === PASS) {
        localStorage.setItem(STORAGE_KEY, "true");
        document.documentElement.style.overflow = "";
        overlay.remove();
      } else {
        err.style.display = "block";
        input.style.borderColor = "#e74c3c";
      }
    }

    btn.addEventListener("click", checkPass);
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") checkPass();
    });
    input.focus();
  });
})();
