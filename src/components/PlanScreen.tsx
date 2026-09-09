import React, { useState } from 'react';
import type { StudyTask } from '../types';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Send, CheckCircle, Circle, BrainCircuit, Library, Loader2, AlertCircle } from 'lucide-react';
import { callGeminiAPI } from '../lib/gemini';

interface PlanScreenProps {
  plan: StudyTask[];
  setPlan: (plan: StudyTask[]) => void;
  onOpenFlashcards: (topic: string) => void;
  onOpenQuiz: (topic: string) => void;
}

export const PlanScreen: React.FC<PlanScreenProps> = ({
  plan,
  setPlan,
  onOpenFlashcards,
  onOpenQuiz
}) => {
  const [chatMessage, setChatMessage] = useState('');
  const [isReplanning, setIsReplanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTaskCompletion = (index: number) => {
    const updated = [...plan];
    updated[index].completed = !updated[index].completed;
    setPlan(updated);
  };

  const handleReplan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    setIsReplanning(true);
    setError(null);

    try {
      const prompt = `
The student has the following study plan:
${JSON.stringify(plan, null, 2)}

The student says: "${chatMessage}"

Please update the study plan to accommodate their request. Keep the same JSON schema:
{
  "plan": [
    { "day": "YYYY-MM-DD", "topic": "string", "type": "learn" | "revise" | "practice", "estimatedHours": number }
  ]
}
Do NOT wrap the JSON in Markdown formatting fences. Return only the raw JSON.`;

      const result = await callGeminiAPI(prompt, undefined, true);

      if (!result.plan || !Array.isArray(result.plan)) {
        throw new Error("API returned invalid schema for updated study plan.");
      }
      
      // Preserve completion status if possible
      const updatedPlan = result.plan.map((newTask: any) => {
        const existing = plan.find(t => t.day === newTask.day && t.topic === newTask.topic);
        return {
          ...newTask,
          completed: existing ? existing.completed : false
        };
      });

      setPlan(updatedPlan);
      setChatMessage('');
      
      // Could show a toast here in a full app
    } catch (err: any) {
      setError(err.message || "Failed to update plan.");
    } finally {
      setIsReplanning(false);
    }
  };

  const completedTasks = plan.filter(t => t.completed).length;
  const progressPercent = plan.length > 0 ? Math.round((completedTasks / plan.length) * 100) : 0;

  // Group by day
  const groupedPlan = plan.reduce((acc, task) => {
    if (!acc[task.day]) {
      acc[task.day] = [];
    }
    acc[task.day].push(task);
    return acc;
  }, {} as Record<string, StudyTask[]>);

  const sortedDays = Object.keys(groupedPlan).sort();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Your Study Plan</h2>
            <span className="font-medium text-indigo-600 dark:text-indigo-400">
              {progressPercent}% Complete
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-6 pb-24">
        {sortedDays.map(day => (
          <div key={day} className="space-y-4">
            <h3 className="text-lg font-medium sticky top-16 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm py-2 z-10">
              {new Date(day).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </h3>
            <div className="grid gap-4">
              {groupedPlan[day].map((task, idx) => {
                const globalIndex = plan.findIndex(t => t === task);
                return (
                  <Card key={`${day}-${idx}`} className={task.completed ? 'opacity-60 grayscale-[50%]' : ''}>
                    <CardBody className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start space-x-3">
                        <button 
                          onClick={() => toggleTaskCompletion(globalIndex)}
                          className="mt-1 flex-shrink-0 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          {task.completed ? (
                            <CheckCircle className="h-6 w-6 text-green-500" />
                          ) : (
                            <Circle className="h-6 w-6" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider
                              ${task.type === 'learn' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 
                                task.type === 'revise' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 
                                'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'}`}
                            >
                              {task.type}
                            </span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              {task.estimatedHours}h
                            </span>
                          </div>
                          <h4 className={`text-lg font-medium mt-1 ${task.completed ? 'line-through text-slate-500' : ''}`}>
                            {task.topic}
                          </h4>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 sm:ml-auto">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => onOpenFlashcards(task.topic)}
                          className="flex-1 sm:flex-none"
                        >
                          <Library className="w-4 h-4 mr-2" />
                          Flashcards
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => onOpenQuiz(task.topic)}
                          className="flex-1 sm:flex-none"
                        >
                          <BrainCircuit className="w-4 h-4 mr-2" />
                          Quiz
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Persistent Chat for Adaptive Replan */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 z-40 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)]">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="flex items-center text-red-500 text-sm mb-2">
              <AlertCircle className="w-4 h-4 mr-1" />
              {error}
            </div>
          )}
          <form onSubmit={handleReplan} className="flex space-x-2">
            <div className="flex-1">
              <Input 
                placeholder="E.g., I'm behind on Chapter 3, adjust the plan..." 
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                disabled={isReplanning}
              />
            </div>
            <Button type="submit" disabled={isReplanning || !chatMessage.trim()}>
              {isReplanning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
