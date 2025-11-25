"use client";

import { useState } from 'react';
import { updatePageId } from '../lib/auth';

interface PageIdSetupProps {
  workspaceName: string;
  onComplete: () => void;
}

export default function PageIdSetup({ workspaceName, onComplete }: PageIdSetupProps) {
  const [pageId, setPageId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pageId.trim()) {
      setError('Veuillez entrer un identifiant de page Notion');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await updatePageId(pageId.trim());

      if (success) {
        onComplete();
      } else {
        setError('Échec de la configuration de l\'identifiant de page. Veuillez vérifier l\'ID et réessayer.');
      }
    } catch (err) {
      setError('Une erreur s\'est produite. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Configurer la page par défaut
          </h2>
          <p className="text-gray-600">
            Connecté à : <span className="font-semibold">{workspaceName}</span>
          </p>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Veuillez fournir l'identifiant de la page Notion où vos notes seront créées.
          </p>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm">
              Comment trouver votre identifiant de page Notion :
            </h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Ouvrez la page cible dans Notion</li>
              <li>Cliquez sur "Partager" → "Copier le lien"</li>
              <li>L'identifiant de page est la dernière partie de l'URL</li>
            </ol>
            <div className="mt-3 p-2 bg-white rounded border border-blue-300">
              <p className="text-xs font-mono text-gray-600 break-all">
                https://notion.so/<span className="bg-yellow-200">abc123def456</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                → Identifiant de page : <span className="font-semibold">abc123def456</span>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Page ID Input */}
          <div className="mb-6">
            <label htmlFor="pageId" className="block text-sm font-medium text-gray-700 mb-2">
              Identifiant de page Notion
            </label>
            <input
              type="text"
              id="pageId"
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              placeholder="abc123def456..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !pageId.trim()}
            className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Enregistrement...' : 'Continuer'}
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-500 text-center">
          Vous pourrez modifier ceci plus tard dans les paramètres de votre compte
        </p>
      </div>
    </div>
  );
}
