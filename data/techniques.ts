export type TechniqueIntensity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TechniqueInfo {
  id: string;
  name: string;
  description: string;
  benefits: string[];
  cautions?: string[];
  duration: string;
  intensity: TechniqueIntensity;
  icon: string;
  detailedInstructions?: string;
  sanskritName?: string;
}

export const TECHNIQUES: Record<string, TechniqueInfo> = {
  CALM: {
    id: 'CALM',
    name: 'Diaphragmatic Breathing',
    sanskritName: 'Pranayama',
    description: 'A foundational practice that activates your body\'s natural relaxation response through deep, belly-centered breaths.',
    benefits: [
      'Activates the parasympathetic nervous system',
      'Reduces stress and anxiety',
      'Improves oxygen exchange',
      'Enhances focus and mental clarity',
      'Supports better sleep quality'
    ],
    cautions: [],
    duration: '5–10 minutes',
    intensity: 'LOW',
    icon: '🌿',
    detailedInstructions: 'Sit comfortably with your back straight. Place one hand on your belly and one on your chest. Inhale slowly through your nose, allowing your belly to expand first, then fill your lungs. Hold briefly. Exhale slowly through your nose or mouth, gently drawing your belly in. Let each breath be smooth and natural, without forcing.'
  },
  REST: {
    id: 'REST',
    name: '4-7-8 Breathing',
    sanskritName: 'Relaxation Breath',
    description: 'A gentle, rhythmic pattern that acts as a natural tranquilizer for your nervous system, perfect for preparing for rest.',
    benefits: [
      'Promotes deep relaxation',
      'Reduces insomnia',
      'Calms racing thoughts',
      'Lowers heart rate',
      'Prepares body for sleep'
    ],
    cautions: [],
    duration: '7–15 minutes',
    intensity: 'LOW',
    icon: '🌙',
    detailedInstructions: 'Inhale quietly through your nose for a count of 4. Hold your breath for a count of 7. Exhale completely through your nose or mouth for a count of 8, making a whoosh sound. Repeat this cycle 4-8 times. The key is the ratio, not the speed—find a comfortable pace that allows you to maintain the pattern.'
  },
  FOCUS: {
    id: 'FOCUS',
    name: 'Box Breathing',
    sanskritName: 'Sama Vritti',
    description: 'A balanced, square-patterned breath used by Navy SEALs and athletes to enhance performance, focus, and emotional regulation.',
    benefits: [
      'Sharpens mental focus',
      'Regulates emotions',
      'Improves performance under pressure',
      'Balances the nervous system',
      'Enhances concentration'
    ],
    cautions: [],
    duration: '3–5 minutes',
    intensity: 'MEDIUM',
    icon: '🎯',
    detailedInstructions: 'Inhale through your nose for a count of 4. Hold your breath for a count of 4. Exhale through your nose for a count of 4. Hold empty for a count of 4. Visualize tracing a square as you breathe—each side of the square represents one phase of the breath. Keep each phase equal in length.'
  },
  BALANCE: {
    id: 'BALANCE',
    name: 'Alternate Nostril Breathing',
    sanskritName: 'Nadi Shodhana',
    description: 'A harmonizing practice that balances the left and right hemispheres of your brain, creating mental clarity and emotional equilibrium.',
    benefits: [
      'Balances left and right brain',
      'Harmonizes energy channels',
      'Reduces mental chatter',
      'Enhances decision-making',
      'Promotes inner peace'
    ],
    cautions: [],
    duration: '5–10 minutes',
    intensity: 'MEDIUM',
    icon: '⚖️',
    detailedInstructions: '• Form Vishnu Mudra with your right hand: fold your index and middle fingers toward your palm.\n• Close your right nostril with your thumb and inhale through your left nostril.\n• Pinch your nose to hold.\n• Close your left nostril with your ring finger, release your thumb, and exhale through your right nostril.\n• Inhale through your right nostril.\n• Pinch your nose to hold.\n• Release your left nostril and exhale through your left.\n• This completes one cycle. Continue alternating.'
  },
  ENERGY: {
    id: 'ENERGY',
    name: 'Breath of Fire',
    sanskritName: 'Kapalabhati',
    description: 'A powerful energizing practice that stokes your inner fire, clears mental fog, and awakens vitality through rapid, rhythmic breathing.',
    benefits: [
      'Increases energy and alertness',
      'Clears mental fog',
      'Awakens vitality',
      'Stimulates the nervous system',
      'Improves circulation'
    ],
    cautions: [
      'Avoid if pregnant',
      'Not recommended for high blood pressure',
      'Skip if you have heart conditions',
      'Avoid during menstruation if uncomfortable'
    ],
    duration: '3–5 minutes',
    intensity: 'HIGH',
    icon: '🔥',
    detailedInstructions: 'Sit with a straight spine. Take a deep inhale. Now focus on sharp, forceful exhales through your nose while snapping your belly in. Let the inhale happen automatically and passively. Start with 20-30 breaths, then take a deep breath and hold for a few seconds. Rest and repeat. The emphasis is on the active exhale—the inhale should be natural and effortless.'
  },
  BHASTRIKA: {
    id: 'BHASTRIKA',
    name: 'Bhastrika',
    sanskritName: 'Bhastrika Pranayama',
    description: 'A vigorous bellows breath that forcefully pumps energy through your system, clearing stagnation and awakening your pranic body.',
    benefits: [
      'Generates intense heat and energy',
      'Clears respiratory passages',
      'Stimulates metabolism',
      'Awakens dormant energy',
      'Enhances lung capacity'
    ],
    cautions: [
      'Avoid if pregnant',
      'Not for high blood pressure',
      'Skip if you have heart conditions',
      'Avoid during menstruation',
      'Not recommended for beginners without guidance'
    ],
    duration: '1–3 minutes',
    intensity: 'HIGH',
    icon: '💨',
    detailedInstructions: 'Sit tall with your chest open. Take a deep breath in. Now forcefully inhale and exhale through your nose in rapid succession, using your diaphragm to pump the breath. Both inhale and exhale are active and equal in force. Keep your chest open and tall throughout. Start with 10-15 breaths, then take a deep breath and hold. Rest completely before the next round. Build gradually—this is an intense practice.'
  },
  BHRAMARI: {
    id: 'BHRAMARI',
    name: 'Humming Bee Breath',
    sanskritName: 'Bhramari Pranayama',
    description: 'A soothing practice that uses vibration to calm the nervous system, quiet the mind, and create a sense of inner peace.',
    benefits: [
      'Calms the nervous system',
      'Reduces anxiety and stress',
      'Quiets mental chatter',
      'Creates inner vibration',
      'Promotes deep relaxation'
    ],
    cautions: [],
    duration: '5–10 minutes',
    intensity: 'LOW',
    icon: '🐝',
    detailedInstructions: 'Come into 7 Doors Closing Mudra: close your ears with your thumbs, eyes with your index fingers, nostrils with your middle fingers, and mouth with your ring and pinky fingers. Take a deep inhale through your nose. Exhale slowly while making a low, smooth humming sound like a bee. Feel the vibration in your head, especially around your third eye. Continue for several rounds, focusing on the vibration and the sound.'
  },
  OM_INTEGRATION: {
    id: 'OM_INTEGRATION',
    name: 'OM Integration',
    sanskritName: 'Om Chanting',
    description: 'A sacred practice that uses the primordial sound of OM to integrate your breathwork practice and connect with universal consciousness.',
    benefits: [
      'Integrates your practice',
      'Creates deep resonance',
      'Connects to universal consciousness',
      'Enhances spiritual awareness',
      'Brings closure to sessions'
    ],
    cautions: [],
    duration: '3–5 minutes',
    intensity: 'LOW',
    icon: '🕉️',
    detailedInstructions: 'Sit comfortably with your eyes closed. Take a deep inhale. As you exhale, chant "OM" (A-U-M) in one continuous sound. Feel the vibration in your chest (A), throat (U), and head (M). Let the sound resonate through your entire being. Repeat 3-9 times, allowing each OM to be longer and more resonant than the last. Feel the integration of your practice as you chant.'
  }
};

export const getTechniqueInfo = (techniqueId: string): TechniqueInfo | null => {
  return TECHNIQUES[techniqueId] || null;
};

export const shouldShowIntro = (techniqueId: string): boolean => {
  const key = `technique_intro_${techniqueId}_hidden`;
  return !localStorage.getItem(key);
};

export const hideIntroForTechnique = (techniqueId: string): void => {
  const key = `technique_intro_${techniqueId}_hidden`;
  localStorage.setItem(key, 'true');
};

export const showIntroForTechnique = (techniqueId: string): void => {
  const key = `technique_intro_${techniqueId}_hidden`;
  localStorage.removeItem(key);
};

