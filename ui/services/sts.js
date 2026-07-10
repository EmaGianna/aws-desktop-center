import { invoke, state, icon, showAlert, showPrompt, formatError } from './shared.js';

export async function renderSts() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading STS...</div>';
  try {
    const identity = await invoke('sts_get_caller_identity', { profile: state.profile });
    content.innerHTML = `<h2 class="panel-title">${icon('profile', 'icon-md')} STS</h2>
      <div class="dynamo-detail-grid">
        <div class="dynamo-info-card">
          <h3>Caller Identity</h3>
          <div class="dynamo-info-row"><span class="dynamo-label">Account</span><span class="dynamo-value">${identity.account}</span></div>
          <div class="dynamo-info-row"><span class="dynamo-label">ARN</span><span class="dynamo-value" style="font-size:0.7rem;word-break:break-all">${identity.arn}</span></div>
          <div class="dynamo-info-row"><span class="dynamo-label">User ID</span><span class="dynamo-value" style="font-size:0.7rem">${identity.user_id}</span></div>
        </div>
      </div>
      <div class="s3-toolbar" style="margin:1rem 0">
        <button class="s3-toolbar-btn" id="sts-assume-btn">Assume Role</button>
        <button class="s3-toolbar-btn" id="sts-session-btn">Get Session Token</button>
      </div>
      <div id="sts-result"></div>`;

    document.getElementById('sts-assume-btn').onclick = async () => {
      const roleArn = await showPrompt('Assume Role', 'Role ARN:', '');
      if (!roleArn) return;
      const sessionName = await showPrompt('Assume Role', 'Session name:', 'aws-desktop-center-session');
      if (!sessionName) return;
      try {
        const creds = await invoke('sts_assume_role', { profile: state.profile, roleArn, sessionName });
        renderCredentials(creds);
      } catch (e) { showAlert('Error', e); }
    };

    document.getElementById('sts-session-btn').onclick = async () => {
      const duration = await showPrompt('Get Session Token', 'Duration (seconds, 900-129600):', '3600');
      if (!duration) return;
      try {
        const creds = await invoke('sts_get_session_token', { profile: state.profile, durationSeconds: parseInt(duration, 10) });
        renderCredentials(creds);
      } catch (e) { showAlert('Error', e); }
    };
  } catch (e) { content.innerHTML = formatError(e); }
}

function renderCredentials(creds) {
  document.getElementById('sts-result').innerHTML = `
    <div class="dynamo-info-card">
      <h3>Temporary Credentials</h3>
      <div class="dynamo-info-row"><span class="dynamo-label">Access Key ID</span><span class="dynamo-value" style="font-size:0.7rem">${creds.access_key_id}</span></div>
      <div class="dynamo-info-row"><span class="dynamo-label">Secret Access Key</span><span class="dynamo-value" style="font-size:0.7rem;word-break:break-all">${creds.secret_access_key}</span></div>
      <div class="dynamo-info-row"><span class="dynamo-label">Session Token</span><span class="dynamo-value" style="font-size:0.6rem;word-break:break-all">${creds.session_token}</span></div>
      <div class="dynamo-info-row"><span class="dynamo-label">Expiration</span><span class="dynamo-value">${creds.expiration}</span></div>
    </div>`;
}
