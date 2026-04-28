export const profileScript = `
(function() {
  var config = window.__BA_CONFIG__ || {};
  var apiBase = config.apiBaseUrl || '';
  var signInUrl = config.signInUrl || './sign-in';

  var avatarEl = document.getElementById('avatar');
  var nameDisplayEl = document.getElementById('nameDisplay');
  var emailDisplayEl = document.getElementById('emailDisplay');
  var loadingEl = document.getElementById('loading');
  var contentEl = document.getElementById('content');
  var errorEl = document.getElementById('ba-error');

  var nameForm = document.getElementById('nameForm');
  var passwordForm = document.getElementById('passwordForm');
  var signOutBtn = document.getElementById('signOutBtn');

  function showError(message) {
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
  }

  function hideError() {
    if (errorEl) errorEl.classList.remove('visible');
  }

  function showContent() {
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(function(n) { return n[0]; }).slice(0, 2).join('').toUpperCase();
  }

  // Load user session
  fetch(apiBase + '/get-session', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  })
  .then(function(res) {
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  })
  .then(function(data) {
    var user = data.user;
    if (!user) throw new Error('Not authenticated');

    if (avatarEl) {
      if (user.image) {
        avatarEl.innerHTML = '<img src="' + user.image + '" alt="Avatar">';
      } else {
        avatarEl.textContent = getInitials(user.name);
      }
    }
    if (nameDisplayEl) nameDisplayEl.textContent = user.name || 'User';
    if (emailDisplayEl) emailDisplayEl.textContent = user.email;

    var nameInput = document.getElementById('name');
    if (nameInput) nameInput.value = user.name || '';

    showContent();
  })
  .catch(function(err) {
    window.location.href = signInUrl;
  });

  // Update name
  if (nameForm) {
    nameForm.addEventListener('submit', function(e) {
      e.preventDefault();
      hideError();
      var btn = nameForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="ba-loading"></span> Saving...';

      var name = document.getElementById('name').value;

      fetch(apiBase + '/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name })
      })
      .then(function(res) {
        if (!res.ok) return res.json().then(function(d) { throw new Error(d.message); });
        return res.json();
      })
      .then(function() {
        if (nameDisplayEl) nameDisplayEl.textContent = name;
        btn.innerHTML = 'Save changes';
        btn.disabled = false;
      })
      .catch(function(err) {
        showError(err.message || 'Failed to update profile');
        btn.innerHTML = 'Save changes';
        btn.disabled = false;
      });
    });
  }

  // Change password
  if (passwordForm) {
    passwordForm.addEventListener('submit', function(e) {
      e.preventDefault();
      hideError();

      var currentPassword = document.getElementById('currentPassword').value;
      var newPassword = document.getElementById('newPassword').value;
      var confirmPassword = document.getElementById('confirmNewPassword').value;

      if (newPassword !== confirmPassword) {
        showError('New passwords do not match');
        return;
      }

      var btn = passwordForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="ba-loading"></span> Changing...';

      fetch(apiBase + '/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: currentPassword, newPassword: newPassword })
      })
      .then(function(res) {
        if (!res.ok) return res.json().then(function(d) { throw new Error(d.message); });
        return res.json();
      })
      .then(function() {
        passwordForm.reset();
        btn.innerHTML = 'Change password';
        btn.disabled = false;
        alert('Password changed successfully');
      })
      .catch(function(err) {
        showError(err.message || 'Failed to change password');
        btn.innerHTML = 'Change password';
        btn.disabled = false;
      });
    });
  }

  // Sign out
  if (signOutBtn) {
    signOutBtn.addEventListener('click', function() {
      fetch(apiBase + '/sign-out', {
        method: 'POST',
        credentials: 'include'
      })
      .then(function() {
        window.location.href = signInUrl;
      })
      .catch(function() {
        window.location.href = signInUrl;
      });
    });
  }
})();
`;
