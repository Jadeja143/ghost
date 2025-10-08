/**
 * Interactive Sticker Panel
 * Instagram-inspired interactive stickers
 * Features: polls, questions, quizzes, countdowns, sliders
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, MessageSquare, BrainCircuit, 
  Timer, SlidersHorizontal, X, Plus 
} from 'lucide-react';
import { useStoryDraft } from './story-context';
import { 
  PollSticker, QuestionSticker, QuizSticker, 
  CountdownSticker, SliderSticker 
} from '@shared/schema';
import { motion } from 'framer-motion';

interface InteractiveStickerPanelProps {
  onNext: () => void;
  onBack: () => void;
}

export function InteractiveStickerPanel({ onNext, onBack }: InteractiveStickerPanelProps) {
  const { draft, updateDraft } = useStoryDraft();
  
  // Poll state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  
  // Question state
  const [questionText, setQuestionText] = useState('');
  
  // Quiz state
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizOptions, setQuizOptions] = useState(['', '', '', '']);
  const [quizCorrect, setQuizCorrect] = useState(0);
  
  // Countdown state
  const [countdownName, setCountdownName] = useState('');
  const [countdownDate, setCountdownDate] = useState('');
  
  // Slider state
  const [sliderQuestion, setSliderQuestion] = useState('');
  const [sliderEmoji, setSliderEmoji] = useState('❤️');

  const addPoll = () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) return;
    
    const poll: PollSticker = {
      id: `poll-${Date.now()}`,
      type: 'poll',
      x: 50,
      y: 50,
      data: {
        question: pollQuestion,
        options: pollOptions.filter(o => o.trim()),
      },
    };
    
    updateDraft({
      interactiveStickers: [...draft.interactiveStickers, poll],
    });
    
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  const addQuestion = () => {
    if (!questionText.trim()) return;
    
    const question: QuestionSticker = {
      id: `question-${Date.now()}`,
      type: 'question',
      x: 50,
      y: 50,
      data: {
        question: questionText,
      },
    };
    
    updateDraft({
      interactiveStickers: [...draft.interactiveStickers, question],
    });
    
    setQuestionText('');
  };

  const addQuiz = () => {
    if (!quizQuestion.trim() || quizOptions.filter(o => o.trim()).length < 2) return;
    
    const quiz: QuizSticker = {
      id: `quiz-${Date.now()}`,
      type: 'quiz',
      x: 50,
      y: 50,
      data: {
        question: quizQuestion,
        options: quizOptions.filter(o => o.trim()),
        correctAnswer: quizCorrect,
      },
    };
    
    updateDraft({
      interactiveStickers: [...draft.interactiveStickers, quiz],
    });
    
    setQuizQuestion('');
    setQuizOptions(['', '', '', '']);
    setQuizCorrect(0);
  };

  const addCountdown = () => {
    if (!countdownName.trim() || !countdownDate) return;
    
    const countdown: CountdownSticker = {
      id: `countdown-${Date.now()}`,
      type: 'countdown',
      x: 50,
      y: 50,
      data: {
        name: countdownName,
        endTime: new Date(countdownDate),
      },
    };
    
    updateDraft({
      interactiveStickers: [...draft.interactiveStickers, countdown],
    });
    
    setCountdownName('');
    setCountdownDate('');
  };

  const addSlider = () => {
    if (!sliderQuestion.trim()) return;
    
    const slider: SliderSticker = {
      id: `slider-${Date.now()}`,
      type: 'slider',
      x: 50,
      y: 50,
      data: {
        question: sliderQuestion,
        emoji: sliderEmoji,
      },
    };
    
    updateDraft({
      interactiveStickers: [...draft.interactiveStickers, slider],
    });
    
    setSliderQuestion('');
  };

  const removeSticker = (id: string) => {
    updateDraft({
      interactiveStickers: draft.interactiveStickers.filter(s => s.id !== id),
    });
  };

  return (
    <div className="space-y-4" data-testid="panel-interactive-stickers">
      <h3 className="text-lg font-semibold">Add Interactive Stickers</h3>

      <Tabs defaultValue="poll" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="poll" data-testid="tab-poll">
            <BarChart3 className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="question" data-testid="tab-question">
            <MessageSquare className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="quiz" data-testid="tab-quiz">
            <BrainCircuit className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="countdown" data-testid="tab-countdown">
            <Timer className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="slider" data-testid="tab-slider">
            <SlidersHorizontal className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        {/* Poll */}
        <TabsContent value="poll" className="space-y-3">
          <Input
            placeholder="Ask a question..."
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            data-testid="input-poll-question"
          />
          {pollOptions.map((opt, idx) => (
            <Input
              key={idx}
              placeholder={`Option ${idx + 1}`}
              value={opt}
              onChange={(e) => {
                const newOpts = [...pollOptions];
                newOpts[idx] = e.target.value;
                setPollOptions(newOpts);
              }}
              data-testid={`input-poll-option-${idx}`}
            />
          ))}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPollOptions([...pollOptions, ''])}
              data-testid="button-add-poll-option"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Option
            </Button>
            <Button onClick={addPoll} data-testid="button-create-poll">
              Create Poll
            </Button>
          </div>
        </TabsContent>

        {/* Question */}
        <TabsContent value="question" className="space-y-3">
          <Input
            placeholder="Ask your followers a question..."
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            data-testid="input-question-text"
          />
          <Button onClick={addQuestion} data-testid="button-create-question">
            Add Question
          </Button>
        </TabsContent>

        {/* Quiz */}
        <TabsContent value="quiz" className="space-y-3">
          <Input
            placeholder="Quiz question..."
            value={quizQuestion}
            onChange={(e) => setQuizQuestion(e.target.value)}
            data-testid="input-quiz-question"
          />
          {quizOptions.map((opt, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                placeholder={`Option ${idx + 1}`}
                value={opt}
                onChange={(e) => {
                  const newOpts = [...quizOptions];
                  newOpts[idx] = e.target.value;
                  setQuizOptions(newOpts);
                }}
                data-testid={`input-quiz-option-${idx}`}
              />
              <Button
                variant={quizCorrect === idx ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQuizCorrect(idx)}
                data-testid={`button-quiz-correct-${idx}`}
              >
                {quizCorrect === idx ? '✓' : ' '}
              </Button>
            </div>
          ))}
          <Button onClick={addQuiz} data-testid="button-create-quiz">
            Create Quiz
          </Button>
        </TabsContent>

        {/* Countdown */}
        <TabsContent value="countdown" className="space-y-3">
          <Input
            placeholder="Event name..."
            value={countdownName}
            onChange={(e) => setCountdownName(e.target.value)}
            data-testid="input-countdown-name"
          />
          <Input
            type="datetime-local"
            value={countdownDate}
            onChange={(e) => setCountdownDate(e.target.value)}
            data-testid="input-countdown-date"
          />
          <Button onClick={addCountdown} data-testid="button-create-countdown">
            Add Countdown
          </Button>
        </TabsContent>

        {/* Slider */}
        <TabsContent value="slider" className="space-y-3">
          <Input
            placeholder="Ask something..."
            value={sliderQuestion}
            onChange={(e) => setSliderQuestion(e.target.value)}
            data-testid="input-slider-question"
          />
          <div className="flex gap-2">
            <Label className="flex-1">Emoji:</Label>
            <Input
              className="flex-1"
              value={sliderEmoji}
              onChange={(e) => setSliderEmoji(e.target.value)}
              maxLength={2}
              data-testid="input-slider-emoji"
            />
          </div>
          <Button onClick={addSlider} data-testid="button-create-slider">
            Add Slider
          </Button>
        </TabsContent>
      </Tabs>

      {/* Added Stickers */}
      {draft.interactiveStickers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Added Stickers ({draft.interactiveStickers.length})</p>
          <div className="space-y-2">
            {draft.interactiveStickers.map((sticker) => (
              <motion.div
                key={sticker.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card>
                  <CardHeader className="p-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm capitalize">{sticker.type}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSticker(sticker.id)}
                      data-testid={`button-remove-sticker-${sticker.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 text-sm text-muted-foreground">
                    {sticker.type === 'poll' && (sticker as PollSticker).data.question}
                    {sticker.type === 'question' && (sticker as QuestionSticker).data.question}
                    {sticker.type === 'quiz' && (sticker as QuizSticker).data.question}
                    {sticker.type === 'countdown' && (sticker as CountdownSticker).data.name}
                    {sticker.type === 'slider' && (sticker as SliderSticker).data.question}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
          data-testid="button-back-to-enhancements"
        >
          Back
        </Button>
        <Button
          onClick={onNext}
          className="flex-1"
          data-testid="button-next-to-privacy"
        >
          Next: Privacy Settings
        </Button>
      </div>
    </div>
  );
}
