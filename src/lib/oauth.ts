export interface OAuthProvider {
  name: 'facebook' | 'instagram';
  getAuthUrl(state?: string): string;
  exchangeCodeForToken(code: string): Promise<string>;
  getUserProfile(accessToken: string): Promise<OAuthProfile>;
}

export interface OAuthProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export class FacebookOAuthProvider implements OAuthProvider {
  name = 'facebook' as const;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'email,public_profile',
      response_type: 'code',
      state: state || crypto.randomUUID(),
    });
    return `https://www.facebook.com/v18.0/dialog/oauth?${params}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code,
    });

    const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${params}`);
    const data: any = await response.json();

    if (data.error) {
      console.error(
        '[Facebook OAuth] Token exchange failed:',
        JSON.stringify({
          error_type: data.error.type || 'unknown',
          error_code: data.error.code,
          error_message: data.error.message,
          timestamp: new Date().toISOString(),
        })
      );
      throw new Error('Facebook 授權失敗，請重新登入');
    }

    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<OAuthProfile> {
    const params = new URLSearchParams({
      fields: 'id,name,email,picture',
      access_token: accessToken,
    });

    const response = await fetch(`https://graph.facebook.com/v18.0/me?${params}`);
    const data: any = await response.json();

    if (data.error) {
      console.error(
        '[Facebook OAuth] Get user profile failed:',
        JSON.stringify({
          error_code: data.error.code,
          error_message: data.error.message,
          timestamp: new Date().toISOString(),
        })
      );
      throw new Error('無法獲取用戶資訊');
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      avatar_url: data.picture?.data?.url,
    };
  }
}

export class InstagramOAuthProvider implements OAuthProvider {
  name = 'instagram' as const;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'user_profile',
      response_type: 'code',
      state: state || crypto.randomUUID(),
    });
    return `https://api.instagram.com/oauth/authorize?${params}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
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

export class OAuthManager {
  private providers: Map<string, OAuthProvider> = new Map();

  registerProvider(provider: OAuthProvider) {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): OAuthProvider | undefined {
    return this.providers.get(name);
  }

  async handleOAuthLogin(providerName: string, code: string): Promise<OAuthProfile> {
    const provider = this.getProvider(providerName);

    if (!provider) {
      throw new Error(`OAuth provider '${providerName}' not found`);
    }

    const accessToken = await provider.exchangeCodeForToken(code);
    const profile = await provider.getUserProfile(accessToken);

    return profile;
  }
}
