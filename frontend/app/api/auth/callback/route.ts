/**
 * OAuth Callback Route for Notion Authentication
 *
 * This Next.js API route handles the OAuth callback from Notion.
 * It receives the authorization code, exchanges it for a session token,
 * and redirects the user back to the home page.
 */

import { NextRequest, NextResponse } from 'next/server';

// Use internal Docker service name for server-side API calls
// NEXT_PUBLIC_API_URL is for client-side calls only
const API_URL = process.env.INTERNAL_API_URL;

export async function GET(request: NextRequest) {
  try {
    // Extract authorization code from URL parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Check if user denied authorization
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    // Validate that we received a code
    if (!code) {
      console.error('No authorization code received');
      return NextResponse.redirect(
        new URL('/?error=no_code', request.url)
      );
    }

    console.log('Received OAuth code, exchanging for token...');

    // Exchange authorization code for session token
    const response = await fetch(`${API_URL}/api/oauth/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(errorData.error || 'token_exchange_failed')}`, request.url)
      );
    }

    const data = await response.json();
    const { session_token, workspace_name, needs_page_setup } = data;

    console.log('OAuth successful:', { workspace_name, needs_page_setup });

    // Create redirect URL with token in URL fragment (will be extracted by client-side JS)
    // We use URL fragment (#) because it's not sent to the server and is more secure
    const redirectUrl = new URL('/', request.url);
    redirectUrl.hash = `token=${session_token}&workspace=${encodeURIComponent(workspace_name)}&needs_setup=${needs_page_setup}`;

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/?error=callback_failed', request.url)
    );
  }
}
