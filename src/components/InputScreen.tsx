import React, { useState } from 'react';
import { UploadCloud, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Card, CardBody, CardFooter, CardHeader } from './ui/Card';
import { extractTextFromPdf, fileToBase64 } from '../lib/pdf';
import { callGeminiAPI } from '../lib/gemini';
import type { Topic } from '../types';

interface InputScreenProps {
  examDate: string;
  setExamDate: (date: string) => void;
  dailyHours: number;
  setDailyHours: (hours: number) => void;
  onAssessmentComplete: (topics: Topic[]) => void;
}

export const InputScreen: React.FC<InputScreenProps> = ({
  examDate,
  setExamDate,
  dailyHours,
  setDailyHours,
  onAssessmentComplete
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [textSyllabus, setTextSyllabus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAssess = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      let contentPrompt = '';
      let imageBase64: string | undefined;

      if (file) {
        if (file.type === 'application/pdf') {
          const pdfText = await extractTextFromPdf(file);
          contentPrompt = pdfText;
        } else if (file.type.startsWith('image/')) {
          imageBase64 = await fileToBase64(file);
        } else {
          throw new Error("Unsupported file type. Please upload a PDF or Image.");
        }
      }

      if (textSyllabus) {
        contentPrompt += '\n\n' + textSyllabus;
      }

      if (!contentPrompt && !imageBase64) {
        throw new Error("Please provide a syllabus (upload file or paste text).");
      }

      const prompt = `
Analyze the following syllabus content and extract the main topics to study.
${contentPrompt ? `Syllabus Content:\n${contentPrompt}` : 'Analyze the attached image syllabus.'}

Return a STRICT JSON object matching exactly this schema:
{
  "topics": [
    { "id": "unique-string-id", "unit": "unit or category name", "topic": "specific topic name", "difficulty": 1-5, "estimatedWeight": 1-5 }
  ]
}
Do NOT wrap the JSON in Markdown formatting fences like \`\`\`json. Return only the raw JSON.`;

      const result = await callGeminiAPI(prompt, imageBase64, true);
      
      if (!result.topics || !Array.isArray(result.topics)) {
        throw new Error("API returned invalid schema.");
      }

      onAssessmentComplete(result.topics);
    } catch (err: any) {
      setError(err.message || "An error occurred during assessment.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isFormValid = (file || textSyllabus) && examDate && dailyHours > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">1. Provide your Syllabus</h2>
        </CardHeader>
        <CardBody className="space-y-6">
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <UploadCloud className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-slate-800 rounded-md font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                <span>Upload a PDF or Image</span>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf,image/*" onChange={handleFileChange} />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            {file && <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{file.name}</p>}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-300 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-white dark:bg-slate-800 text-sm text-slate-500">AND / OR</span>
            </div>
          </div>

          <Textarea 
            label="Paste Syllabus Text (Fallback)" 
            placeholder="Paste your course outline, topics, or module details here..."
            value={textSyllabus}
            onChange={(e) => setTextSyllabus(e.target.value)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">2. Study Parameters</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input 
            label="Exam Date" 
            type="date" 
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
          <Input 
            label="Daily Study Hours" 
            type="number" 
            min="1"
            max="24"
            value={dailyHours}
            onChange={(e) => setDailyHours(Number(e.target.value))}
          />
        </CardBody>
        <CardFooter className="flex justify-between items-center">
          {error && (
            <div className="flex items-center text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 mr-1" />
              {error}
            </div>
          )}
          <div className="ml-auto">
            <Button 
              size="lg" 
              disabled={!isFormValid} 
              isLoading={isProcessing}
              onClick={handleAssess}
            >
              Assess Syllabus
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
