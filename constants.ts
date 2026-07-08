
import { Badge, Chakra, AudioTrack, SoundscapeOption } from './types';
import { CloudRain, Music, Waves, Trees } from 'lucide-react';

export const INITIAL_BADGES: Badge[] = [
  { id: 'seed', name: 'Commitment Seed', icon: '🌱', description: '3-Day Streak', unlocked: false },
  { id: 'seed', name: 'Commitment Seed', icon: '🌱', description: '3-Day Streak', unlocked: false },
  { id: 'walker', name: 'Rhythm Walker', icon: '🚶‍♂️', description: '7-Day Streak', unlocked: false },
  { id: 'sculptor', name: 'Habit Sculptor', icon: '🧘‍♂️', description: '21-Day Streak', unlocked: false },
  { id: 'fire', name: 'Inner Fire', icon: '🔥', description: 'Early Morning Session', unlocked: false },
];

export const MOCK_TESTIMONIALS = [
  { id: 1, name: "Sarah J.", text: "I broke my anxiety loop in 4 days.", tag: "Anxiety Relief" },
  { id: 2, name: "Mike T.", text: "Finally slept in 11 minutes after 4-7-8.", tag: "Better Sleep" },
];

export const AVAILABLE_SOUNDSCAPES: SoundscapeOption[] = [
  { id: 'DRONE', label: 'Zen Drone', icon: Music, color: 'text-purple-400' },
  { id: 'RAIN', label: 'Soft Rain', icon: CloudRain, color: 'text-blue-400' },
  { id: 'OCEAN', label: 'Ocean Waves', icon: Waves, color: 'text-cyan-400' },
  { id: 'FOREST', label: 'Windy Forest', icon: Trees, color: 'text-green-400' },
];

const CHAKRA_BASE_URL = "https://storage.googleapis.com/schoolbreathvideos/Chakra%20version%202";
const CHAKRA_AUDIO_BASE = "https://storage.googleapis.com/7chakra-healing-music";
const CHAKRA_IMAGE_BASE = "https://storage.googleapis.com/7chakra-healing-music/7-ChakraImages/Charka%20Images%20for%20App";

export const CHAKRAS: Chakra[] = [
  { 
    id: 'root', 
    name: 'Root', 
    mantra: 'LAM',
    sanskritName: 'Muladhara', 
    color: '#EF4444', 
    colorClass: 'bg-red-500', 
    description: 'Grounding, stability, physical identity.', 
    frequency: '396 Hz',
    visualUrl: `${CHAKRA_BASE_URL}/rootchakramusic.mp4`,
    audioUrl: `${CHAKRA_AUDIO_BASE}/Rootchakra_v2.mp3`,
    thumbnail: `${CHAKRA_IMAGE_BASE}/Rootchakra.png`
  },
  { 
    id: 'sacral', 
    name: 'Sacral', 
    mantra: 'VAM',
    sanskritName: 'Svadhisthana', 
    color: '#F97316', 
    colorClass: 'bg-orange-500', 
    description: 'Creativity, pleasure, sexuality.', 
    frequency: '417 Hz',
    visualUrl: `${CHAKRA_BASE_URL}/sacralchakramusic.mp4`,
    audioUrl: `${CHAKRA_AUDIO_BASE}/Sacralchakra_v2.mp3`,
    thumbnail: `${CHAKRA_IMAGE_BASE}/Sacral%20Chakra.png`
  },
  { 
    id: 'solar', 
    name: 'Solar', 
    mantra: 'RAM',
    sanskritName: 'Manipura', 
    color: '#EAB308', 
    colorClass: 'bg-yellow-500', 
    description: 'Confidence, personal power.', 
    frequency: '528 Hz',
    visualUrl: `${CHAKRA_BASE_URL}/solarplexuschakramusic.mp4`,
    audioUrl: `${CHAKRA_AUDIO_BASE}/SolarPlexus_v2.mp3`,
    thumbnail: `${CHAKRA_IMAGE_BASE}/SolarPlexus.png`
  },
  { 
    id: 'heart', 
    name: 'Heart', 
    mantra: 'YAM',
    sanskritName: 'Anahata', 
    color: '#22C55E', 
    colorClass: 'bg-green-500', 
    description: 'Love, compassion, healing.', 
    frequency: '639 Hz',
    visualUrl: `${CHAKRA_BASE_URL}/Heartchakramusic.mp4`,
    thumbnail: `${CHAKRA_IMAGE_BASE}/HeartChakra.png`
  },
  { 
    id: 'throat', 
    name: 'Throat', 
    mantra: 'HAM',
    sanskritName: 'Vishuddha', 
    color: '#3B82F6', 
    colorClass: 'bg-blue-500', 
    description: 'Truth, communication, expression.', 
    frequency: '741 Hz',
    visualUrl: `${CHAKRA_BASE_URL}/throatchakramusic.mp4`,
    audioUrl: `${CHAKRA_AUDIO_BASE}/ThroatChakra_v2.mp3`,
    thumbnail: `${CHAKRA_IMAGE_BASE}/ThroatChakra.png`
  },
  { 
    id: 'third_eye', 
    name: '3rdEye', 
    mantra: 'OM',
    sanskritName: 'Ajna', 
    color: '#6366F1', 
    colorClass: 'bg-indigo-500', 
    description: 'Intuition, clarity, insight.', 
    frequency: '852 Hz',
    visualUrl: `${CHAKRA_BASE_URL}/thirdeyechakramusic.mp4`,
    audioUrl: `${CHAKRA_AUDIO_BASE}/ThirdEye_v2.mp3`,
    thumbnail: `${CHAKRA_IMAGE_BASE}/3rdEyechakra.png`
  },
  { 
    id: 'crown', 
    name: 'Crown', 
    mantra: 'OM',
    sanskritName: 'Sahasrara', 
    color: '#A855F7', 
    colorClass: 'bg-violet-500', 
    description: 'Spiritual connection, enlightenment.', 
    frequency: '963 Hz',
    visualUrl: `${CHAKRA_BASE_URL}/crownchakramusic.mp4`,
    audioUrl: `${CHAKRA_AUDIO_BASE}/Crownchakra_v2.mp3`,
    thumbnail: `${CHAKRA_IMAGE_BASE}/CrownChakra.png`
  },
];

