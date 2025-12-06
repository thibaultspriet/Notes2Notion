import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.INTERNAL_API_URL;

export async function POST(request: NextRequest) {
  console.log('📝 [FRONTEND PROXY] POST /api/user/page-id received');
  try {
    const authHeader = request.headers.get('authorization');
    console.log('   Auth header present:', !!authHeader);

    if (!authHeader) {
      console.log('   ❌ No auth header, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('   Request body:', body);
    console.log('   Forwarding to backend:', `${API_URL}/api/user/page-id`);

    const response = await fetch(`${API_URL}/api/user/page-id`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('   Backend response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.log('   ❌ Backend error:', errorData);
      return NextResponse.json(
        { error: 'Failed to update page ID', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('   ✅ Success, returning:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ [FRONTEND PROXY] Update page ID proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
