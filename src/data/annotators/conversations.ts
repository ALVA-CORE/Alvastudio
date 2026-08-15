/**
 * Focus-group conversation scripts.
 *
 * These are written as *threads* — a moderator question followed by
 * participant turns that actually answer it and reference each other — rather
 * than a bag of unrelated lines. A transcript stitched from random utterances
 * looks fine in a screenshot and falls apart the moment anyone reads two
 * consecutive segments, which is exactly what an annotator does all day.
 *
 * Register is deliberate: Nigerian English and Pidgin, code-switching
 * mid-sentence, with the false starts, self-corrections and backchannels a real
 * recording carries. Line breaks inside a turn are subtitle line breaks and are
 * placed to keep each line under the 42-character conformance limit, so the
 * seeded document starts mostly conformant with a realistic minority of
 * violations for the annotator to find.
 */

/** `speaker: "mod"` is the moderator; a number indexes into the participants. */
export type ConversationTurn = {
  speaker: "mod" | number;
  text: string;
};

export type ConversationThread = ConversationTurn[];

/* ------------------------------------------------------------------ *
 * Session framing — every recording opens and closes the same way.
 * ------------------------------------------------------------------ */

export const OPENING_THREAD: ConversationThread = [
  { speaker: "mod", text: "Good afternoon everybody. Thank you for coming\nout today, I know say traffic no easy." },
  { speaker: "mod", text: "Before we start, just to remind you: there is no\nright or wrong answer here." },
  { speaker: "mod", text: "We are recording this, and your name will not be\nattached to anything you say." },
  { speaker: 0, text: "Okay, no problem." },
  { speaker: 1, text: "That one is fine." },
  { speaker: "mod", text: "Let us go round quickly. Just your first name and\nwhat you do." },
  { speaker: 0, text: "My name is Chidera, I sell phone accessories\nfor Computer Village." },
  { speaker: 1, text: "I be Aisha, I dey teach for private school." },
  { speaker: 2, text: "Emeka. I do transport, I get two buses." },
];

export const CLOSING_THREAD: ConversationThread = [
  { speaker: "mod", text: "Before we close, is there anything we have not\ntouched that you feel is important?" },
  { speaker: 1, text: "Just that people should be carried along.\nDem dey decide for us without asking us." },
  { speaker: 2, text: "Me I go say make dem test am for real place,\nnot only for Lagos island." },
  { speaker: 0, text: "And the cost. Abeg make dem look at the cost." },
  { speaker: "mod", text: "That is very fair. Thank you all so much,\nthis has been really useful." },
  { speaker: 0, text: "Thank you ma." },
  { speaker: 2, text: "We thank you." },
];

/* ------------------------------------------------------------------ *
 * Topic 201 — a habit young people have that older people complain about
 * ------------------------------------------------------------------ */

