import { log, error, warn } from "../lib/logger.js";
﻿import React from 'react';

export default function LeadSynchLogo({ 
  variant = 'default', // default, dark, light, gradient, mono
  size = 'medium', // small, medium, large
  animated = true 
}) {
  
  const sizes = {
    small: { width: 200, height: 50, fontSize: 16, iconSize: 0.5 },
    medium: { width: 300, height: 75, fontSize: 24, iconSize: 0.75 },
    large: { width: 400, height: 100, fontSize: 32, iconSize: 1 }
  };
  
  const s = sizes[size];
  
  const variants = {
    default: {
      textColor: '#0f172a',
      textAccent: '#3B82F6',
      tagline: '#64748B',
      iconStroke: 'url(#gradMain)',
      iconFill: ['#3B82F6', '#8B5CF6', '#EC4899'],
      atStroke: 'url(#gradMain)',
      atFill: 'url(#gradMain)'
    },
    dark: {
      textColor: '#ffffff',
      textAccent: '#3B82F6',
      tagline: '#94a3b8',
      iconStroke: 'url(#gradMain)',
      iconFill: ['#3B82F6', '#8B5CF6', '#EC4899'],
      atStroke: '#3B82F6',
      atFill: '#3B82F6'
    },
    light: {
      textColor: '#0f172a',
      textAccent: '#3B82F6',
      tagline: '#64748b',
      iconStroke: 'url(#gradMain)',
      iconFill: ['#3B82F6', '#8B5CF6', '#EC4899'],
      atStroke: '#3B82F6',
      atFill: '#3B82F6'
    },
    gradient: {
      textColor: '#ffffff',
      textAccent: '#ffffff',
      tagline: 'rgba(255,255,255,0.8)',
      iconStroke: 'white',
      iconFill: ['white', 'white', 'white'],
      atStroke: 'white',
      atFill: 'white'
    },
    mono: {
      textColor: '#0f172a',
      textAccent: '#0f172a',
      tagline: '#64748b',
      iconStroke: '#0f172a',
      iconFill: ['#0f172a', '#0f172a', '#0f172a'],
      atStroke: '#0f172a',
      atFill: '#0f172a'
    }
  };
  
  const v = variants[variant];
  
  return (
    <svg 
      width={s.width} 
      height={s.height} 
      viewBox={`0 0 ${s.width} ${s.height}`} 
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{`
        ${animated ? `
        @keyframes morphAt {
          0%, 100% { 
            transform: rotate(0deg) scale(1);
            filter: hue-rotate(0deg);
          }
          25% { 
            transform: rotate(90deg) scale(1.1);
            filter: hue-rotate(90deg);
          }
          50% { 
            transform: rotate(180deg) scale(1);
            filter: hue-rotate(180deg);
          }
          75% { 
            transform: rotate(270deg) scale(1.1);
            filter: hue-rotate(270deg);
          }
        }
        
        @keyframes orbitDots {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .at-morph { 
          animation: morphAt 8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          transform-origin: center;
        }
        
        .orbit-container {
          animation: orbitDots 12s linear infinite;
          transform-origin: center;
        }
        ` : ''}
      `}</style>
      
      <defs>
        <linearGradient id="gradMain" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#8B5CF6', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#EC4899', stopOpacity: 1 }} />
        </linearGradient>
        
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Icône */}
      <g transform={`translate(${10 * s.iconSize}, ${15 * s.iconSize}) scale(${s.iconSize})`}>
        {/* Cercles */}
        <circle cx="30" cy="30" r="28" fill="none" stroke={v.iconStroke} strokeWidth="2" opacity="0.3"/>
        <circle cx="30" cy="30" r="22" fill="none" stroke={v.iconStroke} strokeWidth="3"/>
        
        {/* Graphique */}
        <g opacity="0.9">
          <path d="M 15 40 Q 20 30 25 35 T 35 25 T 45 30" 
                fill="none" 
                stroke={v.iconStroke} 
                strokeWidth="3" 
                strokeLinecap="round"/>
          <circle cx="15" cy="40" r="3" fill={v.iconFill[0]}/>
          <circle cx="25" cy="35" r="3" fill={v.iconFill[1]}/>
          <circle cx="35" cy="25" r="3" fill={v.iconFill[2]}/>
          <circle cx="45" cy="30" r="3" fill={v.iconFill[1]}/>
        </g>
        
        {/* Points orbitants */}
        {animated && (
          <g className="orbit-container">
            <circle cx="30" cy="2" r="2" fill={v.iconFill[0]} opacity="0.8"/>
            <circle cx="58" cy="30" r="2" fill={v.iconFill[1]} opacity="0.8"/>
            <circle cx="30" cy="58" r="2" fill={v.iconFill[2]} opacity="0.8"/>
          </g>
        )}
      </g>
      
      {/* Texte LeadSynch */}
      <text 
        x={size === 'small' ? 55 : size === 'medium' ? 70 : 95} 
        y={s.height * 0.55} 
        fontFamily="'SF Pro Display', 'Inter', -apple-system, sans-serif" 
        fontSize={s.fontSize} 
        fontWeight="700" 
        fill={v.textColor}
        letterSpacing="-0.5"
      >
        Lead<tspan fill={v.textAccent} fontWeight="300">Synch</tspan>
      </text>
      
      {/* @ animé */}
      <g 
        className={animated ? "at-morph" : ""} 
        transform={`translate(${s.width - (size === 'small' ? 35 : size === 'medium' ? 50 : 70)}, ${s.height * 0.55})`}
      >
        <circle cx="0" cy="0" r={size === 'small' ? 8 : size === 'medium' ? 10 : 14} fill="none" stroke={v.atStroke} strokeWidth={size === 'small' ? 2 : 3}/>
        <circle cx="0" cy="0" r={size === 'small' ? 3 : size === 'medium' ? 4 : 6} fill={v.atFill}/>
        <path 
          d={size === 'small' ? "M 5,0 A 5,5 0 0,1 0,5 L 0,2" : size === 'medium' ? "M 7,0 A 7,7 0 0,1 0,7 L 0,2" : "M 9,0 A 9,9 0 0,1 0,9 L 0,3"} 
          stroke={v.atStroke} 
          strokeWidth={size === 'small' ? 2 : 3} 
          fill="none" 
          strokeLinecap="round"
        />
        <circle cx="0" cy="0" r={size === 'small' ? 1.5 : 2} fill="white" opacity="0.9"/>
      </g>
      
      {/* Tagline */}
      {size !== 'small' && (
        <text 
          x={size === 'medium' ? 70 : 95} 
          y={s.height * 0.85} 
          fontFamily="'Inter', sans-serif" 
          fontSize={size === 'medium' ? 9 : 12} 
          fontWeight="500" 
          fill={v.tagline}
          letterSpacing="1.5"
        >
          CRM & LEAD MANAGEMENT PLATFORM
        </text>
      )}
    </svg>
  );
}

// Export des variantes pré-configurées
export const LogoDefault = (props) => <LeadSynchLogo variant="default" {...props} />;
export const LogoDark = (props) => <LeadSynchLogo variant="dark" {...props} />;
export const LogoLight = (props) => <LeadSynchLogo variant="light" {...props} />;
export const LogoGradient = (props) => <LeadSynchLogo variant="gradient" {...props} />;
export const LogoMono = (props) => <LeadSynchLogo variant="mono" {...props} />;
