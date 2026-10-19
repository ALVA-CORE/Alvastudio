/**
 * Focus group topics, as test fixtures.
 *
 * The app reads the live bank — `/prompts`, `/stimuli` and
 * `/focus-group-topics`. What is left here is what the annotator session
 * fixtures build their topics from, so a test does not need the network.
 */

export type PromptItem = {
  id: number;
  text: string;
  variety?: "english" | "pidgin" | "mixed";
};

export const FOCUS_GROUP_PROMPTS: PromptItem[] = [
  { id: 201, text: "Discuss one habit young people have that older people always complain about." },
  { id: 202, text: "Debate whether remote work is better than going to the office every day." },
  { id: 203, text: "Talk about how social media has changed the way people communicate in Nigeria." },
  { id: 204, text: "Discuss what makes a voice sound trustworthy or authentic to you." },
];
