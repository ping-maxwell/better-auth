export const signUpScript = `
(function() {
  var config = window.__BA_CONFIG__ || {};
  var apiBase = config.apiBaseUrl || '';
  var redirectTo = config.redirectTo || '/';
  var requireEmailVerification = config.requireEmailVerification || false;

  var form = document.getElementById('signUpForm');
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
        ? '<span class="ba-loading"></span> Creating account...'
        : 'Create account';
    }
  }

  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      hideMessages();

      var name = document.getElementById('name').value;
      var email = document.getElementById('email').value;
      var password = document.getElementById('password').value;
      var confirmPassword = document.getElementById('confirmPassword').value;

      if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
      }

      setLoading(true);

      fetch(apiBase + '/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name, email: email, password: password })
      })
      .then(function(response) {
        return response.json().then(function(data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function(result) {
        if (!result.ok) {
          throw new Error(result.data.message || 'Sign up failed');
        }
        if (requireEmailVerification) {
          showSuccess('Account created! Please check your email to verify your account.');
          form.reset();
          setLoading(false);
        } else {
          window.location.href = redirectTo;
        }
      })
      .catch(function(err) {
        showError(err.message || 'An error occurred. Please try again.');
        setLoading(false);
      });
    });
  }
})();
`;
