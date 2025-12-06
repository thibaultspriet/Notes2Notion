import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.INTERNAL_API_URL;

// IMPORTANT: Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log('🔍 [FRONTEND PROXY] GET /api/user/info received');
  try {
    const authHeader = request.headers.get('authorization');
    console.log('   Auth header present:', !!authHeader);

    if (!authHeader) {
      console.log('   ❌ No auth header, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('   Forwarding to backend:', `${API_URL}/api/user/info`);
    const response = await fetch(`${API_URL}/api/user/info`, {
      headers: {
        'Authorization': authHeader,
      },
      cache: 'no-store', // Disable fetch caching
    });

    console.log('   Backend response status:', response.status);

    if (!response.ok) {
      console.log('   ❌ Backend returned error status');
      return NextResponse.json(
        { error: 'Failed to fetch user info' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('   ✅ Backend data:', data);

    // Return with cache control headers to prevent browser caching
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('❌ [FRONTEND PROXY] User info proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