export const GUIDED_SESSIONS: AudioTrack[] = [
  { 
    id: 'morning_clarity', 
    title: 'Morning Clarity', 
    duration: 300, 
    category: 'GUIDED', 
    tags: ['Morning', 'Focus'], 
    description: 'Start your day with intention and clarity.', 
    color: 'bg-brand-sunset', 
    teacher: 'Abhi',
    releaseDate: 1735689600000,
    patternId: 'ENERGY', 
    pointsReward: 25,
    audioUrl: "https://storage.googleapis.com/schoolbreathvideos/Guided%20Meditations/SOBreath%20Guided%20Meditations%20version%202/Meditate%20for%20Higher%20Consciousness-enhanced-v2%20(Cover).wav"
  },
  { 
    id: 'root_chakra_guided', 
    title: 'Root Chakra Grounding', 
    duration: 720, 
    category: 'GUIDED', 
    tags: ['Chakra', 'Grounding'], 
    description: 'Establish stability and physical security.', 
    color: 'bg-red-500', 
    teacher: 'Abhi',
    releaseDate: 1736467200000,
    pointsReward: 30 
  },
  { 
    id: 'yoga_nidra_rest', 
    title: 'Yoga Nidra for Deep Rest', 
    duration: 1500, 
    category: 'GUIDED', 
    tags: ['Yoga Nidra', 'Rest'], 
    description: 'A effortless journey into psychic sleep.', 
    color: 'bg-indigo-400', 
    teacher: 'Sarah J.',
    releaseDate: 1736553600000,
    pointsReward: 50 
  },
  { 
    id: 'ancient_breath_wisdom', 
    title: 'Wisdom of the Vedic Breath', 
    duration: 900, 
    category: 'GUIDED', 
    tags: ['Ancient Wisdom', 'Philosophy'], 
    description: 'Deep dive into traditional pranayama secrets.', 
    color: 'bg-brand-gold', 
    teacher: 'GURU Shanti',
    releaseDate: 1736640000000,
    pointsReward: 40 
  },
  { 
    id: 'energy_activation_abhi', 
    title: 'Pranic Vitality Surge', 
    duration: 600, 
    category: 'GUIDED', 
    tags: ['Morning', 'Energy'], 
    description: 'Ignite your inner fire for the day ahead.', 
    color: 'bg-orange-500', 
    teacher: 'Abhi',
    releaseDate: 1736726400000,
    pointsReward: 35 
  },
  { 
    id: 'heart_healing_mantra', 
    title: 'Heart Healing Journey', 
    duration: 1200, 
    category: 'GUIDED', 
    tags: ['Healing', 'Mantra'], 
    description: 'Emotional release through sacred sound.', 
    color: 'bg-emerald-500', 
    teacher: 'Amrita',
    releaseDate: 1736812800000,
    pointsReward: 45 
  },
  { 
    id: 'deep_sleep_release', 
    title: 'Deep Sleep Release', 
    duration: 600, 
    category: 'SLEEP', 
    tags: ['Sleep', 'Rest'], 
    description: 'Let go of the day and drift off.', 
    color: 'bg-brand-purple', 
    teacher: 'Abhi',
    releaseDate: 1735862400000,
    pointsReward: 30 
  },
  { 
    id: 'full_body_432', 
    title: 'Full Body Healing 432 Hz', 
    duration: 1200, 
    category: 'SLEEP', 
    tags: ['Healing', 'Deep Rest'], 
    description: 'A deep restorative journey at the frequency of nature.', 
    color: 'bg-brand-lavender', 
    teacher: 'Universal',
    releaseDate: 1735948800000,
    pointsReward: 40,
    audioUrl: "https://storage.googleapis.com/sleepmusic/Full%20body%20Healing%20432%20Hz.mp3"
  },
];

