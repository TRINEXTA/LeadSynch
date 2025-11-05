import React, { useState, useEffect } from 'react';
import { Upload, X, Trash2, Copy, Check, Image as ImageIcon } from 'lucide-react';
import api from '../api/axios';

export default function ImageGallery({ onInsert }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const response = await api.get('/images');
      setImages(response.data.images || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier la taille (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('❌ Fichier trop volumineux (5MB max)');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/images/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setImages([response.data.image, ...images]);
      alert('✅ Image uploadée !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette image ?')) return;

    try {
      await api.delete(`/images/${id}`);
      setImages(images.filter(img => img.id !== id));
      alert('✅ Image supprimée !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de la suppression');
    }
  };

  const handleCopyUrl = (url) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(url);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsertHtml = (image) => {
    const fullUrl = `${window.location.origin}${image.file_url}`;
    const html = `<img src="${fullUrl}" alt="${image.original_name}" style="max-width: 100%; height: auto;" />`;
    
    if (onInsert) {
      onInsert(html);
    } else {
      navigator.clipboard.writeText(html);
      alert('✅ Code HTML copié dans le presse-papier !');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bouton upload */}
      <div className="border-2 border-dashed border-purple-300 rounded-xl p-6 bg-purple-50 hover:bg-purple-100 transition-all">
        <label className="cursor-pointer flex flex-col items-center">
          <Upload className={`w-12 h-12 mb-3 ${uploading ? 'animate-bounce text-purple-400' : 'text-purple-600'}`} />
          <span className="text-sm font-semibold text-purple-700 mb-1">
            {uploading ? 'Upload en cours...' : 'Cliquez pour uploader une image'}
          </span>
          <span className="text-xs text-purple-600">JPG, PNG, GIF, WEBP • Max 5MB</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Liste des images */}
      {images.length === 0 ? (
        <div className="text-center py-12">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucune image uploadée</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {images.map(image => (
            <div key={image.id} className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-purple-300 transition-all group">
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={`${window.location.origin}${image.file_url}`}
                  alt={image.original_name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handleInsertHtml(image)}
                    className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
                    title="Insérer dans le template"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(image.id)}
                    className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-2 bg-white">
                <p className="text-xs font-semibold text-gray-700 truncate" title={image.original_name}>
                  {image.original_name}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">
                    {image.width}×{image.height} • {(image.file_size / 1024).toFixed(0)}KB
                  </span>
                  <button
                    onClick={() => handleCopyUrl(image.file_url)}
                    className="text-xs text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1"
                  >
                    {copiedId === image.file_url ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copié
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        URL
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
