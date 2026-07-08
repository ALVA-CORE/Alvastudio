/** Prompt bank for Prompt Reader mode — replace with API/Supabase later */

export type PromptItem = {
  id: number;
  text: string;
  variety?: "english" | "pidgin" | "mixed";
};

export const PROMPT_READER_PROMPTS: PromptItem[] = [
  { id: 1, text: "Tell us about the first place in Nigeria that really feels like home to you." },
  { id: 2, text: "Describe a market near you and the kinds of sounds somebody would hear there." },
  { id: 3, text: "The network dropped for five minutes before it came back again." },
  { id: 4, text: "Talk about one food you miss whenever you travel away from home." },
  { id: 5, text: "Explain how you usually greet people in your neighbourhood." },
  { id: 6, text: "Describe the last time you had to wait a long time for something important." },
  { id: 7, text: "Say this clearly: I will call you back as soon as I reach the office." },
  { id: 8, text: "Talk about a song or artist you grew up listening to." },
  { id: 9, text: "Describe what a typical rainy season morning feels like where you live." },
  { id: 10, text: "Explain how you would give directions to someone visiting your area for the first time." },
  { id: 11, text: "Tell us about a small habit you have that people close to you always notice." },
  { id: 12, text: "Read this naturally: The bus was full, but we still managed to find space near the back." },
  { id: 13, text: "Describe the voice of someone you find easy to listen to and why." },
  { id: 14, text: "Talk about a time you had to explain something technical to someone who was not familiar with it." },
  { id: 15, text: "Say this with natural rhythm: No wahala, we go sort am before the day ends." },
  { id: 16, text: "Describe your favourite spot to relax after a long day." },
  { id: 17, text: "Explain what makes Nigerian English sound different to you compared with other accents." },
  { id: 18, text: "Tell a short story about missing a flight, a bus, or an important appointment." },
  { id: 19, text: "Describe the sounds you hear early in the morning in your compound or street." },
  { id: 20, text: "Say this clearly: Please send the receipt once the transfer is complete." },
  { id: 21, text: "Talk about one slang word or phrase you use often and what it means." },
  { id: 22, text: "Describe how you would comfort a friend who is having a bad day." },
  { id: 23, text: "Explain the difference between how you speak at home and how you speak at work or school." },
  { id: 24, text: "Read this aloud: The generator came on just as the lights went off again." },
  { id: 25, text: "Describe a celebration or festival you enjoy and what people usually do." },
  { id: 26, text: "Talk about a teacher, mentor, or elder who shaped the way you speak." },
  { id: 27, text: "Say this naturally: I don tell am make e no worry, everything go work out." },
  { id: 28, text: "Describe your commute and the people you usually see along the way." },
  { id: 29, text: "Explain how you decide whether to speak English or Pidgin in a conversation." },
  { id: 30, text: "Tell us about a place in Nigeria you would recommend to a first-time visitor." },
];

export const STIMULI_PROMPTS: PromptItem[] = [
  { id: 101, text: "Tell a story about a day when everything that could go wrong actually went wrong." },
  { id: 102, text: "Explain a difficult decision you made recently and how you arrived at it." },
  { id: 103, text: "Walk us through how you would prepare for an important journey from start to finish." },
  { id: 104, text: "Describe a time you had to stand up for yourself or someone else." },
  { id: 105, text: "Talk about a skill you taught yourself and how you learned it." },
  { id: 106, text: "Tell us about a misunderstanding that turned out funny in the end." },
  { id: 107, text: "Explain what ambition means to you and how you pursue it." },
  { id: 108, text: "Describe a neighbourhood argument or debate you still remember clearly." },
];

export const FOCUS_GROUP_PROMPTS: PromptItem[] = [
  { id: 201, text: "Discuss one habit young people have that older people always complain about." },
  { id: 202, text: "Debate whether remote work is better than going to the office every day." },
  { id: 203, text: "Talk about how social media has changed the way people communicate in Nigeria." },
  { id: 204, text: "Discuss what makes a voice sound trustworthy or authentic to you." },
];
