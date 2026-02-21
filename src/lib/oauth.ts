import {
  Facebook,
  Google,
  Line,
  generateState,
  generateCodeVerifier,
  OAuth2RequestError,
  ArcticFetchError,
  decodeIdToken,
} from 'arctic';

export type { OAuth2RequestError, ArcticFetchError };
export { generateState, generateCodeVerifier, decodeIdToken };

export interface OAuthProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// OAuth Provider 基礎接口
export interface OAuthProviderInterface {
  name: 'facebook' | 'google' | 'line';
  getAuthUrl(state: string, codeVerifier?: string): string;
  exchangeCodeForToken(code: string, codeVerifier?: string): Promise<string>;
  getUserProfile(accessToken: string): Promise<OAuthProfile>;
}

// Facebook OAuth Provider (使用 Arctic)
export class FacebookOAuthProvider implements OAuthProviderInterface {
  name = 'facebook' as const;
  private client: Facebook;

  constructor(config: OAuthConfig) {
    this.client = new Facebook(config.clientId, config.clientSecret, config.redirectUri);
  }

  getAuthUrl(state: string, _codeVerifier?: string): string {
    const scopes = ['email', 'public_profile'];
    return this.client.createAuthorizationURL(state, scopes).toString();
  }

  async exchangeCodeForToken(code: string, _codeVerifier?: string): Promise<string> {
    try {
      const tokens = await this.client.validateAuthorizationCode(code);
      return tokens.accessToken();
    } catch (e) {
      if (e instanceof OAuth2RequestError) {
        const errorCode = e.code;
        if (errorCode === '100') {
          throw new Error('Facebook 授權配置錯誤，請聯繫管理員');
        } else if (errorCode === '190') {
          throw new Error('授權已過期，請重新登入');
        } else if (errorCode === '200') {
          throw new Error('您已取消授權，如需登入請重新點擊登入按鈕');
        }
        throw new Error(`Facebook 授權失敗：${e.message}`);
      }
      if (e instanceof ArcticFetchError) {
        throw new Error('無法連線到 Facebook，請稍後重試');
      }
      throw e;
    }
  }

  async getUserProfile(accessToken: string): Promise<OAuthProfile> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${accessToken}`
      );
      const data: any = await response.json();

      if (data.error) {
        throw new Error('無法獲取用戶資訊');
      }

      return {
        id: data.id,
        name: data.name,
        email: data.email || '',
        avatar_url: data.picture?.data?.url,
      };
    } catch (e) {
      console.error('[Facebook OAuth] Get user profile failed:', e);
      throw new Error('無法獲取用戶資訊');
    }
  }
}

// Instagram OAuth Provider (暫時關閉 - 保留程式碼供未來使用)
/*
export class InstagramOAuthProvider implements OAuthProviderInterface {
  name = 'instagram' as const;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(config: OAuthConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
  }

  getAuthUrl(state: string, _codeVerifier?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'user_profile',
      response_type: 'code',
      state: state,
    });
    return `https://api.instagram.com/oauth/authorize?${params}`;
  }

  async exchangeCodeForToken(code: string, _codeVerifier?: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
      code,
    });

    const response = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const data: any = await response.json();

    if (data.error_type) {
      console.error(
        '[Instagram OAuth] Token exchange failed:',
        JSON.stringify({
          error_type: data.error_type || 'unknown',
          error_message: data.error_message,
          timestamp: new Date().toISOString(),
        })
      );
      throw new Error('Instagram 授權失敗，請重新登入');
    }

    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<OAuthProfile> {
    const params = new URLSearchParams({
      fields: 'id,username,profile_picture_url',
      access_token: accessToken,
    });

    const response = await fetch(`https://graph.instagram.com/me?${params}`);
    const data: any = await response.json();

    if (data.error) {
      console.error(
        '[Instagram OAuth] Get user profile failed:',
        JSON.stringify({
          error_type: data.error_type || 'unknown',
          error_message: data.error.message,
          timestamp: new Date().toISOString(),
        })
      );
      throw new Error('無法獲取 Instagram 用戶資訊，請重新登入');
    }

    return {
      id: data.id,
      name: data.username,
      email: '',
      avatar_url: data.profile_picture_url,
    };
  }
}
*/