const HABITS_THREADS: ConversationThread[] = [
  [
    { speaker: "mod", text: "Let us start. What is one habit young people have\nthat older people always complain about?" },
    { speaker: 0, text: "Phone. Definitely phone. My mother go talk say\nwe don marry that thing." },
    { speaker: 1, text: "Ehen, na true. For my house, if you carry phone\nfor dining table na quarrel." },
    { speaker: 2, text: "But wait o, dem no dey use phone too?\nMy papa dey WhatsApp pass me." },
    { speaker: 0, text: "That one na different thing. When dem dey do am\nna work, when we dey do am na laziness." },
    { speaker: 1, text: "Exactly! Double standard." },
    { speaker: "mod", text: "So you are saying the complaint is not really\nabout the phone itself?" },
    { speaker: 0, text: "No be about the phone. Na about respect,\nhow dem take see am." },
  ],
  [
    { speaker: "mod", text: "What else? Anything outside phones?" },
    { speaker: 2, text: "Greeting. Dem go say we no dey greet well." },
    { speaker: 1, text: "That one I go agree small sha. Some of us\nno dey greet at all." },
    { speaker: 0, text: "But e depend on where you grow up.\nFor Lagos nobody get time." },
    { speaker: 2, text: "For my village, if you no kneel down greet,\ndem go call your mother." },
    { speaker: 1, text: "Hmm. My grandmother still dey expect am\nand I be twenty-eight years old." },
    { speaker: "mod", text: "Does anyone feel the older generation has a point?" },
    { speaker: 1, text: "Small point. Not the way dem dey talk am." },
  ],
  [
    { speaker: "mod", text: "How about money? Do they complain about how\nyoung people spend?" },
    { speaker: 0, text: "Chai. Every single day." },
    { speaker: 2, text: "Dem go say we dey buy things wey we no need,\nsneakers, subscription, all that." },
    { speaker: 1, text: "Meanwhile na the same economy wey dem\nspoil we dey manage." },
    { speaker: 0, text: "Na the annoying part be that. You no fit save\nfor house when rent don triple." },
    { speaker: 2, text: "So person go just enjoy small na." },
    { speaker: "mod", text: "So the spending is a response to something else?" },
    { speaker: 1, text: "Yes. If tomorrow no sure, wetin I dey save for?" },
  ],
  [
    { speaker: "mod", text: "Let me bring in someone who has not spoken much.\nWhat do you think?" },
    { speaker: 2, text: "Me I feel say na communication problem." },
    { speaker: 2, text: "Dem no dey ask us why we dey do something.\nDem go just conclude." },
    { speaker: 0, text: "True talk." },
    { speaker: 1, text: "And if you try explain, e turn to argument." },
    { speaker: "mod", text: "Has that changed at all in the last few years?" },
    { speaker: 2, text: "Small. Since covid, my papa dey listen small\nbecause na me teach am online banking." },
    { speaker: 0, text: "Ha, that one na leverage." },
  ],
];

/* ------------------------------------------------------------------ *
 * Topic 202 — remote work versus the office
 * ------------------------------------------------------------------ */

const REMOTE_WORK_THREADS: ConversationThread[] = [
  [
    { speaker: "mod", text: "Today we are talking about work. Is remote work\nbetter than going to the office?" },
    { speaker: 0, text: "For me, remote all the way. Transport alone\ndey chop half my salary." },
    { speaker: 1, text: "I no go lie, I miss the office small.\nHouse dey lonely." },
    { speaker: 2, text: "Which remote? With this light situation?" },
    { speaker: 0, text: "Ehen, that one na the real wahala." },
    { speaker: 2, text: "I buy inverter last year, e cost me\npass three months salary." },
    { speaker: "mod", text: "So the cost just moves from transport to power?" },
    { speaker: 2, text: "Exactly. Dem just transfer the burden give us." },
  ],
  [
    { speaker: "mod", text: "For those who prefer the office, what is it\nthat you actually miss?" },
    { speaker: 1, text: "People. Just people. Small talk,\nsomebody to laugh with." },
    { speaker: 1, text: "When I dey work from house I fit talk to nobody\nfrom morning till night." },
    { speaker: 0, text: "But that one na personality sha.\nMe I no need am." },
    { speaker: 2, text: "Also learning. New person no fit learn\nfrom Zoom, e no dey work." },
    { speaker: "mod", text: "That is interesting. Say more about the learning." },
    { speaker: 2, text: "For office you go hear how senior person\ndey talk to client. You go copy am." },
    { speaker: 1, text: "Yes! You dey learn things nobody teach you." },
  ],
  [
    { speaker: "mod", text: "Has your employer's position changed recently?" },
    { speaker: 0, text: "Dem dey force us back small small.\nFirst na two days, now na four." },
    { speaker: 1, text: "Same for my place. Dem no announce am,\ndem just start dey do meeting for office." },
    { speaker: 2, text: "That one na strategy. If you no come\nyou go miss the information." },
    { speaker: 0, text: "Na so dem take punish person without punishing you." },
    { speaker: "mod", text: "Do you think that is fair?" },
    { speaker: 1, text: "No be fair or not fair. Na power." },
    { speaker: 0, text: "Dem get the job, we no get option." },
  ],
  [
    { speaker: "mod", text: "If you could design it yourself, what would\nthe arrangement look like?" },
    { speaker: 1, text: "Two days office, three days house.\nAnd make the office days get purpose." },
    { speaker: 0, text: "Yes! No be to come sit down do the same\nZoom call wey I for do for house." },
    { speaker: 2, text: "And make dem pay transport for the office days." },
    { speaker: 1, text: "Or provide bus. Some company dey do am." },
    { speaker: "mod", text: "Would that change how you feel about coming in?" },
    { speaker: 0, text: "Completely. Na the cost dey pain me,\nno be the office." },
  ],
];

