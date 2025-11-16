import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.INTERNAL_API_URL;

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header if present
    const authHeader = request.headers.get('authorization');

    // Get the access code header for legacy auth (backward compatibility)
    const accessCodeHeader = request.headers.get('X-Access-Code');

    // Get the FormData from the request
    const formData = await request.formData();

    // Forward the request to the backend
    const headers: HeadersInit = {};
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    if (accessCodeHeader) {
      headers['X-Access-Code'] = accessCodeHeader;
    }

    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || 'Upload failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Upload proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
