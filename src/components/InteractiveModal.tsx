import React, { useState, useEffect } from 'react';
import { X, Loader2, ArrowRight, ArrowLeft, Check, RefreshCcw } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardBody } from './ui/Card';
import type { Flashcard, QuizQuestion } from '../types';
import { callGeminiAPI } from '../lib/gemini';

interface InteractiveModalProps {
  topic: string;
  type: 'flashcards' | 'quiz';
  onClose: () => void;
}

export const InteractiveModal: React.FC<InteractiveModalProps> = ({ topic, type, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Flashcards state
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
    generateContent();
  }, [topic, type]);

  const generateContent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (type === 'flashcards') {
        const prompt = `
Generate 5 study flashcards for the topic: "${topic}".
Return a STRICT JSON object matching exactly this schema:
{
  "cards": [{ "question": "string", "answer": "string" }]
}
Do NOT wrap the JSON in Markdown formatting fences.`;
        const result = await callGeminiAPI(prompt, undefined, true);
        if (!result.cards || !Array.isArray(result.cards)) throw new Error("Invalid schema");
        setFlashcards(result.cards);
      } else {
        const prompt = `
Generate a 3-question multiple choice quiz for the topic: "${topic}".
Return a STRICT JSON object matching exactly this schema:
{
  "questions": [{ "question": "string", "options": ["opt1", "opt2", "opt3", "opt4"], "correctIndex": number, "explanation": "string" }]
}
Do NOT wrap the JSON in Markdown formatting fences.`;
        const result = await callGeminiAPI(prompt, undefined, true);
        if (!result.questions || !Array.isArray(result.questions)) throw new Error("Invalid schema");
        setQuizQuestions(result.questions);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate content. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCard((prev) => Math.min(prev + 1, flashcards.length - 1));
    }, 150);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCard((prev) => Math.max(prev - 1, 0));
    }, 150);
  };

  const handleAnswer = (idx: number) => {
    if (selectedOption !== null) return; // Prevent double answering
    setSelectedOption(idx);
    
    if (idx === quizQuestions[currentQuestion].correctIndex) {
      setScore(s => s + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedOption(null);
    } else {
      setQuizFinished(true);
    }
  };

  const renderFlashcards = () => {
    if (flashcards.length === 0) return null;
    const card = flashcards[currentCard];

    return (
      <div className="flex flex-col items-center w-full max-w-lg mx-auto">
        <div className="text-sm text-slate-500 mb-4 font-medium">Card {currentCard + 1} of {flashcards.length}</div>
        
        <div 
          className="relative w-full h-64 [perspective:1000px] cursor-pointer group"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className={`w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
            
            {/* Front */}
            <Card className="absolute inset-0 [backface-visibility:hidden] bg-white dark:bg-slate-800 flex items-center justify-center p-8 text-center group-hover:border-indigo-300 dark:group-hover:border-indigo-700 transition-colors">
              <h3 className="text-xl font-medium">{card.question}</h3>
              <p className="absolute bottom-4 text-xs text-slate-400">Click to flip</p>
            </Card>

            {/* Back */}
            <Card className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center p-8 text-center">
              <p className="text-lg">{card.answer}</p>
            </Card>

          </div>
        </div>

        <div className="flex justify-between items-center w-full mt-8">
          <Button variant="outline" onClick={handlePrevCard} disabled={currentCard === 0}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Prev
          </Button>
          <Button variant="outline" onClick={handleNextCard} disabled={currentCard === flashcards.length - 1}>
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  };

  const renderQuiz = () => {
    if (quizFinished) {
      return (
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-4">
            <span className="text-4xl font-bold">{score}/{quizQuestions.length}</span>
          </div>
          <h3 className="text-2xl font-semibold">Quiz Complete!</h3>
          <p className="text-slate-600 dark:text-slate-400">
            {score === quizQuestions.length ? "Perfect score! Great job." : "Keep studying and try again."}
          </p>
          <Button onClick={onClose}>Finish</Button>
        </div>
      );
    }

    if (quizQuestions.length === 0) return null;
    const q = quizQuestions[currentQuestion];
    const isAnswered = selectedOption !== null;

    return (
      <div className="w-full max-w-xl mx-auto space-y-6">
        <div className="flex justify-between items-center text-sm font-medium text-slate-500">
          <span>Question {currentQuestion + 1} of {quizQuestions.length}</span>
          <span>Score: {score}</span>
        </div>

        <h3 className="text-xl font-medium mb-6">{q.question}</h3>

        <div className="space-y-3">
          {q.options.map((opt, idx) => {
            let btnClass = "w-full justify-start text-left h-auto py-4 px-6 border-2 transition-all ";
            
            if (!isAnswered) {
              btnClass += "border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50";
            } else if (idx === q.correctIndex) {
              btnClass += "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300";
            } else if (idx === selectedOption) {
              btnClass += "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300";
            } else {
              btnClass += "border-slate-200 dark:border-slate-700 opacity-50";
            }

            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => handleAnswer(idx)}
                className={`rounded-xl focus:outline-none ${btnClass}`}
              >
                <div className="flex items-center">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full border border-current mr-4 text-xs font-bold">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{opt}</span>
                  {isAnswered && idx === q.correctIndex && <Check className="ml-auto w-5 h-5" />}
                </div>
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className="animate-in fade-in slide-in-from-bottom-2 mt-6">
            <Card className={selectedOption === q.correctIndex ? 'border-green-200 dark:border-green-900/50' : 'border-indigo-200 dark:border-indigo-900/50'}>
              <CardBody className="p-4">
                <p className="text-sm">
                  <span className="font-semibold">{selectedOption === q.correctIndex ? 'Correct! ' : 'Incorrect. '}</span>
                  {q.explanation}
                </p>
              </CardBody>
            </Card>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleNextQuestion}>
                {currentQuestion === quizQuestions.length - 1 ? 'See Results' : 'Next Question'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold flex items-center">
            {type === 'flashcards' ? 'Flashcards' : 'Quiz'}
            <span className="mx-2 text-slate-300 dark:text-slate-700">•</span>
            <span className="text-sm font-normal text-slate-500 truncate max-w-[200px] sm:max-w-xs">{topic}</span>
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto flex-1 flex flex-col justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
              <p className="text-slate-500">Generating {type} with AI...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">{error}</p>
              <Button variant="outline" onClick={generateContent}>
                <RefreshCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : (
            type === 'flashcards' ? renderFlashcards() : renderQuiz()
          )}
        </div>
      </div>
    </div>
  );
};
