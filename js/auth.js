// Clerk auth gate for the static Leaflet app (CDN SDK, no bundler).
class AuthGate {
  constructor({ publishableKey, onAuthenticated, onSignedOut }) {
    this.publishableKey = publishableKey;
    this.onAuthenticated = onAuthenticated;
    this.onSignedOut = onSignedOut;
    this.appStarted = false;
    this.clerk = null;
    // 'unknown' | 'signed-out' | 'signed-in'
    // Avoid remounting SignIn on every listener tick (breaks #/factor-one).
    this.uiState = 'unknown';
  }

  deriveFrontendApi(publishableKey) {
    const encoded = publishableKey.split('_')[2];
    if (!encoded) throw new Error('CLERK_PUBLISHABLE_KEY inválida');
    return atob(encoded).slice(0, -1);
  }

  loadScript(src, attrs = {}) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === 'true') return resolve();
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      Object.entries(attrs).forEach(([key, value]) => script.setAttribute(key, value));
      script.onload = () => {
        script.dataset.loaded = 'true';
        resolve();
      };
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  async init() {
    if (!this.publishableKey || this.publishableKey.includes('YOUR_')) {
      this.showConfigError(
        'Falta CLERK_PUBLISHABLE_KEY. Pegala en js/clerk-config.js (Dashboard → API Keys).'
      );
      return;
    }

    const fapi = this.deriveFrontendApi(this.publishableKey);

    await this.loadScript(`https://${fapi}/npm/@clerk/ui@1/dist/ui.browser.js`);
    await this.loadScript(
      `https://${fapi}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,
      { 'data-clerk-publishable-key': this.publishableKey }
    );

    if (typeof window.Clerk === 'undefined') {
      this.showConfigError('No se pudo cargar Clerk. Revisá la publishable key y el origen permitido.');
      return;
    }

    this.clerk = window.Clerk;
    await this.clerk.load({
      ui: { ClerkUI: window.__internal_ClerkUICtor },
    });

    this.clerk.addListener(({ user }) => {
      if (user) {
        if (this.uiState !== 'signed-in') this.showAuthenticated();
      } else if (this.uiState !== 'signed-out') {
        this.showSignedOut();
      }
    });

    if (this.clerk.isSignedIn) this.showAuthenticated();
    else this.showSignedOut();
  }

  setLoading(visible) {
    const loading = document.getElementById('auth-loading');
    if (loading) loading.hidden = !visible;
  }

  showConfigError(message) {
    this.uiState = 'unknown';
    const gate = document.getElementById('auth-gate');
    const signIn = document.getElementById('clerk-sign-in');
    const err = document.getElementById('auth-gate-error');
    this.setLoading(false);
    if (gate) gate.hidden = false;
    if (signIn) signIn.hidden = true;
    if (err) {
      err.hidden = false;
      err.textContent = message;
    }
    document.body.classList.add('auth-locked');
  }

  showSignedOut() {
    const wasSignedIn = this.uiState === 'signed-in';
    this.uiState = 'signed-out';
    document.body.classList.add('auth-locked');

    const gate = document.getElementById('auth-gate');
    const signInHost = document.getElementById('clerk-sign-in');
    const userButton = document.getElementById('clerk-user-button');
    const err = document.getElementById('auth-gate-error');

    this.setLoading(false);
    if (err) err.hidden = true;
    if (gate) gate.hidden = false;

    if (userButton) {
      userButton.replaceChildren();
      userButton.hidden = true;
    }

    // Only (re)mount SignIn on first paint or after a real sign-out.
    // Remounting mid-flow (#/factor-one) wipes the password / OTP step.
    if (signInHost && (!signInHost.dataset.mounted || wasSignedIn)) {
      signInHost.hidden = false;
      signInHost.replaceChildren();
      this.clerk.mountSignIn(signInHost, {
        routing: 'hash',
        // Google / SSO buttons appear automatically when enabled in Dashboard.
      });
      signInHost.dataset.mounted = 'true';
    } else if (signInHost) {
      signInHost.hidden = false;
    }

    if (wasSignedIn && typeof this.onSignedOut === 'function') this.onSignedOut();
  }

  showAuthenticated() {
    this.uiState = 'signed-in';
    document.body.classList.remove('auth-locked');
    const gate = document.getElementById('auth-gate');
    const signInHost = document.getElementById('clerk-sign-in');
    const userButton = document.getElementById('clerk-user-button');

    this.setLoading(false);
    if (gate) gate.hidden = true;
    if (signInHost) {
      signInHost.replaceChildren();
      signInHost.hidden = true;
      delete signInHost.dataset.mounted;
    }
    if (userButton) {
      userButton.hidden = false;
      userButton.replaceChildren();
      this.clerk.mountUserButton(userButton);
    }

    if (!this.appStarted) {
      this.appStarted = true;
      if (typeof this.onAuthenticated === 'function') this.onAuthenticated();
    }
  }
}

window.AuthGate = AuthGate;