const MANTRA_AUDIO_BASE = "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/Mantras%20/Mantra%20Audios/";

export const SHIVA_TRACKS: AudioTrack[] = [
  { 
    id: 'shiva_success', 
    title: 'Om Namah Shivaya (Obstacle Destroyer)', 
    duration: 600, 
    category: 'SHIVA', 
    tags: ['Success', 'Power'], 
    description: 'An ancient mantra that destroys obstacles and brings success.', 
    color: 'bg-[#1e1b4b]', 
    pointsReward: 50, 
    audioUrl: `${MANTRA_AUDIO_BASE}Om%20Namah%20Shivaya%20%20Ancient%20Mantra%20That%20Destroys%20Obstacles%20and%20Brings%20Success.mp3`,
    deity: 'SHIVA',
    benefit: 'ENERGY',
    difficulty: 'BEGINNER',
    popularityScore: 15400
  },
  { 
    id: 'shiva_meditation_powerful', 
    title: 'Om Namah Shivaya (Powerful Meditation)', 
    duration: 480, 
    category: 'SHIVA', 
    tags: ['Meditation', 'Focus'], 
    description: 'Most powerful meditation mantra for deep stillness.', 
    color: 'bg-[#312e81]', 
    pointsReward: 50, 
    audioUrl: `${MANTRA_AUDIO_BASE}Om%20Namah%20Shivaya%20%20Most%20Powerful%20Meditation%20Mantra.mp3`,
    deity: 'SHIVA',
    benefit: 'CALM',
    difficulty: 'BEGINNER',
    popularityScore: 22000
  },
  { 
    id: 'shiva_healing_peace', 
    title: 'Om Namah Shivaya (Healing & Peace)', 
    duration: 900, 
    category: 'SHIVA', 
    tags: ['Healing', 'Peace'], 
    description: 'Mantra for deep healing, protection and inner peace.', 
    color: 'bg-[#4338ca]', 
    pointsReward: 60, 
    audioUrl: `${MANTRA_AUDIO_BASE}Om%20Namah%20Shivaya%20Mantra%20for%20Deep%20Healing%2C%20Protection%20%26%20Inner%20Peace%20%2815Min%20Meditation%29.mp3`,
    deity: 'SHIVA',
    benefit: 'HEALING',
    difficulty: 'BEGINNER',
    popularityScore: 18900
  },
  { 
    id: 'shiva_karma_cleansing', 
    title: 'Karacharana Kritam Vaa (Karma Cleansing)', 
    duration: 360, 
    category: 'SHIVA', 
    tags: ['Purification', 'Karma'], 
    description: 'Powerful Shiva mantra for karma cleansing and purification.', 
    color: 'bg-[#3730a3]', 
    pointsReward: 40, 
    audioUrl: `${MANTRA_AUDIO_BASE}Powerful%20Shiva%20Mantra%20for%20Karma%20Cleansing%20and%20Purification%20%20Karacharana%20Kritam%20Vaa.mp3`,
    deity: 'SHIVA',
    benefit: 'FORGIVENESS',
    difficulty: 'INTERMEDIATE',
    popularityScore: 9200
  },
  { 
    id: 'shiva_gayatri', 
    title: 'Shiv Gayatri Mantra', 
    duration: 300, 
    category: 'SHIVA', 
    tags: ['Wisdom', 'Meditation'], 
    description: 'Om Tatpurushaya Vidmahe — Chants for meditation and clarity.', 
    color: 'bg-[#1e1b4b]', 
    pointsReward: 50, 
    audioUrl: `${MANTRA_AUDIO_BASE}Shiv%20Gayatri%20Mantra%20%20Om%20Tatpurushaya%20Vidmahe%20-%20Chants%20For%20Meditation.mp3`,
    deity: 'SHIVA',
    benefit: 'ENERGY',
    difficulty: 'BEGINNER',
    popularityScore: 12100
  },
  { 
    id: 'shiva_protection', 
    title: 'Shiva Protection Mantra', 
    duration: 540, 
    category: 'SHIVA', 
    tags: ['Protection', 'Shield'], 
    description: 'Shield yourself from negative energy and start fresh.', 
    color: 'bg-[#4c1d95]', 
    pointsReward: 50, 
    audioUrl: `${MANTRA_AUDIO_BASE}Shiva%20Mantra%20for%20Protection%202026%20_%20Shield%20Yourself%20from%20Negative%20Energy%20%26%20Start%20Fresh.mp3`,
    deity: 'SHIVA',
    benefit: 'PROTECTION',
    difficulty: 'BEGINNER',
    popularityScore: 14500
  },
  { 
    id: 'shiva_spiritual_growth', 
    title: 'Rapid Spiritual Growth Mantra', 
    duration: 660, 
    category: 'SHIVA', 
    tags: ['Ascension', 'Growth'], 
    description: 'The most powerful Shiva mantra for rapid spiritual growth.', 
    color: 'bg-[#5b21b6]', 
    pointsReward: 70, 
    audioUrl: `${MANTRA_AUDIO_BASE}The%20MOST%20POWERFUL%20Shiva%20Mantra%20for%20RAPID%20SPIRITUAL%20GROWTH.mp3`,
    deity: 'SHIVA',
    benefit: 'ENERGY',
    difficulty: 'ADVANCED',
    popularityScore: 8800
  },
  { 
    id: 'shiva_energy_vibe', 
    title: 'Lord Shiva Power Vibration', 
    duration: 320, 
    category: 'SHIVA', 
    tags: ['Vibration', 'Power'], 
    description: 'Experience the intense energy of this powerful Lord Shiva mantra.', 
    color: 'bg-[#6d28d9]', 
    pointsReward: 45, 
    audioUrl: `${MANTRA_AUDIO_BASE}You%20Won%27t%20Believe%20the%20Energy%20of%20This%20Powerful%20Lord%20Shiva%20Mantra%21%20%281%29.mp3`,
    deity: 'SHIVA',
    benefit: 'ENERGY',
    difficulty: 'INTERMEDIATE',
    popularityScore: 11000
  },
];

