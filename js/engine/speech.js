/* SPEECH — browser text-to-speech, speech recognition and audio recording, with graceful fallbacks. */
(function () {
  'use strict';
  const LOS = window.LOS;
  const synth = window.speechSynthesis;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  let voices = [];
  function loadVoices() { try { voices = synth ? synth.getVoices() : []; } catch (e) { voices = []; } }
  if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; }

  function voicesFor(code) {
    const pack = LOS.lang.get(code);
    const pre = (pack && pack.speech ? pack.speech : code).slice(0, 2).toLowerCase();
    return voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(pre));
  }
  function pickVoice(code) {
    const pref = (LOS.store.state.settings.tts[code] || {}).voice;
    const list = voicesFor(code);
    const pack = LOS.lang.get(code);
    return list.find((v) => v.name === pref) || list.find((v) => pack && v.lang === pack.speech) || list.find((v) => /natural|premium|enhanced|google/i.test(v.name)) || list[0] || null;
  }

  const speech = (LOS.speech = {
    get ttsSupported() { return !!synth; },
    get srSupported() { return !!SR; },
    get recSupported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder); },
    voicesFor,
    speak(text, code, opts = {}) {
      if (!synth) { if (opts.onend) opts.onend(); return null; }
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const pack = LOS.lang.get(code);
      u.lang = pack ? pack.speech : code;
      const v = pickVoice(code);
      if (v) u.voice = v;
      const base = (LOS.store.state.settings.tts[code] || {}).rate || 1;
      u.rate = Math.max(0.5, Math.min(1.6, (opts.rate || 1) * base));
      if (opts.onend) u.onend = opts.onend;
      if (opts.onboundary) u.onboundary = opts.onboundary;
      u.onerror = () => opts.onend && opts.onend();
      synth.speak(u);
      return u;
    },
    stop() { if (synth) synth.cancel(); },
    pause() { if (synth) synth.pause(); },
    resume() { if (synth) synth.resume(); },
    speaking() { return !!(synth && synth.speaking); },

    /** Continuous recognition; restarts itself after silences until stop() is called. */
    recognize(code, { onResult, onEnd, onError } = {}) {
      if (!SR) { if (onError) onError(new Error('Speech recognition is not available in this browser.')); return null; }
      const rec = new SR();
      const pack = LOS.lang.get(code);
      rec.lang = pack ? pack.speech : code;
      rec.continuous = true;
      rec.interimResults = true;
      let finalText = '', confs = [], stopped = false;
      rec.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) { finalText += r[0].transcript + ' '; if (r[0].confidence) confs.push(r[0].confidence); }
          else interim += r[0].transcript;
        }
        if (onResult) onResult(finalText.trim(), interim, confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null);
      };
      rec.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { stopped = true; if (onError) onError(new Error('Microphone permission denied.')); } };
      rec.onend = () => { if (!stopped) { try { rec.start(); } catch (e) { /* ignore */ } } else if (onEnd) onEnd(finalText.trim()); };
      try { rec.start(); } catch (e) { if (onError) onError(e); }
      return { stop() { stopped = true; try { rec.stop(); } catch (e) { if (onEnd) onEnd(finalText.trim()); } }, get text() { return finalText.trim(); } };
    },

    /** Records microphone audio; resolves with a controller whose stop() returns { url, blob, secs }. */
    async record() {
      if (!speech.recSupported) throw new Error('Audio recording is not available in this browser.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      const t0 = Date.now();
      mr.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
      mr.start();
      return {
        stop() {
          return new Promise((resolve) => {
            mr.onstop = () => {
              stream.getTracks().forEach((t) => t.stop());
              const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
              resolve({ blob, url: URL.createObjectURL(blob), secs: Math.round((Date.now() - t0) / 1000) });
            };
            try { mr.stop(); } catch (e) { resolve({ blob: null, url: null, secs: 0 }); }
          });
        },
      };
    },
  });
})();