/* ------------------------------------------------------------------ *
 * Topic 203 — social media and how Nigerians communicate
 * ------------------------------------------------------------------ */

const SOCIAL_MEDIA_THREADS: ConversationThread[] = [
  [
    { speaker: "mod", text: "How has social media changed the way people\ncommunicate in Nigeria?" },
    { speaker: 0, text: "Everything don change. Nobody dey call again,\nna voice note everywhere." },
    { speaker: 1, text: "Voice note na the worst thing wey happen\nto communication, I swear." },
    { speaker: 2, text: "Why na? E dey easy." },
    { speaker: 1, text: "Because person go send you seven minutes\nand you no fit skim am." },
    { speaker: 0, text: "Hahaha, true. And you go dey find\nthe important part." },
    { speaker: "mod", text: "Does anybody prefer voice notes?" },
    { speaker: 2, text: "Me I prefer am. Typing dey slow me down,\nand my English no too strong for typing." },
  ],
  [
    { speaker: "mod", text: "That is an important point. Say more about that." },
    { speaker: 2, text: "When I dey talk, I fit mix Pidgin and English\nand everybody go understand." },
    { speaker: 2, text: "But when I dey type, I dey fear say\ndem go laugh my grammar." },
    { speaker: 1, text: "Ah, I never think of am that way." },
    { speaker: 0, text: "Na true sha. Typing get shame attached to am." },
    { speaker: "mod", text: "So voice removes a barrier for some people?" },
    { speaker: 2, text: "Yes. Voice na equalizer." },
    { speaker: 1, text: "Okay, I go accept that one. But make e short." },
  ],
  [
    { speaker: "mod", text: "What about how people argue or disagree online?" },
    { speaker: 0, text: "Twitter don spoil people. Everybody na lawyer." },
    { speaker: 1, text: "And nobody dey admit say dem dey wrong.\nDem go just delete am." },
    { speaker: 2, text: "For village, if two people vex, elder go settle am.\nOnline, na crowd dey judge." },
    { speaker: 0, text: "And the crowd no know the full story." },
    { speaker: "mod", text: "Has that changed how you talk to people face to face?" },
    { speaker: 1, text: "Yes o. I dey more careful now.\nAnything fit turn to screenshot." },
    { speaker: 0, text: "Screenshot don kill trust, honestly." },
  ],
  [
    { speaker: "mod", text: "Is there anything good that has come from it?" },
    { speaker: 2, text: "Business. My whole customer base na WhatsApp." },
    { speaker: 0, text: "Same. Instagram na my shop, I no get physical store." },
    { speaker: 1, text: "And information. When something happen,\nyou go know before news carry am." },
    { speaker: 2, text: "During ENDSARS na social media save plenty people." },
    { speaker: 0, text: "That one na fact." },
    { speaker: "mod", text: "So it depends what you use it for." },
    { speaker: 1, text: "Like every tool na." },
  ],
];

/* ------------------------------------------------------------------ *
 * Topic 204 — what makes a voice sound trustworthy
 * ------------------------------------------------------------------ */

