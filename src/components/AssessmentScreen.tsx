import React, { useState } from 'react';
import { Card, CardBody, CardFooter, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import type { Topic, StudyTask } from '../types';
import { callGeminiAPI } from '../lib/gemini';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface AssessmentScreenProps {
  topics: Topic[];
  examDate: string;
  dailyHours: number;
  onPlanGenerated: (plan: StudyTask[]) => void;
  onBack: () => void;
}

export const AssessmentScreen: React.FC<AssessmentScreenProps> = ({
  topics,
  examDate,
  dailyHours,
  onPlanGenerated,
  onBack
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group topics by unit
  const groupedTopics = topics.reduce((acc, topic) => {
    if (!acc[topic.unit]) {
      acc[topic.unit] = [];
    }
    acc[topic.unit].push(topic);
    return acc;
  }, {} as Record<string, Topic[]>);

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const prompt = `
Generate a detailed day-by-day study plan based on the following topics.
The exam is on ${examDate}, and the student can study ${dailyHours} hours per day.
Distribute the topics logically. Ensure there's time for learning, revising, and practicing.

Topics:
${JSON.stringify(topics, null, 2)}

Return a STRICT JSON object matching exactly this schema:
{
  "plan": [
    { "day": "YYYY-MM-DD", "topic": "string", "type": "learn" | "revise" | "practice", "estimatedHours": number }
  ]
}
Do NOT wrap the JSON in Markdown formatting fences like \`\`\`json. Return only the raw JSON.
`;
      const result = await callGeminiAPI(prompt, undefined, true);

      if (!result.plan || !Array.isArray(result.plan)) {
        throw new Error("API returned invalid schema for study plan.");
      }

      const planWithCompletion = result.plan.map((task: any) => ({
        ...task,
        completed: false
      }));

      onPlanGenerated(planWithCompletion);
    } catch (err: any) {
      setError(err.message || "Failed to generate study plan.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getDifficultyColor = (level: number) => {
    if (level <= 2) return 'bg-green-500';
    if (level === 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Syllabus Assessment Review</h2>
            <div className="flex items-center text-sm text-indigo-600 dark:text-indigo-400">
              <CheckCircle2 className="w-5 h-5 mr-1" />
              Extraction Successful
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Review the extracted topics and units before we generate your day-by-day study plan.
          </p>
        </CardHeader>
        
        <CardBody className="space-y-8">
          {Object.entries(groupedTopics).map(([unit, unitTopics]) => (
            <div key={unit} className="space-y-4">
              <h3 className="font-semibold text-lg border-b border-slate-200 dark:border-slate-700 pb-2">
                {unit}
              </h3>
              <div className="grid gap-3">
                {unitTopics.map(topic => (
                  <div key={topic.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    <span className="font-medium">{topic.topic}</span>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center" title={`Difficulty: ${topic.difficulty}/5`}>
                        <span className="mr-2 text-slate-500">Diff:</span>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map(d => (
                            <div 
                              key={d} 
                              className={`w-2 h-2 rounded-full ${d <= topic.difficulty ? getDifficultyColor(topic.difficulty) : 'bg-slate-200 dark:bg-slate-600'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-slate-500" title={`Weight: ${topic.estimatedWeight}/5`}>
                        Weight: {topic.estimatedWeight}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardBody>
        
        <CardFooter className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
          <Button variant="ghost" onClick={onBack} disabled={isGenerating}>
            Back
          </Button>
          <div className="flex items-center space-x-4">
            {error && (
              <div className="flex items-center text-red-500 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                {error}
              </div>
            )}
            <Button 
              onClick={handleGeneratePlan} 
              isLoading={isGenerating}
            >
              Generate Study Plan
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
