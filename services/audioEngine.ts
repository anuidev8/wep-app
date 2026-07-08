
import { SoundscapeMode } from "../types";

// Helper: Create Noise Buffer
const createNoiseBuffer = (ctx: AudioContext, type: 'white' | 'pink' | 'brown' = 'white') => {
    const bufferSize = ctx.sampleRate * 4; // 4 seconds loop
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    if (type === 'white') {
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
    } else if (type === 'pink') {
        let b0, b1, b2, b3, b4, b5, b6;
        b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            output[i] *= 0.11; 
            b6 = white * 0.115926;
        }
    }
    return buffer;
};

// --- SYNTHESIZERS ---

export const playDrone = (ctx: AudioContext, masterGain: GainNode) => {
    try {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const osc3 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();
        const gain3 = ctx.createGain();

        osc1.frequency.value = 110; // A2
        osc2.frequency.value = 164.81; // E3
        osc3.frequency.value = 111; // Binaural beat

        gain1.gain.value = 0;
        gain2.gain.value = 0;
        gain3.gain.value = 0;

        osc1.connect(gain1).connect(masterGain);
        osc2.connect(gain2).connect(masterGain);
        osc3.connect(gain3).connect(masterGain);

        osc1.start();
        osc2.start();
        osc3.start();

        // Fade in
        const now = ctx.currentTime;
        gain1.gain.setTargetAtTime(0.1, now, 2);
        gain2.gain.setTargetAtTime(0.05, now, 2);
        gain3.gain.setTargetAtTime(0.1, now, 2);

        return () => {
            try {
                const now = ctx.currentTime;
                gain1.gain.setTargetAtTime(0, now, 0.5);
                gain2.gain.setTargetAtTime(0, now, 0.5);
                gain3.gain.setTargetAtTime(0, now, 0.5);
                setTimeout(() => { 
                    try { osc1.stop(); osc2.stop(); osc3.stop(); } catch(e){}
                }, 600);
            } catch(e){}
        };
    } catch (e) {
        console.error("Drone init error", e);
        return () => {};
    }
};

export const playRain = (ctx: AudioContext, masterGain: GainNode) => {
    try {
        const buffer = createNoiseBuffer(ctx, 'pink');
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        const gain = ctx.createGain();
        gain.gain.value = 0;

        source.connect(filter).connect(gain).connect(masterGain);
        source.start();

        gain.gain.setTargetAtTime(0.15, ctx.currentTime, 2);

        return () => {
            try {
                gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
                setTimeout(() => { try { source.stop(); } catch(e){} }, 600);
            } catch(e){}
        };
    } catch(e) {
        console.error("Rain init error", e);
        return () => {};
    }
};

export const playOcean = (ctx: AudioContext, masterGain: GainNode) => {
    try {
        const buffer = createNoiseBuffer(ctx, 'pink');
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // Modulate filter to simulate waves
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1; // 10 seconds per wave

        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 300; // Modulate frequency by +/- 300Hz

        lfo.connect(lfoGain).connect(filter.frequency);
        
        const gain = ctx.createGain();
        gain.gain.value = 0;

        source.connect(filter).connect(gain).connect(masterGain);
        source.start();
        lfo.start();

        gain.gain.setTargetAtTime(0.2, ctx.currentTime, 3);

        return () => {
            try {
                gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
                setTimeout(() => { try { source.stop(); lfo.stop(); } catch(e){} }, 600);
            } catch(e){}
        };
    } catch (e) {
        console.error("Ocean init error", e);
        return () => {};
    }
};

export const playForest = (ctx: AudioContext, masterGain: GainNode) => {
    try {
        // Wind (Pink Noise through Bandpass)
        const buffer = createNoiseBuffer(ctx, 'pink');
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 400;
        
        const lowFilter = ctx.createBiquadFilter();
        lowFilter.type = 'lowpass';
        lowFilter.frequency.value = 1200;

        const gain = ctx.createGain();
        gain.gain.value = 0;

        source.connect(filter).connect(lowFilter).connect(gain).connect(masterGain);
        source.start();

        gain.gain.setTargetAtTime(0.08, ctx.currentTime, 2);

        return () => {
            try {
                gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
                setTimeout(() => { try { source.stop(); } catch(e){} }, 600);
            } catch(e){}
        };
    } catch(e) {
        console.error("Forest init error", e);
        return () => {};
    }
};

// Factory Function
export const playSoundscape = (mode: SoundscapeMode, ctx: AudioContext, masterGain: GainNode) => {
    switch (mode) {
        case 'DRONE': return playDrone(ctx, masterGain);
        case 'RAIN': return playRain(ctx, masterGain);
        case 'OCEAN': return playOcean(ctx, masterGain);
        case 'FOREST': return playForest(ctx, masterGain);
        default: return () => {};
    }
};
