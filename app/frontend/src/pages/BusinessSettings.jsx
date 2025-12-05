import { log, error, warn } from "../lib/logger.js";
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Package, FileText, CreditCard, Plus, Edit, Trash2, Eye, EyeOff, Save, X } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function BusinessSettings() {
  // États accordéons
  const [openSection, setOpenSection] = useState('products'); // 'products', 'legal', 'payment'

  // États données
  const [products, setProducts] = useState([]);
  const [legalDocs, setLegalDocs] = useState([]);
  const [paymentLinks, setPaymentLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  // États modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null);
  const [editingLegal, setEditingLegal] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [productsRes, legalRes, paymentRes] = await Promise.all([
        api.get('/business-config/products').catch(() => ({ data: { products: [] } })),
        api.get('/business-config/legal-documents').catch(() => ({ data: { documents: [] } })),
        api.get('/business-config/payment-links').catch(() => ({ data: { payment_links: [] } }))
      ]);

      setProducts(productsRes.data.products || []);
      setLegalDocs(legalRes.data.documents || []);
      setPaymentLinks(paymentRes.data.payment_links || []);
    } catch (error) {
      error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  // ========== PRODUITS ==========
  const deleteProduct = async (id) => {
    if (!confirm('Supprimer ce produit ?')) return;
    try {
      await api.delete(`/business-config/products/${id}`);
      toast.success('Produit supprimé');
      loadAllData();
    } catch (error) {
      toast.error('Erreur suppression produit');
    }
  };

  // ========== DOCUMENTS LÉGAUX ==========
  const deleteLegalDoc = async (id) => {
    if (!confirm('Supprimer ce document ?')) return;
    try {
      await api.delete(`/business-config/legal-documents/${id}`);
      toast.success('Document supprimé');
      loadAllData();
    } catch (error) {
      toast.error('Erreur suppression document');
    }
  };

  // ========== LIENS PAIEMENT ==========
  const deletePaymentLink = async (id) => {
    if (!confirm('Supprimer ce lien ?')) return;
    try {
      await api.delete(`/business-config/payment-links/${id}`);
      toast.success('Lien supprimé');
      loadAllData();
    } catch (error) {
      toast.error('Erreur suppression lien');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">⚙️ Configuration Business</h1>
        <p className="text-gray-600">Gérez vos produits, CGV et liens de paiement</p>
      </div>

      {/* Accordéons */}
      <div className="space-y-4">
        {/* SECTION 1 : PRODUITS */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('products')}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-gray-900">Mes Produits & Services</h2>
                <p className="text-sm text-gray-600">{products.length} produit(s) configuré(s)</p>
              </div>
            </div>
            {openSection === 'products' ? (
              <ChevronUp className="w-6 h-6 text-gray-400" />
            ) : (
              <ChevronDown className="w-6 h-6 text-gray-400" />
            )}
          </button>

          {openSection === 'products' && (
            <div className="p-6 border-t bg-gradient-to-br from-gray-50 to-blue-50">
              <div className="mb-4 flex justify-between items-center">
                <p className="text-sm text-gray-600">Créez vos produits pour les proposer dans vos contrats</p>
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setShowProductModal(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg flex items-center gap-2 hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un produit
                </button>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Aucun produit configuré</p>
                  <p className="text-sm text-gray-500 mt-2">Ajoutez votre premier produit ou service</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.map((product) => (
                    <div key={product.id} className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900">{product.name}</h3>
                            {product.is_active ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">Actif</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-semibold">Inactif</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-semibold">
                              {product.type === 'subscription' ? 'Abonnement' :
                               product.type === 'one_time' ? 'Unique' :
                               product.type === 'hourly' ? 'À l\'heure' : 'Sur devis'}
                            </span>
                            {product.price && (
                              <span className="font-bold text-gray-900">{product.price} {product.currency}</span>
                            )}
                            {product.billing_cycle && (
                              <span className="text-gray-600">/ {product.billing_cycle === 'monthly' ? 'mois' : product.billing_cycle === 'yearly' ? 'an' : product.billing_cycle}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setShowProductModal(true);
                            }}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                      {product.features && product.features.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Fonctionnalités :</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {product.features.slice(0, 3).map((f, i) => (
                              <li key={i}>✓ {f}</li>
                            ))}
                            {product.features.length > 3 && (
                              <li className="text-blue-600 font-semibold">+ {product.features.length - 3} autre(s)</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 2 : CGV & DOCUMENTS */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('legal')}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-gray-900">Mes CGV & Documents Légaux</h2>
                <p className="text-sm text-gray-600">{legalDocs.length} document(s) configuré(s)</p>
              </div>
            </div>
            {openSection === 'legal' ? (
              <ChevronUp className="w-6 h-6 text-gray-400" />
            ) : (
              <ChevronDown className="w-6 h-6 text-gray-400" />
            )}
          </button>

          {openSection === 'legal' && (
            <div className="p-6 border-t bg-gradient-to-br from-gray-50 to-purple-50">
              <div className="mb-4 flex justify-between items-center">
                <p className="text-sm text-gray-600">Configurez vos CGV et templates de contrats</p>
                <button
                  onClick={() => {
                    setEditingLegal(null);
                    setShowLegalModal(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg flex items-center gap-2 hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un document
                </button>
              </div>

              {legalDocs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Aucun document configuré</p>
                  <p className="text-sm text-gray-500 mt-2">Ajoutez vos CGV ou template de contrat</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {legalDocs.map((doc) => (
                    <div key={doc.id} className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-gray-900">{doc.title}</h3>
                            {doc.is_active && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">Actif</span>
                            )}
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-semibold">
                              v{doc.version}
                            </span>
                            <span className="text-xs text-gray-500 uppercase font-semibold">{doc.type}</span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{doc.content.substring(0, 150)}...</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => {
                              setEditingLegal(doc);
                              setShowLegalModal(true);
                            }}
                            className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4 text-purple-600" />
                          </button>
                          <button
                            onClick={() => deleteLegalDoc(doc.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 3 : LIENS PAIEMENT */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('payment')}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-gray-900">Mes Liens de Paiement</h2>
                <p className="text-sm text-gray-600">{paymentLinks.length} lien(s) configuré(s)</p>
              </div>
            </div>
            {openSection === 'payment' ? (
              <ChevronUp className="w-6 h-6 text-gray-400" />
            ) : (
              <ChevronDown className="w-6 h-6 text-gray-400" />
            )}
          </button>

          {openSection === 'payment' && (
            <div className="p-6 border-t bg-gradient-to-br from-gray-50 to-green-50">
              <div className="mb-4 flex justify-between items-center">
                <p className="text-sm text-gray-600">Ajoutez vos liens Stripe, PayPal, etc.</p>
                <button
                  onClick={() => {
                    setEditingPayment(null);
                    setShowPaymentModal(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg flex items-center gap-2 hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un lien
                </button>
              </div>

              {paymentLinks.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                  <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Aucun lien de paiement</p>
                  <p className="text-sm text-gray-500 mt-2">Ajoutez vos liens Stripe, PayPal ou autres</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentLinks.map((link) => (
                    <div key={link.id} className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900">{link.name}</h3>
                            {link.is_active ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">Actif</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-semibold">Inactif</span>
                            )}
                          </div>
                          {link.provider && (
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-semibold mb-2">
                              {link.provider}
                            </span>
                          )}
                          {link.url && (
                            <p className="text-xs text-gray-600 mb-2 truncate">{link.url}</p>
                          )}
                          {link.instructions && (
                            <p className="text-xs text-gray-500 line-clamp-2">{link.instructions}</p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => {
                              setEditingPayment(link);
                              setShowPaymentModal(true);
                            }}
                            className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={() => deletePaymentLink(link.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2 text-xs text-gray-600 pt-3 border-t">
                        {link.display_in_contracts && <span>✓ Dans contrats</span>}
                        {link.display_in_quotes && <span>✓ Dans devis</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODALS - À implémenter dans des fichiers séparés */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
          onSuccess={() => {
            setShowProductModal(false);
            setEditingProduct(null);
            loadAllData();
          }}
        />
      )}

      {showLegalModal && (
        <LegalDocModal
          document={editingLegal}
          onClose={() => {
            setShowLegalModal(false);
            setEditingLegal(null);
          }}
          onSuccess={() => {
            setShowLegalModal(false);
            setEditingLegal(null);
            loadAllData();
          }}
        />
      )}

      {showPaymentModal && (
        <PaymentLinkModal
          paymentLink={editingPayment}
          onClose={() => {
            setShowPaymentModal(false);
            setEditingPayment(null);
          }}
          onSuccess={() => {
            setShowPaymentModal(false);
            setEditingPayment(null);
            loadAllData();
          }}
        />
      )}
    </div>
  );
}

// ========== MODALS SIMPLES (À améliorer) ==========

function ProductModal({ product, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    type: product?.type || 'subscription',
    price: product?.price || '',
    billing_cycle: product?.billing_cycle || 'monthly',
    is_active: product?.is_active ?? true
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (product) {
        await api.patch(`/business-config/products/${product.id}`, formData);
        toast.success('Produit mis à jour');
      } else {
        await api.post('/business-config/products', formData);
        toast.success('Produit créé');
      }
      onSuccess();
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-xl font-bold">{product ? 'Modifier' : 'Ajouter'} un produit</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Nom du produit *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="subscription">Abonnement</option>
                <option value="one_time">Service unique</option>
                <option value="hourly">À l'heure</option>
                <option value="quote">Sur devis</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Prix (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {formData.type === 'subscription' && (
            <div>
              <label className="block text-sm font-semibold mb-2">Périodicité</label>
              <select
                value={formData.billing_cycle}
                onChange={(e) => setFormData({...formData, billing_cycle: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Mensuel</option>
                <option value="quarterly">Trimestriel</option>
                <option value="yearly">Annuel</option>
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="w-4 h-4"
            />
            <label className="text-sm font-semibold">Produit actif</label>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border rounded-lg hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LegalDocModal({ document, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    type: document?.type || 'cgv',
    title: document?.title || '',
    content: document?.content || '',
    is_active: document?.is_active ?? true
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (document) {
        await api.patch(`/business-config/legal-documents/${document.id}`, formData);
        toast.success('Document mis à jour');
      } else {
        await api.post('/business-config/legal-documents', formData);
        toast.success('Document créé');
      }
      onSuccess();
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-xl font-bold">{document ? 'Modifier' : 'Ajouter'} un document légal</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="cgv">CGV (Conditions Générales de Vente)</option>
                <option value="cgu">CGU (Conditions Générales d'Utilisation)</option>
                <option value="contract_template">Template de Contrat</option>
                <option value="privacy_policy">Politique de Confidentialité</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Titre *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Contenu *</label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
              rows="15"
              placeholder="Variables disponibles: {company_name}, {siret}, {amount}, {date}, {client_name}..."
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="w-4 h-4"
            />
            <label className="text-sm font-semibold">Document actif (désactivera les autres du même type)</label>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border rounded-lg hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentLinkModal({ paymentLink, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: paymentLink?.name || '',
    provider: paymentLink?.provider || 'stripe',
    url: paymentLink?.url || '',
    instructions: paymentLink?.instructions || '',
    display_in_contracts: paymentLink?.display_in_contracts ?? true,
    display_in_quotes: paymentLink?.display_in_quotes ?? true,
    is_active: paymentLink?.is_active ?? true
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (paymentLink) {
        await api.patch(`/business-config/payment-links/${paymentLink.id}`, formData);
        toast.success('Lien mis à jour');
      } else {
        await api.post('/business-config/payment-links', formData);
        toast.success('Lien créé');
      }
      onSuccess();
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-xl font-bold">{paymentLink ? 'Modifier' : 'Ajouter'} un lien de paiement</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Nom *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="Ex: Paiement Stripe, PayPal, Virement..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Provider</label>
            <select
              value={formData.provider}
              onChange={(e) => setFormData({...formData, provider: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="bank_transfer">Virement bancaire</option>
              <option value="other">Autre</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">URL du lien de paiement</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Instructions (optionnel)</label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({...formData, instructions: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              rows="3"
              placeholder="Instructions pour le paiement par virement, etc."
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.display_in_contracts}
                onChange={(e) => setFormData({...formData, display_in_contracts: e.target.checked})}
                className="w-4 h-4"
              />
              <label className="text-sm font-semibold">Afficher dans les contrats</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.display_in_quotes}
                onChange={(e) => setFormData({...formData, display_in_quotes: e.target.checked})}
                className="w-4 h-4"
              />
              <label className="text-sm font-semibold">Afficher dans les devis</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4"
              />
              <label className="text-sm font-semibold">Lien actif</label>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border rounded-lg hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
