import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'GitHub OAuth not configured' },
        { status: 500 }
      );
    }

    // Exchange code for access token with GitHub
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        state,
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get access token from GitHub' },
        { status: 401 }
      );
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.json(
        { error: tokenData.error_description || 'OAuth error' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      access_token: tokenData.access_token,
    });
  } catch (error: any) {
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { error: error.message || 'Token exchange failed' },
      { status: 500 }
    );
  }
}
