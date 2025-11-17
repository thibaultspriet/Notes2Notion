/**
 * Authentication utilities for Notion OAuth integration.
 *
 * This module handles JWT session tokens stored in localStorage.
 * Tokens are obtained after successful Notion OAuth authentication.
 */

const TOKEN_KEY = 'notes2notion_session_token';
const USER_INFO_KEY = 'notes2notion_user_info';

export interface UserInfo {
  workspace_name: string;
  has_page_id: boolean;
  bot_id: string;
}

/**
 * Get the current session token from localStorage
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store session token in localStorage
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove session token from localStorage
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_INFO_KEY);
}

/**
 * Store user info in localStorage
 */
export function setUserInfo(userInfo: UserInfo): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
}

/**
 * Get user info from localStorage
 */
export function getUserInfo(): UserInfo | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(USER_INFO_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated (has valid session token)
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Fetch user info from backend and store in localStorage
 * Returns null if not authenticated or fetch fails
 */
export async function fetchAndStoreUserInfo(): Promise<UserInfo | null> {
  const token = getToken();
  if (!token) return null;

  try {
    // Use relative URL to call Next.js API proxy instead of direct backend call
    const response = await fetch('/api/user/info', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Token is invalid or expired
      if (response.status === 401) {
        clearToken();
      }
      return null;
    }

    const userInfo: UserInfo = await response.json();
    setUserInfo(userInfo);
    return userInfo;
  } catch (error) {
    console.error('Failed to fetch user info:', error);
    return null;
  }
}

/**
 * Update user's default Notion page ID
 */
export async function updatePageId(pageId: string): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  try {
    // Use relative URL to call Next.js API proxy instead of direct backend call
    const response = await fetch('/api/user/page-id', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_id: pageId }),
    });

    if (!response.ok) {
      return false;
    }

    // Refresh user info after updating page ID
    await fetchAndStoreUserInfo();
    return true;
  } catch (error) {
    console.error('Failed to update page ID:', error);
    return false;
  }
}

/**
 * Logout: clear all stored auth data
 */
export function logout(): void {
  clearToken();
}
