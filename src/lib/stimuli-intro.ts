const SEEN_KEY = "alva-stimuli-intro-seen";

/** Whether this phone has been told that Stimuli is talking, not reading. */
export function stimuliIntroSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberStimuliIntro() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* Private window: it shows again next time, which is harmless. */
  }
}