const VOICE_TRUST_THREADS: ConversationThread[] = [
  [
    { speaker: "mod", text: "What makes a voice sound trustworthy or\nauthentic to you?" },
    { speaker: 1, text: "When the person dey talk like human being,\nno be like dem dey read paper." },
    { speaker: 0, text: "Ehen. If e too smooth, I go dey suspect am." },
    { speaker: 2, text: "Me I dey listen for accent. If person dey\nform foreign accent, I no dey trust." },
    { speaker: 1, text: "Hahaha, the fake American one." },
    { speaker: 0, text: "Especially for advert. Who dey talk like that\nfor Lagos?" },
    { speaker: "mod", text: "So a local accent feels more honest?" },
    { speaker: 2, text: "Not local by force. Just real." },
  ],
  [
    { speaker: "mod", text: "How about pace? Does speed matter?" },
    { speaker: 0, text: "Yes. If person dey rush, e be like say\ndem wan hide something." },
    { speaker: 1, text: "Like the loan advert wey dey talk fast\nfor the end." },
    { speaker: 2, text: "Hahaha, the terms and conditions part." },
    { speaker: 0, text: "Exactly! Why you go rush that one\nif e no be say something dey there?" },
    { speaker: "mod", text: "And if someone speaks too slowly?" },
    { speaker: 1, text: "Then e be like dem dey talk to small pikin.\nThat one dey vex me." },
    { speaker: 2, text: "Yes, e dey feel like disrespect." },
  ],
  [
    { speaker: "mod", text: "Have any of you noticed AI voices?\nWhat is your reaction to them?" },
    { speaker: 2, text: "I hear one for customer service last month.\nI sabi immediately." },
    { speaker: "mod", text: "How did you know?" },
    { speaker: 2, text: "The breathing. Human being dey breathe,\ndem no dey breathe." },
    { speaker: 1, text: "Ah, I never notice that one before." },
    { speaker: 0, text: "For me na the emotion. Everything dey flat,\nsame tone from start to finish." },
    { speaker: 1, text: "And dem no dey make mistake.\nHuman being go stammer small." },
    { speaker: "mod", text: "So the imperfection is part of what makes it real?" },
    { speaker: 0, text: "Correct. Perfect na the red flag." },
  ],
  [
    { speaker: "mod", text: "Would you trust an AI voice for something\nserious, like health information?" },
    { speaker: 1, text: "No. Not at all." },
    { speaker: 2, text: "Depends. If dem tell me upfront say na machine,\nmaybe." },
    { speaker: 0, text: "Na the hiding dey vex me. If you tell me,\nfine. If you deceive me, no." },
    { speaker: 2, text: "Ehen, disclosure." },
    { speaker: 1, text: "But for health? I want human being wey I fit ask\nquestion and dem go understand." },
    { speaker: "mod", text: "That is a really useful distinction, thank you." },
  ],
];

/* ------------------------------------------------------------------ *
 * Backchannels — short interjections sprinkled between substantive turns.
 * ------------------------------------------------------------------ */

export const BACKCHANNELS = [
  "Mm-hmm.",
  "Exactly.",
  "Na true talk.",
  "Yes o.",
  "I agree.",
  "Hmm.",
  "No be lie.",
  "Correct.",
  "Ehen.",
  "That one na fact.",
  "Sometimes.",
  "Not really.",
  "Abeg.",
  "You get point.",
  "Chai.",
] as const;

/**
 * Threads by topic id from `FOCUS_GROUP_PROMPTS`. Sessions whose topic is not
 * in this map fall back to the habits threads, so a new prompt never yields an
 * empty transcript.
 */
export const THREADS_BY_TOPIC: Record<string, ConversationThread[]> = {
  "Discuss one habit young people have that older people always complain about.":
    HABITS_THREADS,
  "Debate whether remote work is better than going to the office every day.":
    REMOTE_WORK_THREADS,
  "Talk about how social media has changed the way people communicate in Nigeria.":
    SOCIAL_MEDIA_THREADS,
  "Discuss what makes a voice sound trustworthy or authentic to you.":
    VOICE_TRUST_THREADS,
};

export const FALLBACK_THREADS = HABITS_THREADS;

export function threadsForTopic(topic: string): ConversationThread[] {
  return THREADS_BY_TOPIC[topic] ?? FALLBACK_THREADS;
}
