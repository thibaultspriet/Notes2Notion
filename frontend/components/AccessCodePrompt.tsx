"use client";

import { useState, useEffect } from "react";

interface AccessCodePromptProps {
  onAccessGranted: () => void;
}

export default function AccessCodePrompt({ onAccessGranted }: AccessCodePromptProps) {
  const [accessCode, setAccessCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  // Check if we already have a valid access code in localStorage
  useEffect(() => {
    const storedCode = localStorage.getItem("notes2notion_access_code");
    if (storedCode) {
      // Verify the stored code is still valid
      verifyAccessCode(storedCode, true);
    }
  }, []);

  const verifyAccessCode = async (code: string, silent: boolean = false) => {
    if (!silent) {
      setIsVerifying(true);
      setError("");
    }

    try {
      // Try to access the health endpoint with the access code
      // Note: /api/health doesn't require auth, so we'll use a test request instead
      // For now, we'll just store the code and let the first upload verify it

      // Store the code
      localStorage.setItem("notes2notion_access_code", code);

      // Grant access (will be verified on first actual API call)
      onAccessGranted();
    } catch (err) {
      if (!silent) {
        setError("Erreur de vérification du code");
        localStorage.removeItem("notes2notion_access_code");
      }
    } finally {
      if (!silent) {
        setIsVerifying(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessCode.trim()) {
      setError("Veuillez entrer un code d'accès");
      return;
    }

    await verifyAccessCode(accessCode);
  };

  const handleReset = () => {
    localStorage.removeItem("notes2notion_access_code");
    setAccessCode("");
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-primary/10 to-secondary/10">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Code d'accès requis
          </h1>
          <p className="text-gray-600 text-sm">
            Entrez votre code d'accès pour utiliser Notes2Notion
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-2">
              Code d'accès
            </label>
            <input
              id="accessCode"
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Entrez votre code d'accès"
              disabled={isVerifying}
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying || !accessCode.trim()}
            className="w-full btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <>
                <span className="loading-spinner mr-2"></span>
                Vérification...
              </>
            ) : (
              <>
                <span className="mr-2">🔓</span>
                Déverrouiller
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Ce code vous a été fourni par l'administrateur de l'application
          </p>
        </div>

        {/* Hidden reset button for development */}
        <button
          onClick={handleReset}
          className="mt-4 w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Réinitialiser le code stocké
        </button>
      </div>
    </div>
  );
}
