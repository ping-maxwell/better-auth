/**
 * Client-side script for the sign-in page.
 * This is inlined into the HTML.
 */
export const signInScript = `
(function() {
  var config = window.__BA_CONFIG__ || {};
  var apiBase = config.apiBaseUrl || '';
  var redirectTo = config.redirectTo || '/';

  var form = document.getElementById('signInForm');
  var errorEl = document.getElementById('ba-error');
  var submitBtn = document.getElementById('submitBtn');

  function showError(message) {
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
  }

  function hideError() {
    if (errorEl) {
      errorEl.classList.remove('visible');
    }
  }

  function setLoading(loading) {
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.innerHTML = loading
        ? '<span class="ba-loading"></span> Signing in...'
        : 'Sign in';
    }
  }

  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      hideError();
      setLoading(true);

      var email = document.getElementById('email').value;
      var password = document.getElementById('password').value;
      var rememberEl = document.getElementById('rememberMe');
      var rememberMe = rememberEl ? rememberEl.checked : false;

      fetch(apiBase + '/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email, password: password, rememberMe: rememberMe })
      })
      .then(function(response) {
        return response.json().then(function(data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function(result) {
        if (!result.ok) {
          throw new Error(result.data.message || 'Sign in failed');
        }
        window.location.href = redirectTo;
      })
      .catch(function(err) {
        showError(err.message || 'An error occurred. Please try again.');
        setLoading(false);
      });
    });
  }

  // Passkey sign in
  window.signInWithPasskey = function() {
    if (!window.PublicKeyCredential) {
      showError('Passkeys are not supported in this browser');
      return;
    }

    fetch(apiBase + '/passkey/generate-authenticate-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    })
    .then(function(res) { return res.json(); })
    .then(function(options) {
      return navigator.credentials.get({ publicKey: options });
    })
    .then(function(credential) {
      return fetch(apiBase + '/passkey/verify-authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credential)
      });
    })
    .then(function(res) {
      if (res.ok) {
        window.location.href = redirectTo;
      } else {
        return res.json().then(function(data) {
          throw new Error(data.message || 'Passkey authentication failed');
        });
      }
    })
    .catch(function(err) {
      showError(err.message || 'Passkey authentication failed');
    });
  };
})();
`;
