import { Flame, ThermometerSun, Snowflake, AlertTriangle, XCircle, Trophy, Sparkles, TrendingUp, Clock, Phone, Mail, MessageSquare, Calendar } from 'lucide-react';

// Configuration des Health Labels avec styles et icônes
export const HEALTH_LABELS = {
  hot: {
    label: 'Très chaud',
    icon: Flame,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    emoji: '🔥',
    description: 'Lead très engagé, forte probabilité de conversion'
  },
  warm: {
    label: 'Tiède',
    icon: ThermometerSun,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    emoji: '🟡',
    description: 'Engagement modéré, à relancer'
  },
  cold: {
    label: 'Froid',
    icon: Snowflake,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    emoji: '🔵',
    description: 'Peu d\'activité, nécessite du nurturing'
  },
  at_risk: {
    label: 'À risque',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    emoji: '⚠️',
    description: 'Inactif depuis longtemps ou engagement en baisse'
  },
  lost: {
    label: 'Perdu',
    icon: XCircle,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    emoji: '❌',
    description: 'Lead perdu ou non qualifié'
  },
  won: {
    label: 'Gagné',
    icon: Trophy,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    emoji: '✅',
    description: 'Client converti !'
  },
  new: {
    label: 'Nouveau',
    icon: Sparkles,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    borderColor: 'border-indigo-300',
    emoji: '🆕',
    description: 'Lead récemment ajouté, à qualifier'
  }
};

// Configuration des Next Best Actions
export const ACTION_TYPES = {
  call: {
    label: 'Appeler',
    icon: Phone,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    emoji: '📞'
  },
  email: {
    label: 'Envoyer un email',
    icon: Mail,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    emoji: '✉️'
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageSquare,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    emoji: '💬'
  },
  wait: {
    label: 'Attendre',
    icon: Clock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    emoji: '⏳'
  },
  schedule: {
    label: 'Planifier RDV',
    icon: Calendar,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    emoji: '📅'
  },
  close: {
    label: 'Clôturer',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    emoji: '🚫'
  }
};

/**
 * Badge Health Label - Petit badge pour affichage inline
 */
export function HealthLabelBadge({ healthLabel, size = 'md', showLabel = true }) {
  const config = HEALTH_LABELS[healthLabel] || HEALTH_LABELS.new;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${config.bgColor} ${config.color} ${sizeClasses[size]}`}
      title={config.description}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

/**
 * Card Health Label - Carte complète avec score et description
 */
export function HealthLabelCard({ healthLabel, score, showDescription = true }) {
  const config = HEALTH_LABELS[healthLabel] || HEALTH_LABELS.new;
  const Icon = config.icon;

  // Déterminer la couleur du score
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    if (score >= 30) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className={`rounded-xl p-4 ${config.bgColor} border ${config.borderColor}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg bg-white/50`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <span className={`font-bold ${config.color}`}>{config.label}</span>
        </div>
        {score !== undefined && score !== null && (
          <div className="text-right">
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
            <span className="text-gray-500 text-sm">/100</span>
          </div>
        )}
      </div>
      {showDescription && (
        <p className="text-sm text-gray-600">{config.description}</p>
      )}
    </div>
  );
}

/**
 * Score Gauge - Jauge visuelle du score
 */
export function ScoreGauge({ score, size = 'md' }) {
  const getGaugeColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]} overflow-hidden`}>
        <div
          className={`${sizeClasses[size]} rounded-full transition-all duration-500 ${getGaugeColor(score)}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Next Best Action Badge - Affiche la prochaine action recommandée
 */
export function NextBestActionBadge({ actionType, reason, onClick }) {
  const config = ACTION_TYPES[actionType] || ACTION_TYPES.wait;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl ${config.bgColor} border border-gray-200 hover:shadow-md transition-all w-full text-left group`}
    >
      <div className={`p-2 rounded-lg bg-white shadow-sm`}>
        <Icon className={`w-5 h-5 ${config.color}`} />
      </div>
      <div className="flex-1">
        <p className={`font-semibold ${config.color}`}>{config.label}</p>
        {reason && <p className="text-xs text-gray-600 line-clamp-1">{reason}</p>}
      </div>
      <TrendingUp className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
    </button>
  );
}

/**
 * Lead Intelligence Panel - Panel complet avec Health Label, Score et NBA
 */
export function LeadIntelligencePanel({ lead, onActionClick }) {
  if (!lead) return null;

  const healthLabel = lead.health_label || 'new';
  const score = lead.score;
  const nextAction = lead.next_best_action;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-purple-600" />
        Intelligence Lead
      </h3>

      {/* Health Label Card */}
      <HealthLabelCard healthLabel={healthLabel} score={score} />

      {/* Score Gauge */}
      {score !== undefined && score !== null && (
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Score d'engagement</span>
            <span className="font-semibold">{score}/100</span>
          </div>
          <ScoreGauge score={score} size="md" />
        </div>
      )}

      {/* Next Best Action */}
      {nextAction && (
        <div>
          <p className="text-sm text-gray-600 mb-2">🎯 Prochaine action recommandée</p>
          <NextBestActionBadge
            actionType={nextAction.type || 'call'}
            reason={nextAction.reason || nextAction}
            onClick={() => onActionClick && onActionClick(nextAction)}
          />
        </div>
      )}
    </div>
  );
}

export default HealthLabelBadge;
