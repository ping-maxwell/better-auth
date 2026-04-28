export const forgotPasswordScript = `
(function() {
  var config = window.__BA_CONFIG__ || {};
  var apiBase = config.apiBaseUrl || '';

  var form = document.getElementById('forgotPasswordForm');
  var errorEl = document.getElementById('ba-error');
  var successEl = document.getElementById('ba-success');
  var submitBtn = document.getElementById('submitBtn');

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
        ? '<span class="ba-loading"></span> Sending...'
        : 'Send reset link';
    }
  }

  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      hideMessages();
      setLoading(true);

      var email = document.getElementById('email').value;

      fetch(apiBase + '/forget-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email, redirectTo: window.location.origin + '/reset-password' })
      })
      .then(function(response) {
        return response.json().then(function(data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function(result) {
        if (!result.ok) {
          throw new Error(result.data.message || 'Failed to send reset link');
        }
        showSuccess('If an account exists with this email, you will receive a password reset link.');
        form.reset();
      })
      .catch(function(err) {
        showError(err.message || 'An error occurred. Please try again.');
      })
      .finally(function() {
        setLoading(false);
      });
    });
  }
})();
`;
