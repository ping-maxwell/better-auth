export const verifyEmailScript = `
(function() {
  var config = window.__BA_CONFIG__ || {};
  var apiBase = config.apiBaseUrl || '';
  var redirectTo = config.redirectTo || '/';
  var signInUrl = config.signInUrl || './sign-in';

  var statusIcon = document.getElementById('statusIcon');
  var statusTitle = document.getElementById('statusTitle');
  var statusMessage = document.getElementById('statusMessage');
  var actionBtn = document.getElementById('actionBtn');

  // Get token from URL
  var urlParams = new URLSearchParams(window.location.search);
  var token = urlParams.get('token');

  function showStatus(type, title, message) {
    statusIcon.className = 'ba-status-icon ' + type;
    statusIcon.innerHTML = type === 'loading'
      ? '<span class="ba-loading" style="width:2rem;height:2rem;border-width:3px;"></span>'
      : type === 'success'
        ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>';
    statusTitle.textContent = title;
    statusMessage.textContent = message;
  }

  if (!token) {
    showStatus('error', 'Invalid Link', 'The verification link is invalid or has expired.');
    actionBtn.textContent = 'Go to Sign In';
    actionBtn.onclick = function() { window.location.href = signInUrl; };
    actionBtn.style.display = 'block';
  } else {
    fetch(apiBase + '/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token: token })
    })
    .then(function(response) {
      return response.json().then(function(data) {
        return { ok: response.ok, data: data };
      });
    })
    .then(function(result) {
      if (!result.ok) {
        throw new Error(result.data.message || 'Verification failed');
      }
      showStatus('success', 'Email Verified', 'Your email has been verified successfully.');
      actionBtn.textContent = 'Continue';
      actionBtn.onclick = function() { window.location.href = redirectTo; };
      actionBtn.style.display = 'block';
    })
    .catch(function(err) {
      showStatus('error', 'Verification Failed', err.message || 'Unable to verify your email. The link may have expired.');
      actionBtn.textContent = 'Go to Sign In';
      actionBtn.onclick = function() { window.location.href = signInUrl; };
      actionBtn.style.display = 'block';
    });
  }
})();
`;
