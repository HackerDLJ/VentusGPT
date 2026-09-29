export const classicCapabilities = {
  conversation: true,
  liveVoice: true,
  groundedSearch: true,
  calculator: true,
  vision: true,
  imageGeneration: true,
  textToSpeech: true,
  transcription: true,
  tamilEnglish: true,
} as const;

export type ClassicCapability = keyof typeof classicCapabilities;
