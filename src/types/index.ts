export interface Topic {
  id: string;
  unit: string;
  topic: string;
  difficulty: number;
  estimatedWeight: number;
}

export interface StudyTask {
  day: string;
  topic: string;
  type: 'learn' | 'revise' | 'practice';
  estimatedHours: number;
  completed?: boolean;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}
