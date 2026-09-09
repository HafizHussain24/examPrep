import { useState } from 'react';
import { useTheme } from './lib/useTheme';
import { Moon, Sun, BookOpen } from 'lucide-react';
import type { Topic, StudyTask } from './types';
import { InputScreen } from './components/InputScreen';
import { AssessmentScreen } from './components/AssessmentScreen';
import { PlanScreen } from './components/PlanScreen';
import { InteractiveModal } from './components/InteractiveModal';

function App() {
  const { theme, toggleTheme } = useTheme();
  const [currentScreen, setCurrentScreen] = useState<'input' | 'assessment' | 'plan'>('input');
  
  // App State
  const [examDate, setExamDate] = useState<string>('');
  const [dailyHours, setDailyHours] = useState<number>(2);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [studyPlan, setStudyPlan] = useState<StudyTask[]>([]);

  // Modal State
  const [modalType, setModalType] = useState<'flashcards' | 'quiz' | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <BookOpen className="h-6 w-6" />
            <span className="text-xl font-bold tracking-tight">ExamPrep AI</span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {currentScreen === 'input' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-bold mb-6">Let's build your study plan</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Upload your syllabus, and we'll analyze it to generate a personalized schedule.
            </p>
            <InputScreen 
              examDate={examDate}
              setExamDate={setExamDate}
              dailyHours={dailyHours}
              setDailyHours={setDailyHours}
              onAssessmentComplete={(analyzedTopics) => {
                setTopics(analyzedTopics);
                setCurrentScreen('assessment');
              }}
            />
          </div>
        )}

        {currentScreen === 'assessment' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <AssessmentScreen 
              topics={topics}
              examDate={examDate}
              dailyHours={dailyHours}
              onBack={() => setCurrentScreen('input')}
              onPlanGenerated={(plan) => {
                setStudyPlan(plan);
                setCurrentScreen('plan');
              }}
            />
          </div>
        )}

        {currentScreen === 'plan' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <PlanScreen 
              plan={studyPlan}
              setPlan={setStudyPlan}
              onOpenFlashcards={(topic) => {
                setActiveTopic(topic);
                setModalType('flashcards');
              }}
              onOpenQuiz={(topic) => {
                setActiveTopic(topic);
                setModalType('quiz');
              }}
            />
          </div>
        )}
      </main>

      {modalType && activeTopic && (
        <InteractiveModal 
          topic={activeTopic}
          type={modalType}
          onClose={() => {
            setModalType(null);
            setActiveTopic(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
