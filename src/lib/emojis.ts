export const EMOJI_MAP: Record<string, string[]> = {
  // Money & Success
  "money": ["💰", "💵", "🤑", "🏦", "💸"],
  "cash": ["💵", "💰", "💸"],
  "profit": ["📈", "💰", "💹"],
  "rich": ["💎", "🤑", "💰"],
  "wealth": ["🏦", "💎", "💰"],
  "million": ["💰", "💎", "🚀"],
  "billion": ["💰", "🚀", "🏦"],
  "success": ["🏆", "🥇", "🎯", "🌟"],
  "win": ["🏆", "🥇", "🎯"],

  // Growth & Energy
  "growth": ["📈", "🚀", "🌱", "💹"],
  "rocket": ["🚀", "🌌", "⚡"],
  "fast": ["⚡", "🚀", "💨"],
  "power": ["⚡", "🔋", "💪"],
  "energy": ["⚡", "🔋", "🔥"],
  "hype": ["🔥", "🚀", "🤩"],
  "amazing": ["🌟", "🤩", "✨"],
  "incredible": ["✨", "🤯", "🌟"],
  "wow": ["🤯", "🤩", "✨"],
  "fire": ["🔥", "💥", "🧨"],

  // Warning & Danger
  "stop": ["🛑", "🚫", "❌"],
  "danger": ["⚠️", "🚫", "🚨"],
  "warning": ["⚠️", "🚨", "🛑"],
  "mistake": ["❌", "🤦‍♂️", "⚠️"],
  "wrong": ["❌", "🚫", "🛑"],
  "error": ["❌", "⚠️", "🚫"],
  "careful": ["⚠️", "🧐", "🛑"],

  // Love & Emotion
  "love": ["❤️", "💖", "🥰", "💕"],
  "heart": ["❤️", "💖", "💕"],
  "happy": ["😊", "😄", "🥳", "✨"],
  "sad": ["😢", "😭", "😔", "💔"],
  "angry": ["😡", "😠", "🤬"],
  "laugh": ["😂", "🤣", "😆"],
  "funny": ["😂", "🤣", "😆"],

  // Time & Planning
  "time": ["⏰", "⏳", "⏱️", "📅"],
  "clock": ["⏰", "🕰️"],
  "schedule": ["📅", "🗓️"],
  "plan": ["📝", "🎯", "📋"],
  "strategy": ["🎯", "📝", "♟️"],

  // Communication & Tech
  "phone": ["📱", "📞", "📲"],
  "call": ["📞", "📱"],
  "internet": ["🌐", "💻", "📶"],
  "computer": ["💻", "🖥️"],
  "app": ["📱", "📲"],
  "code": ["💻", "⌨️", "📜"],

  // General
  "idea": ["💡", "💭", "✨"],
  "think": ["🤔", "💭", "🧐"],
  "question": ["❓", "❔", "🤔"],
  "answer": ["✅", "🎯", "💡"],
  "secret": ["🤫", "🔒", "🔑"],
  "hack": ["🛠️", "💡", "🔑"],
  "tip": ["💡", "📌", "✨"],
}

export function applyAutoEmojis(text: string): string {
  const words = text.split(/\s+/);
  const processedWords = words.map(word => {
    // Clean word of punctuation for better matching
    const cleanWord = word.toLowerCase().replace(/[.,!?;:()]/g, "");
    const emojis = EMOJI_MAP[cleanWord];

    if (emojis) {
      // Pick a random emoji from the cluster to make it feel natural
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      return `${word} ${randomEmoji}`;
    }
    return word;
  });

  return processedWords.join(" ");
}