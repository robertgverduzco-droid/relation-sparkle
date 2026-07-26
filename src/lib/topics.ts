// Athena's Topic Map: the broad areas of a person's life she gradually
// explores across many conversations. Kept separate from `facets` — facets
// are Athena's *understanding* of the person, topics are Athena's map of
// *what she has and hasn't yet explored*.
export const TOPIC_KEYS = [
  "identity",
  "personality",
  "communication",
  "emotional_patterns",
  "conflict",
  "relationships",
  "intimacy",
  "family",
  "friendships",
  "values",
  "spirituality",
  "lifestyle",
  "health_fitness",
  "career_purpose",
  "hobbies_interests",
  "travel",
  "humor",
  "childhood",
  "growth",
  "future_goals",
  "finances",
] as const;

export type TopicKey = (typeof TOPIC_KEYS)[number];

export const TOPIC_LABELS: Record<TopicKey, string> = {
  identity: "Identity",
  personality: "Personality",
  communication: "Communication",
  emotional_patterns: "Emotional patterns",
  conflict: "Conflict",
  relationships: "Relationships",
  intimacy: "Intimacy & connection",
  family: "Family",
  friendships: "Friendships",
  values: "Values",
  spirituality: "Spirituality",
  lifestyle: "Lifestyle",
  health_fitness: "Health & fitness",
  career_purpose: "Career & purpose",
  hobbies_interests: "Hobbies & interests",
  travel: "Travel",
  humor: "Humor",
  childhood: "Childhood",
  growth: "Personal growth",
  future_goals: "Future goals",
  finances: "Finances",
};

// Rough semantic neighbors used to seed related_topics and help Athena
// bridge naturally between areas.
export const TOPIC_NEIGHBORS: Record<TopicKey, TopicKey[]> = {
  identity: ["personality", "values", "growth"],
  personality: ["identity", "humor", "emotional_patterns"],
  communication: ["conflict", "relationships", "intimacy"],
  emotional_patterns: ["personality", "conflict", "growth"],
  conflict: ["communication", "relationships", "emotional_patterns"],
  relationships: ["communication", "intimacy", "family"],
  intimacy: ["relationships", "communication", "emotional_patterns"],
  family: ["childhood", "relationships", "values"],
  friendships: ["relationships", "lifestyle", "humor"],
  values: ["identity", "spirituality", "future_goals"],
  spirituality: ["values", "growth", "identity"],
  lifestyle: ["health_fitness", "hobbies_interests", "friendships"],
  health_fitness: ["lifestyle", "growth", "emotional_patterns"],
  career_purpose: ["future_goals", "values", "growth"],
  hobbies_interests: ["lifestyle", "humor", "travel"],
  travel: ["hobbies_interests", "lifestyle", "future_goals"],
  humor: ["personality", "friendships", "hobbies_interests"],
  childhood: ["family", "identity", "growth"],
  growth: ["identity", "values", "future_goals"],
  future_goals: ["career_purpose", "values", "growth"],
  finances: ["future_goals", "lifestyle", "values"],
};