export const MANTRAS: AudioTrack[] = [
  // KRISHNA
  { 
    id: 'krishna_peace_healing', 
    title: 'Hare Krishna (Peace & Healing)', 
    duration: 600, 
    category: 'MANTRA', 
    tags: ['Peace', 'Healing', 'Bhakti'], 
    description: 'Hare Krishna Mahamantra for deep spiritual peace and healing.', 
    color: 'bg-cyan-500',
    deity: 'KRISHNA',
    benefit: 'HEALING',
    difficulty: 'BEGINNER',
    audioUrl: `${MANTRA_AUDIO_BASE}Hare%20Krishna%20Mahamantra%20for%20Deep%20Spiritual%20Peace%20%26%20Healing.mp3`,
    popularityScore: 19500
  },
  { 
    id: 'krishna_meditation', 
    title: 'Hare Krishna Hare Rama', 
    duration: 480, 
    category: 'MANTRA', 
    tags: ['Meditation', 'Joy'], 
    description: 'Mahamantra for meditation and profound inner peace.', 
    color: 'bg-blue-400',
    deity: 'KRISHNA',
    benefit: 'CALM',
    difficulty: 'BEGINNER',
    audioUrl: `${MANTRA_AUDIO_BASE}Hare%20Krishna%20Hare%20Rama%20Mahamantra%20for%20Meditation%20%26%20Inner%20Peace.mp3`,
    popularityScore: 17200
  },
  { 
    id: 'krishna_school_mantras', 
    title: 'Chanting Hare Krishna', 
    duration: 300, 
    category: 'MANTRA', 
    tags: ['Chanting', 'Energy'], 
    description: 'A rhythmic rendition of the Hare Krishna mantra.', 
    color: 'bg-sky-600',
    deity: 'KRISHNA',
    benefit: 'ENERGY',
    difficulty: 'BEGINNER',
    audioUrl: `${MANTRA_AUDIO_BASE}The%20School%20of%20Mantras%20Chanting%20HARE%20KRISHNA.mp3`,
    popularityScore: 12000
  },
  // GANESHA
  { 
    id: 'ganesha_vakratunda', 
    title: 'Vakratunda Mahakaya', 
    duration: 180, 
    category: 'MANTRA', 
    tags: ['Obstacles', 'New Beginnings'], 
    description: 'Ganesha mantra for removing obstacles and spiritual growth.', 
    color: 'bg-red-600',
    deity: 'GANESHA',
    benefit: 'CONFIDENCE',
    difficulty: 'BEGINNER',
    audioUrl: `${MANTRA_AUDIO_BASE}Ganesha%20Mantra%20Vakratund%20Mahakaya%20The%20SECRET%20to%20Spiritual%20Growth.mp3`,
    popularityScore: 25000
  },
  // HANUMAN
  { 
    id: 'hanuman_chalisa_master', 
    title: 'Hanuman Chalisa (Life Changing)', 
    duration: 600, 
    category: 'MANTRA', 
    tags: ['Strength', 'Devotion'], 
    description: 'Master the Hanuman Chalisa for life-changing strength and protection.', 
    color: 'bg-orange-700',
    deity: 'HANUMAN',
    benefit: 'PROTECTION',
    difficulty: 'INTERMEDIATE',
    audioUrl: `${MANTRA_AUDIO_BASE}Master%20HANUMAN%20CHALISA%20in%2040%20Days%20for%20Life%20Changing%20Results.mp3`,
    popularityScore: 32000
  },
  { 
    id: 'hanuman_stuti_strength', 
    title: 'Hanuman Stuti for Strength', 
    duration: 300, 
    category: 'MANTRA', 
    tags: ['Strength', 'Protection'], 
    description: 'Powerful Hanuman Stuti for immense physical and mental strength.', 
    color: 'bg-amber-600',
    deity: 'HANUMAN',
    benefit: 'ENERGY',
    difficulty: 'BEGINNER',
    audioUrl: `${MANTRA_AUDIO_BASE}The%20MOST%20POWERFUL%20Hanuman%20Stuti%20for%20STRENGTH%20and%20Protection.mp3`,
    popularityScore: 21000
  },
  // UNIVERSAL
  { 
    id: 'universal_gayatri', 
    title: 'Gayatri Mantra (Positive Energy)', 
    duration: 300, 
    category: 'MANTRA', 
    tags: ['Universal', 'Light'], 
    description: 'Om Bhur Bhuvah Swaha — Invoke the light of the inner sun.', 
    color: 'bg-yellow-500',
    deity: 'UNIVERSAL',
    benefit: 'ENERGY',
    difficulty: 'BEGINNER',
    audioUrl: `${MANTRA_AUDIO_BASE}Gayatri%20Mantra%20for%20Positive%20Energy%20-%20Om%20Bhur%20Bhuvah%20Swaha.mp3`,
    popularityScore: 45000
  },
  { 
    id: 'universal_shanti_study', 
    title: 'Om Shanti (Focus & Study)', 
    duration: 120, 
    category: 'MANTRA', 
    tags: ['Study', 'Focus'], 
    description: 'Ideal mantra before beginning study or meditation for focus.', 
    color: 'bg-teal-600',
    deity: 'UNIVERSAL',
    benefit: 'CALM',
    difficulty: 'BEGINNER',
    audioUrl: `${MANTRA_AUDIO_BASE}Mantra%20Before%20Beginning%20Study%20or%20Meditation%20-%20Om%20Shanti.mp3`,
    popularityScore: 18000
  },
  { 
    id: 'universal_shanti_peace', 
    title: 'Shanti Mantra for Peace', 
    duration: 240, 
    category: 'MANTRA', 
    tags: ['Peace', 'Universal'], 
    description: 'A traditional mantra for establishing profound inner and outer peace.', 
    color: 'bg-emerald-500',
    deity: 'UNIVERSAL',
    benefit: 'CALM',
    difficulty: 'BEGINNER',
    audioUrl: `${MANTRA_AUDIO_BASE}Shanti%20Mantra%20for%20Peace.mp3`,
    popularityScore: 22500
  },
  { 
    id: 'universal_lokah', 
    title: 'Lokah Samastah (World Peace)', 
    duration: 300, 
    category: 'MANTRA', 
    tags: ['Healing', 'Peace'], 
    description: 'May all beings everywhere be happy and free. A mantra for healing.', 
    color: 'bg-green-600',
    deity: 'UNIVERSAL',
    benefit: 'HEALING',
    difficulty: 'BEGINNER',
    audioUrl: `${MANTRA_AUDIO_BASE}Mantra%20for%20Healing%20%26%20Peace%20-%20Lokah%20Samastah%20Sukhino%20Bhavantu.mp3`,
    popularityScore: 16400
  },
  { 
    id: 'universal_liberation', 
    title: 'Mantra for Liberation', 
    duration: 600, 
    category: 'MANTRA', 
    tags: ['Liberation', 'Peace'], 
    description: 'Om Namah Shivaya rendition focused on inner peace and liberation.', 
    color: 'bg-indigo-700',
    deity: 'UNIVERSAL',
    benefit: 'FORGIVENESS',
    difficulty: 'INTERMEDIATE',
    audioUrl: `${MANTRA_AUDIO_BASE}Mantra%20for%20Inner%20Peace%20and%20Liberation%20-%20Om%20Nama%20Shivaya.mp3`,
    popularityScore: 11200
  },
  { 
    id: 'universal_kundalini', 
    title: 'Kundalini Awakening Mantra', 
    duration: 420, 
    category: 'MANTRA', 
    tags: ['Energy', 'Power'], 
    description: 'Activate your spiritual energy and divine power.', 
    color: 'bg-purple-700',
    deity: 'UNIVERSAL',
    benefit: 'ENERGY',
    difficulty: 'ADVANCED',
    audioUrl: `${MANTRA_AUDIO_BASE}Kundalini%20Awakening%20Mantra%20Activate%20Your%20Spiritual%20Energy%20%26%20Divine%20Power.mp3`,
    popularityScore: 9800
  },
  { 
    id: 'universal_om_intuition', 
    title: 'OM Chant (Intuition)', 
    duration: 300, 
    category: 'MANTRA', 
    tags: ['Intuition', 'Third Eye'], 
    description: 'Sharpen intuition and open the Third Eye with the OM chant.', 
    color: 'bg-brand-dark',
    deity: 'UNIVERSAL',
    benefit: 'CALM',
    difficulty: 'BEGINNER',
    audioUrl: `${MANTRA_AUDIO_BASE}Mantra%20to%20Sharpen%20Intuition%20and%20Open%20Third%20Eye%20-%20OM%20Chant.mp3`,
    popularityScore: 28000
  }
];

export const PODCASTS: AudioTrack[] = [
  { id: 'wisdom_beyond_words', title: 'Wisdom Beyond Words', duration: 1200, category: 'PODCAST', tags: ['Spirituality', 'Talk'], description: 'Deep conversations on the power of silence.', color: 'bg-stone-600', pointsReward: 50 },
];

export const MORNING_QUOTES = [
  "Today is a gift. I will unwrap it with presence.",
  "I am capable, calm, and ready to flow with life.",
  "My breath is my anchor, my intention is my sail.",
  "I choose peace over perfection today.",
  "What is for me will not pass me.",
  "I attract energy and radiate kindness.",
  "Small steps today lead to big changes tomorrow."
];

export const WATCH_PARTY_VIDEOS = [
    { id: 'inpok4MKVLM', title: 'Deep Healing Breathwork' }, 
    { id: 'Ty96h5WfpSM', title: '10 Minute Inner Peace' },
    { id: 'zSkFFW--Ma0', title: 'Calm The Mind' },
    { id: '1sRk0R39FSI', title: 'Morning Energy Flow' }
];
