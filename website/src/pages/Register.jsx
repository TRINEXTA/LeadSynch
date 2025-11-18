import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { User, Building2, CreditCard, Check, ArrowRight, ArrowLeft, Loader, AlertCircle } from 'lucide-react';

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedPlan = searchParams.get('plan') || 'free';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [siretLoading, setSiretLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Étape 1 : Infos personnelles
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    
    // Étape 2 : Infos entreprise
    companyName: '',
    siret: '',
    tva: '',
    sector: '',
    employees: '',
    address: '',
    city: '',
    postalCode: '',
    
    // Étape 3 : Plan
    plan: preselectedPlan,
    acceptTerms: false
  });

  const plans = {
    free: { name: 'Free', price: 0, color: 'gray' },
    basic: { name: 'Basic', price: 49, color: 'blue' },
    pro: { name: 'Pro', price: 99, color: 'purple' },
    enterprise: { name: 'Enterprise', price: 'Sur mesure', color: 'orange' }
  };

  // Mapping des styles pour classes Tailwind (fix production build)
  const planStyles = {
    gray: 'border-gray-500 bg-gray-50',
    blue: 'border-blue-500 bg-blue-50',
    purple: 'border-purple-500 bg-purple-50',
    orange: 'border-orange-500 bg-orange-50'
  };

  const iconColorStyles = {
    gray: 'text-gray-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600'
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'Prénom requis';
    if (!formData.lastName.trim()) newErrors.lastName = 'Nom requis';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email requis';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }
    
    if (!formData.phone.trim()) newErrors.phone = 'Téléphone requis';
    
    if (!formData.password) {
      newErrors.password = 'Mot de passe requis';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Minimum 8 caractères';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!formData.companyName.trim()) newErrors.companyName = 'Nom de l\'entreprise requis';
    
    if (!formData.siret.trim()) {
      newErrors.siret = 'SIRET requis';
    } else if (formData.siret.replace(/\s/g, '').length !== 14) {
      newErrors.siret = 'SIRET doit contenir 14 chiffres';
    }
    
    // TVA optionnelle, mais si remplie doit être valide
    if (formData.tva && !formData.tva.match(/^FR[0-9A-Z]{2}[0-9]{9}$/i)) {
      newErrors.tva = 'Format TVA invalide (ex: FR12345678901)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const verifySiret = async () => {
    const siret = formData.siret.replace(/\s/g, '');

    if (siret.length !== 14) {
      setErrors(prev => ({ ...prev, siret: 'SIRET doit contenir 14 chiffres' }));
      return;
    }

    setSiretLoading(true);
    setErrors(prev => ({ ...prev, siret: null }));

    try {
      const API_URL = import.meta.env.VITE_API_URL;

      if (!API_URL) {
        throw new Error('❌ VITE_API_URL non configurée');
      }

      // Appel à l'API backend qui utilise l'API gratuite du gouvernement
      const response = await fetch(`${API_URL}/api/verify-siret`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ siret })
      });

      const data = await response.json();

      if (!data.valid) {
        throw new Error(data.error || 'SIRET non trouvé');
      }

      // Auto-complétion des données
      setFormData(prev => ({
        ...prev,
        companyName: data.companyName || prev.companyName,
        sector: data.sector || prev.sector,
        address: data.address || prev.address,
        city: data.city || prev.city,
        postalCode: data.postalCode || prev.postalCode,
      }));

      alert('✅ SIRET vérifié ! Les informations ont été complétées automatiquement.');
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        siret: error.message || 'SIRET invalide ou introuvable. Vérifiez le numéro.'
      }));
    } finally {
      setSiretLoading(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.acceptTerms) {
      setErrors({ acceptTerms: 'Vous devez accepter les CGU/CGV' });
      return;
    }

    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const APP_URL = import.meta.env.VITE_APP_URL;

      if (!API_URL || !APP_URL) {
        throw new Error('❌ Variables d\'environnement manquantes. Veuillez configurer VITE_API_URL et VITE_APP_URL');
      }

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          companyName: formData.companyName,
          siret: formData.siret.replace(/\s/g, ''),
          tva: formData.tva,
          sector: formData.sector,
          employees: formData.employees,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
          plan: formData.plan
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(' Compte créé avec succès ! Vous allez être redirigé vers l\'application.');
        // Redirection vers l'app CRM
        window.location.href = APP_URL;
      } else {
        setErrors({ submit: data.error || 'Erreur lors de l\'inscription' });
      }
    } catch (error) {
      setErrors({ submit: 'Erreur de connexion au serveur' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Créer votre compte LeadSynch
          </h1>
          <p className="text-gray-600">
            {formData.plan === 'free' 
              ? ' Gratuit, sans carte bancaire  60 leads  100 emails/mois' 
              : `Plan ${plans[formData.plan].name} sélectionné`}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-24 h-1 mx-2 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-center mt-4 text-sm text-gray-600">
            <span className="w-32 text-center">Infos personnelles</span>
            <span className="w-32 text-center">Entreprise</span>
            <span className="w-32 text-center">Plan & Validation</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit}>
            {/* ÉTAPE 1 : Infos personnelles */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-blue-600 mb-6">
                  <User className="w-6 h-6" />
                  <h2 className="text-2xl font-bold">Vos informations</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Prénom *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.firstName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Jean"
                    />
                    {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Nom *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.lastName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Dupont"
                    />
                    {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Email professionnel *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="jean.dupont@entreprise.fr"
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Téléphone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="+33 6 12 34 56 78"
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Mot de passe *</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder=""
                    />
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Confirmer *</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder=""
                    />
                    {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                >
                  Continuer
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* ÉTAPE 2 : Infos entreprise avec SIRET */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-blue-600 mb-6">
                  <Building2 className="w-6 h-6" />
                  <h2 className="text-2xl font-bold">Informations entreprise</h2>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-1"> SIRET obligatoire</p>
                      <p>Votre numéro SIRET (14 chiffres) est requis pour créer un compte. Les informations seront vérifiées et auto-complétées via l'API Sirene.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Nom de l'entreprise *</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.companyName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Ma Super Entreprise"
                  />
                  {errors.companyName && <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Numéro SIRET * (14 chiffres)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="siret"
                      value={formData.siret}
                      onChange={handleChange}
                      className={`flex-1 px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.siret ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="123 456 789 00010"
                      maxLength="17"
                    />
                    <button
                      type="button"
                      onClick={verifySiret}
                      disabled={siretLoading}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {siretLoading ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Vérification...
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          Vérifier
                        </>
                      )}
                    </button>
                  </div>
                  {errors.siret && <p className="text-red-500 text-sm mt-1">{errors.siret}</p>}
                  <p className="text-xs text-gray-500 mt-1">Cliquez sur "Vérifier" pour valider et auto-compléter les infos</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Numéro TVA intracommunautaire (optionnel)</label>
                  <input
                    type="text"
                    name="tva"
                    value={formData.tva}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.tva ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="FR12345678901"
                  />
                  {errors.tva && <p className="text-red-500 text-sm mt-1">{errors.tva}</p>}
                  <p className="text-xs text-gray-500 mt-1">Uniquement si assujetti à la TVA</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Secteur d'activité</label>
                    <input
                      type="text"
                      name="sector"
                      value={formData.sector}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Auto-rempli via SIRET"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Nombre d'employés</label>
                    <select
                      name="employees"
                      value={formData.employees}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Sélectionner --</option>
                      <option value="1-10">1-10</option>
                      <option value="11-50">11-50</option>
                      <option value="51-200">51-200</option>
                      <option value="201-500">201-500</option>
                      <option value="500+">500+</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Adresse</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Auto-rempli via SIRET"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Ville</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Auto-rempli via SIRET"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Code postal</label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Auto-rempli via SIRET"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                  >
                    Continuer
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 3 : Choix du plan */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-blue-600 mb-6">
                  <CreditCard className="w-6 h-6" />
                  <h2 className="text-2xl font-bold">Choisissez votre plan</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(plans).map(([key, plan]) => (
                    <label
                      key={key}
                      className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all ${
                        formData.plan === key
                          ? planStyles[plan.color]
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={key}
                        checked={formData.plan === key}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                        {formData.plan === key && (
                          <Check className={`w-6 h-6 ${iconColorStyles[plan.color]}`} />
                        )}
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {typeof plan.price === 'number' ? `${plan.price}€/mois` : plan.price}
                      </p>
                    </label>
                  ))}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="acceptTerms"
                      checked={formData.acceptTerms}
                      onChange={handleChange}
                      className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      J'accepte les{' '}
                      <Link to="/terms" className="text-blue-600 hover:underline" target="_blank">
                        Conditions Générales d'Utilisation
                      </Link>
                      {' '}et la{' '}
                      <Link to="/privacy" className="text-blue-600 hover:underline" target="_blank">
                        Politique de Confidentialité
                      </Link>
                      {' '}*
                    </span>
                  </label>
                  {errors.acceptTerms && <p className="text-red-500 text-sm mt-2">{errors.acceptTerms}</p>}
                </div>

                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">{errors.submit}</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Retour
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Création en cours...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Créer mon compte
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Déjà un compte */}
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Vous avez déjà un compte ?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-semibold">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
