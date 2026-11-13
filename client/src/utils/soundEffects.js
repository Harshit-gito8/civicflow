// Sound effect stub (kept silent by default for real-world enterprise feel)
class SoundEngine {
  constructor() {
    this.enabled = false; // muted by default for authentic civic look
  }
  click() {}
  radarPing() {}
  success() {}
  alert() {}
}

export const sounds = new SoundEngine();
export default sounds;