// Google OAuth Provider (使用 Arctic - 需要 PKCE)
export class GoogleOAuthProvider implements OAuthProviderInterface {
  name = 'google' as const;
  private client: Google;

  constructor(config: OAuthConfig) {
    this.client = new Google(config.clientId, config.clientSecret, config.redirectUri);
  }

  getAuthUrl(state: string, codeVerifier?: string): string {
    if (!codeVerifier) {
      throw new Error('Google OAuth 需要 codeVerifier');
    }
    const scopes = ['openid', 'email', 'profile'];
    return this.client.createAuthorizationURL(state, codeVerifier, scopes).toString();
  }

  async exchangeCodeForToken(code: string, codeVerifier?: string): Promise<string> {
    if (!codeVerifier) {
      throw new Error('Google OAuth 需要 codeVerifier');
    }
    try {
      const tokens = await this.client.validateAuthorizationCode(code, codeVerifier);
      return tokens.accessToken();
    } catch (e) {
      if (e instanceof OAuth2RequestError) {
        throw new Error('Google 授權失敗，請重新登入');
      }
      if (e instanceof ArcticFetchError) {
        throw new Error('無法連線到 Google，請稍後重試');
      }
      throw e;
    }
  }

  async getUserProfile(accessToken: string): Promise<OAuthProfile> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data: any = await response.json();

      if (data.error) {
        throw new Error('無法獲取 Google 用戶資訊');
      }

      return {
        id: data.sub,
        name: data.name,
        email: data.email || '',
        avatar_url: data.picture,
      };
    } catch (e) {
      console.error('[Google OAuth] Get user profile failed:', e);
      throw new Error('無法獲取 Google 用戶資訊，請重新登入');
    }
  }
}

// Line OAuth Provider (使用 Arctic - 需要 PKCE)
export class LineOAuthProvider implements OAuthProviderInterface {
  name = 'line' as const;
  private client: Line;

  constructor(config: OAuthConfig) {
    this.client = new Line(config.clientId, config.clientSecret, config.redirectUri);
  }

  getAuthUrl(state: string, codeVerifier?: string): string {
    if (!codeVerifier) {
      throw new Error('Line OAuth 需要 codeVerifier');
    }
    const scopes = ['openid', 'profile'];
    return this.client.createAuthorizationURL(state, codeVerifier, scopes).toString();
  }

  async exchangeCodeForToken(code: string, codeVerifier?: string): Promise<string> {
    if (!codeVerifier) {
      throw new Error('Line OAuth 需要 codeVerifier');
    }
    try {
      const tokens = await this.client.validateAuthorizationCode(code, codeVerifier);
      return tokens.accessToken();
    } catch (e) {
      if (e instanceof OAuth2RequestError) {
        throw new Error('Line 授權失敗，請重新登入');
      }
      if (e instanceof ArcticFetchError) {
        throw new Error('無法連線到 Line，請稍後重試');
      }
      throw e;
    }
  }

  async getUserProfile(accessToken: string): Promise<OAuthProfile> {
    try {
      const response = await fetch('https://api.line.me/oauth2/v2.1/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data: any = await response.json();

      if (data.error) {
        throw new Error('無法獲取 Line 用戶資訊');
      }

      return {
        id: data.sub,
        name: data.name,
        email: data.email || '',
        avatar_url: data.picture,
      };
    } catch (e) {
      console.error('[Line OAuth] Get user profile failed:', e);
      throw new Error('無法獲取 Line 用戶資訊，請重新登入');
    }
  }
}

// OAuth Provider Factory
export class OAuthProviderFactory {
  static createProvider(provider: string, config: OAuthConfig): OAuthProviderInterface {
    switch (provider) {
      case 'facebook':
        return new FacebookOAuthProvider(config);
      case 'google':
        return new GoogleOAuthProvider(config);
      case 'line':
        return new LineOAuthProvider(config);
      default:
        throw new Error(`不支援的 OAuth provider: ${provider}`);
    }
  }

  static getSupportedProviders(): string[] {
    return ['facebook', 'google', 'line'];
  }

  // 檢查 provider 是否需要 PKCE (codeVerifier)
  static requiresPKCE(provider: string): boolean {
    return ['google', 'line'].includes(provider);
  }
}

// 為了向後相容，保留舊的接口名稱
export interface OAuthProvider extends OAuthProviderInterface {}

export { Facebook, Google, Line };
