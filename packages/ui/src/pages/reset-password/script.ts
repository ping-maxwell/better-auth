export const resetPasswordScript = `
(function() {
  var config = window.__BA_CONFIG__ || {};
  var apiBase = config.apiBaseUrl || '';
  var signInUrl = config.signInUrl || './sign-in';

  var form = document.getElementById('resetPasswordForm');
  var errorEl = document.getElementById('ba-error');
  var successEl = document.getElementById('ba-success');
  var submitBtn = document.getElementById('submitBtn');

  // Get token from URL
  var urlParams = new URLSearchParams(window.location.search);
  var token = urlParams.get('token');

  if (!token) {
    if (errorEl) {
      errorEl.textContent = 'Invalid or missing reset token. Please request a new password reset link.';
      errorEl.classList.add('visible');
    }
    if (form) form.style.display = 'none';
  }

  function showError(message) {
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
    if (successEl) successEl.classList.remove('visible');
  }

  function showSuccess(message) {
    if (successEl) {
      successEl.textContent = message;
      successEl.classList.add('visible');
    }
    if (errorEl) errorEl.classList.remove('visible');
  }

  function hideMessages() {
    if (errorEl) errorEl.classList.remove('visible');
    if (successEl) successEl.classList.remove('visible');
  }

  function setLoading(loading) {
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.innerHTML = loading
        ? '<span class="ba-loading"></span> Resetting...'
        : 'Reset password';
    }
  }

  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      hideMessages();

      var newPassword = document.getElementById('newPassword').value;
      var confirmPassword = document.getElementById('confirmPassword').value;

      if (newPassword !== confirmPassword) {
        showError('Passwords do not match');
        return;
      }

      setLoading(true);

      fetch(apiBase + '/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: token, newPassword: newPassword })
      })
      .then(function(response) {
        return response.json().then(function(data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function(result) {
        if (!result.ok) {
          throw new Error(result.data.message || 'Failed to reset password');
        }
        showSuccess('Password reset successfully! Redirecting to sign in...');
        form.reset();
        setTimeout(function() {
          window.location.href = signInUrl;
        }, 2000);
      })
      .catch(function(err) {
        showError(err.message || 'An error occurred. Please try again.');
        setLoading(false);
      });
    });
  }
})();
`;
