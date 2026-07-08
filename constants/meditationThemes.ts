export interface MeditationTheme {
  id: string;
  gradient: string; // CSS gradient
  accentColor: string;
  pattern: 'mandala' | 'lotus' | 'chakra' | 'waves' | 'sacred-geo' | 'om';
  textColor: string;
}

export const MEDITATION_THEMES: Record<string, MeditationTheme> = {
  
  // Calming Blues & Teals
  dopamineDetox: {
    id: 'dopamine-detox',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    accentColor: '#A78BFA',
    pattern: 'mandala',
    textColor: '#FFFFFF'
  },
  
  // Warm Oranges & Pinks
  balanceHormones: {
    id: 'balance-hormones',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    accentColor: '#FCA5A5',
    pattern: 'lotus',
    textColor: '#FFFFFF'
  },
  
  // Greens & Earth Tones
  harmony: {
    id: 'harmony',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    accentColor: '#6EE7B7',
    pattern: 'waves',
    textColor: '#FFFFFF'
  },
  
  // Deep Purples
  muscleRelaxation: {
    id: 'muscle-relaxation',
    gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    accentColor: '#DDD6FE',
    pattern: 'sacred-geo',
    textColor: '#4C1D95'
  },
  
  // Soft Pinks & Lavender
  embraceYou: {
    id: 'embrace-you',
    gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    accentColor: '#FBBF24',
    pattern: 'lotus',
    textColor: '#92400E'
  },
  
  // Turquoise & Aqua
  stressRelief: {
    id: 'stress-relief',
    gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    accentColor: '#22D3EE',
    pattern: 'waves',
    textColor: '#FFFFFF'
  },
  
  // Golds & Ambers
  manifestAbundance: {
    id: 'manifest-abundance',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    accentColor: '#FCD34D',
    pattern: 'om',
    textColor: '#78350F'
  },
  
  // Deep Navy & Indigo
  deepSleep: {
    id: 'deep-sleep',
    gradient: 'linear-gradient(135deg, #4e54c8 0%, #8f94fb 100%)',
    accentColor: '#818CF8',
    pattern: 'mandala',
    textColor: '#FFFFFF'
  },
  
  // Fiery Reds & Oranges
  tummoBreath: {
    id: 'tummo-breath',
    gradient: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)',
    accentColor: '#FB923C',
    pattern: 'chakra',
    textColor: '#FFFFFF'
  },
  
  // Calming Sage & Mint
  anxietyRelief: {
    id: 'anxiety-relief',
    gradient: 'linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)',
    accentColor: '#86EFAC',
    pattern: 'waves',
    textColor: '#166534'
  },
  
  // Rose & Coral
  selfLove: {
    id: 'self-love',
    gradient: 'linear-gradient(135deg, #ffecd2 0%, #ff9a9e 100%)',
    accentColor: '#FDA4AF',
    pattern: 'lotus',
    textColor: '#FFFFFF'
  },
  
  // Purple & Pink Aurora
  manifestDesires: {
    id: 'manifest-desires',
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    accentColor: '#E9D5FF',
    pattern: 'sacred-geo',
    textColor: '#FFFFFF'
  }
};

// Helper function to get theme by meditation name
export const getMeditationTheme = (name: string, index: number = 0): MeditationTheme => {
  const lowerName = name.toLowerCase();
  
  // Direct name matches
  if (lowerName.includes('dopamine') || lowerName.includes('detox')) {
    return MEDITATION_THEMES.dopamineDetox;
  }
  if (lowerName.includes('hormone') || lowerName.includes('balance')) {
    return MEDITATION_THEMES.balanceHormones;
  }
  if (lowerName.includes('harmony')) {
    return MEDITATION_THEMES.harmony;
  }
  if (lowerName.includes('muscle') || lowerName.includes('relaxation')) {
    return MEDITATION_THEMES.muscleRelaxation;
  }
  if (lowerName.includes('embrace') || lowerName.includes('you')) {
    return MEDITATION_THEMES.embraceYou;
  }
  if (lowerName.includes('stress') || lowerName.includes('relief')) {
    return MEDITATION_THEMES.stressRelief;
  }
  if (lowerName.includes('abundance') || lowerName.includes('manifest')) {
    return MEDITATION_THEMES.manifestAbundance;
  }
  if (lowerName.includes('deep sleep') || lowerName.includes('sleep')) {
    return MEDITATION_THEMES.deepSleep;
  }
  if (lowerName.includes('tummo') || lowerName.includes('breath')) {
    return MEDITATION_THEMES.tummoBreath;
  }
  if (lowerName.includes('anxiety')) {
    return MEDITATION_THEMES.anxietyRelief;
  }
  if (lowerName.includes('self-love') || lowerName.includes('self love')) {
    return MEDITATION_THEMES.selfLove;
  }
  if (lowerName.includes('desire')) {
    return MEDITATION_THEMES.manifestDesires;
  }
  
  // Fallback: rotate through themes based on index
  const themeKeys = Object.keys(MEDITATION_THEMES);
  const themeKey = themeKeys[index % themeKeys.length];
  return MEDITATION_THEMES[themeKey];
};

