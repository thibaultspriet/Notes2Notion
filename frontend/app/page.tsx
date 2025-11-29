"use client";

import { useState, useEffect } from "react";
import CameraCapture from "@/components/CameraCapture";
import RefreshHandler from "@/components/RefreshHandler";
import NotionLoginPrompt from "@/components/NotionLoginPrompt";
import PageIdSetup from "@/components/PageIdSetup";
import LicenseKeyPrompt from "@/components/LicenseKeyPrompt";
import {
  isAuthenticated,
  setToken,
  getUserInfo,
  setUserInfo,
  fetchAndStoreUserInfo,
  logout
} from "@/lib/auth";

export default function Home() {
  const isDevelopment = process.env.NEXT_PUBLIC_APP_ENV === 'development';

  const [testMode, setTestMode] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [needsPageSetup, setNeedsPageSetup] = useState(false);
  const [workspaceName, setWorkspaceName] = useState<string>("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasValidLicense, setHasValidLicense] = useState(false);

  // Check authentication and handle OAuth callback
  useEffect(() => {
    const checkLicenseAndAuth = async () => {
      // STEP 1: Check license FIRST
      const storedLicense = localStorage.getItem('notes2notion_license_key');
      if (!storedLicense) {
        setHasValidLicense(false);
        setIsCheckingAuth(false);
        return; // Stop here - show license prompt
      }

      // License exists
      setHasValidLicense(true);

      // STEP 2: Continue with existing OAuth check
      // Check if we have a redirect from OAuth callback (token in URL hash)
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const token = params.get('token');
      const workspace = params.get('workspace');
      const needs_setup = params.get('needs_setup');

      if (token) {
        // OAuth callback - store token
        setToken(token);

        if (workspace) {
          const workspaceName = decodeURIComponent(workspace);
          setWorkspaceName(workspaceName);
          setUserInfo({
            workspace_name: workspaceName,
            has_page_id: needs_setup !== 'true',
            bot_id: '' // Will be fetched from backend
          });
        }

        // Clear hash from URL
        window.history.replaceState(null, '', window.location.pathname);

        // Check if page setup is needed
        if (needs_setup === 'true') {
          setNeedsPageSetup(true);
          setHasAccess(false);
        } else {
          setHasAccess(true);
        }
        setIsCheckingAuth(false);
        return;
      }

      // Check for existing authentication
      if (isAuthenticated()) {
        // Verify token is still valid by fetching user info
        const userInfo = await fetchAndStoreUserInfo();

        if (userInfo) {
          setWorkspaceName(userInfo.workspace_name);

          if (!userInfo.has_page_id) {
            setNeedsPageSetup(true);
            setHasAccess(false);
          } else {
            setHasAccess(true);
          }
        } else {
          // Token invalid - clear and show login
          logout();
          setHasAccess(false);
        }
      }

      setIsCheckingAuth(false);
    };

    checkLicenseAndAuth();
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleLoginSuccess = () => {
    // This will be handled by the OAuth callback
  };

  const handlePageSetupComplete = async () => {
    // Refresh user info to get updated page_id status
    const userInfo = await fetchAndStoreUserInfo();
    if (userInfo && userInfo.has_page_id) {
      setNeedsPageSetup(false);
      setHasAccess(true);
    }
  };

  const handleLicenseValidated = () => {
    setHasValidLicense(true);
  };

  const handleLogout = () => {
    logout();
    setHasAccess(false);
    setNeedsPageSetup(false);
    window.location.reload();
  };

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </main>
    );
  }

  // NEW: Show license prompt if no valid license
  if (!hasValidLicense) {
    return <LicenseKeyPrompt onLicenseValidated={handleLicenseValidated} />;
  }

  // Show page setup if needed
  if (needsPageSetup) {
    return (
      <PageIdSetup
        workspaceName={workspaceName}
        onComplete={handlePageSetupComplete}
      />
    );
  }

  // Show login prompt if not authenticated
  if (!hasAccess) {
    return <NotionLoginPrompt onLoginSuccess={handleLoginSuccess} />;
  }

  // Show main application
  return (
    <main className="min-h-screen flex items-center justify-center p-5">
      <RefreshHandler />

      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full relative">
        {/* Top bar with workspace name and logout */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {workspaceName && (
              <span className="bg-gray-100 px-2 py-1 rounded">
                {workspaceName}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Déconnexion"
              title="Déconnexion"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 text-gray-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                />
              </svg>
            </button>
            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Rafraîchir"
              title="Rafraîchir l'application"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 text-gray-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="text-center mb-6 mt-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📸 Notes2Notion
          </h1>
          <p className="text-gray-600 text-sm">
            Capturez vos notes manuscrites
          </p>
        </div>

        {/* Test Mode Toggle - Only in development */}
        {isDevelopment && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-semibold text-gray-800">Mode Test</span>
                <p className="text-xs text-gray-600">
                  {testMode
                    ? "🧪 Aucun appel LLM (mock content)"
                    : "🚀 Appels LLM activés (production)"}
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-8 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>
          </div>
        )}

        {/* Camera Capture Component */}
        <CameraCapture testMode={isDevelopment ? testMode : false} />

        {/* PWA Install Prompt Info */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>💡 Installez cette app sur votre téléphone pour un accès rapide</p>
        </div>
      </div>
    </main>
  );
}
