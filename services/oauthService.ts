// OAuth service for handling GitHub and OAuth.io authentication
import { getEnvironment } from '../config/environment';
import type { SocialProvider, User } from '../types';

export interface OAuthConfig {
  github: {
    clientId: string;
    enabled: boolean;
  };
  oauthIo: {
    publicKey: string;
    enabled: boolean;
  };
}

export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: SocialProvider;
}

class OAuthService {
  private config: OAuthConfig;

  constructor() {
    const env = getEnvironment();
    this.config = env.oauth;
  }

  /**
   * Get OAuth configuration
   */
  getConfig(): OAuthConfig {
    return this.config;
  }

  /**
   * Check if a provider is enabled
   */
  isProviderEnabled(provider: SocialProvider): boolean {
    switch (provider) {
      case 'google':
        return this.config.oauthIo.enabled;
      case 'facebook':
        return this.config.oauthIo.enabled;
      default:
        return false;
    }
  }

  /**
   * Initiate GitHub OAuth flow
   */
  async initiateGitHubAuth(): Promise<void> {
    if (!this.config.github.enabled) {
      throw new Error('GitHub OAuth is not configured');
    }

    const params = new URLSearchParams({
      client_id: this.config.github.clientId,
      redirect_uri: `${window.location.origin}/auth/github/callback`,
      scope: 'user:email',
      state: this.generateState(),
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    window.location.href = authUrl;
  }

  /**
   * Handle GitHub OAuth callback
   */
  async handleGitHubCallback(code: string, state: string): Promise<OAuthUserInfo> {
    if (!this.validateState(state)) {
      throw new Error('Invalid OAuth state parameter');
    }

    // In a real implementation, this would exchange the code for an access token
    // via your backend service, then fetch user info
    // For now, we'll simulate the response
    
    try {
      // This would typically be done on your backend to keep the client secret secure
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.config.github.clientId,
          client_secret: process.env.GITHUB_CLIENT_SECRET, // This should be on backend
          code,
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        throw new Error(`GitHub OAuth error: ${tokenData.error_description}`);
      }

      // Fetch user info with the access token
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      const userData = await userResponse.json();

      // Fetch user email (might be private)
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      const emailData = await emailResponse.json();
      const primaryEmail = emailData.find((email: any) => email.primary)?.email || userData.email;

      return {
        id: userData.id.toString(),
        email: primaryEmail,
        name: userData.name || userData.login,
        avatar: userData.avatar_url,
        provider: 'google', // Using 'google' as the closest match for GitHub in our types
      };
    } catch (error) {
      console.error('GitHub OAuth error:', error);
      throw new Error('Failed to authenticate with GitHub');
    }
  }

  /**
   * Initiate OAuth.io flow for Google/Facebook
   */
  async initiateOAuthIo(provider: 'google' | 'facebook'): Promise<OAuthUserInfo> {
    if (!this.config.oauthIo.enabled) {
      throw new Error('OAuth.io is not configured');
    }

    return new Promise((resolve, reject) => {
      // Load OAuth.io SDK if not already loaded
      if (!(window as any).OAuth) {
        const script = document.createElement('script');
        script.src = 'https://oauth.io/auth/download/latest/oauth.js';
        script.onload = () => this.performOAuthIoAuth(provider, resolve, reject);
        script.onerror = () => reject(new Error('Failed to load OAuth.io SDK'));
        document.head.appendChild(script);
      } else {
        this.performOAuthIoAuth(provider, resolve, reject);
      }
    });
  }

  /**
   * Perform OAuth.io authentication
   */
  private performOAuthIoAuth(
    provider: 'google' | 'facebook',
    resolve: (value: OAuthUserInfo) => void,
    reject: (reason: any) => void
  ): void {
    const OAuth = (window as any).OAuth;
    OAuth.initialize(this.config.oauthIo.publicKey);

    OAuth.popup(provider)
      .then((result: any) => {
        return result.me();
      })
      .then((userData: any) => {
        resolve({
          id: userData.id,
          email: userData.email,
          name: userData.name,
          avatar: userData.avatar,
          provider,
        });
      })
      .catch((error: any) => {
        console.error(`${provider} OAuth error:`, error);
        reject(new Error(`Failed to authenticate with ${provider}`));
      });
  }

  /**
   * Generate a random state parameter for OAuth security
   */
  private generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const state = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem('oauth_state', state);
    return state;
  }

  /**
   * Validate the OAuth state parameter
   */
  private validateState(state: string): boolean {
    const storedState = sessionStorage.getItem('oauth_state');
    sessionStorage.removeItem('oauth_state');
    return storedState === state;
  }

  /**
   * Get available OAuth providers
   */
  getAvailableProviders(): SocialProvider[] {
    const providers: SocialProvider[] = [];
    
    if (this.config.oauthIo.enabled) {
      providers.push('google', 'facebook');
    }
    
    return providers;
  }
}

// Export singleton instance
export const oauthService = new OAuthService();
