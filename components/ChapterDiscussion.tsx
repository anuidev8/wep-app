
import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, ThumbsUp, User, ShieldCheck, CornerDownRight, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface Reply {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  likes: number;
  isAdmin?: boolean;
}

interface Question {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  likes: number;
  replies: Reply[];
}

interface ChapterDiscussionProps {
  chapterId: string;
  chapterTitle: string;
}

export const ChapterDiscussion: React.FC<ChapterDiscussionProps> = ({ chapterId, chapterTitle }) => {
  const { user } = useApp();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Initialize with empty array - comments will be fetched from API
  useEffect(() => {
    setQuestions([]);
    // TODO: Fetch comments from API endpoint for this chapter
  }, [chapterId]);

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  const handleAskQuestion = () => {
    if (!newQuestion.trim()) return;
    const q: Question = {
      id: Date.now().toString(),
      author: user || 'Anonymous',
      text: newQuestion,
      timestamp: Date.now(),
      likes: 0,
      replies: []
    };
    setQuestions([q, ...questions]);
    setNewQuestion('');
  };

  const handleReply = (qId: string) => {
    if (!replyText.trim()) return;
    const r: Reply = {
      id: Date.now().toString(),
      author: user || 'Anonymous',
      text: replyText,
      timestamp: Date.now(),
      likes: 0
    };
    setQuestions(questions.map(q => 
      q.id === qId ? { ...q, replies: [...q.replies, r] } : q
    ));
    setReplyText('');
    setReplyingTo(null);
  };

  const handleLike = (qId: string, rId?: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        if (rId) {
          return {
            ...q,
            replies: q.replies.map(r => r.id === rId ? { ...r, likes: r.likes + 1 } : r)
          };
        }
        return { ...q, likes: q.likes + 1 };
      }
      return q;
    }));
  };

  return (
    <div className="mt-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-serif font-bold text-brand-dark dark:text-white flex items-center gap-2">
          <MessageSquare size={18} className="text-brand-gold" />
          Sadhaka Discussion
        </h3>
        <span className="text-[10px] font-bold text-brand-medium/50 uppercase tracking-widest">{chapterTitle}</span>
      </div>

      {/* Ask Input */}
      <div className="bg-white dark:bg-brand-darkSurface p-4 rounded-3xl border border-brand-light dark:border-brand-darkBorder shadow-sm">
        <textarea
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="Ask the community or guides a question..."
          className="w-full bg-brand-light dark:bg-black/20 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 dark:text-white resize-none min-h-[100px]"
        />
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleAskQuestion}
            disabled={!newQuestion.trim()}
            className="bg-brand-dark dark:bg-brand-gold text-white dark:text-brand-dark px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30"
          >
            <Send size={14} /> Ask a question
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="space-y-3">
            {/* Question Card */}
            <div className="bg-white dark:bg-brand-darkSurface p-5 rounded-3xl border border-brand-light dark:border-brand-darkBorder shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand-light dark:bg-white/5 flex items-center justify-center text-brand-medium">
                    <User size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold dark:text-white">{q.author}</div>
                    <div className="text-[9px] text-brand-medium/60 flex items-center gap-1">
                      <Clock size={8} /> {formatTime(q.timestamp)}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleLike(q.id)}
                  className="flex items-center gap-1.5 text-brand-medium/50 hover:text-brand-gold transition-colors"
                >
                  <ThumbsUp size={14} className={q.likes > 0 ? "fill-brand-gold/10 text-brand-gold" : ""} />
                  <span className="text-[10px] font-bold">{q.likes}</span>
                </button>
              </div>
              <p className="text-sm text-brand-dark dark:text-brand-darkText leading-relaxed">
                {q.text}
              </p>
              <div className="mt-4 flex gap-4">
                <button 
                  onClick={() => setReplyingTo(replyingTo === q.id ? null : q.id)}
                  className="text-[10px] font-bold text-brand-gold uppercase tracking-widest hover:underline"
                >
                  {replyingTo === q.id ? 'Cancel' : 'Reply'}
                </button>
              </div>

              {/* Reply Input */}
              {replyingTo === q.id && (
                <div className="mt-4 pt-4 border-t border-brand-light dark:border-white/5 animate-fade-in">
                  <textarea
                    autoFocus
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write your reply..."
                    className="w-full bg-brand-light dark:bg-black/20 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-gold/30 dark:text-white resize-none"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => handleReply(q.id)}
                      disabled={!replyText.trim()}
                      className="bg-brand-primary dark:bg-white/10 text-white px-4 py-2 rounded-lg font-bold text-[10px] flex items-center gap-2"
                    >
                      Post Reply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Replies Thread */}
            {q.replies.length > 0 && (
              <div className="ml-8 space-y-3">
                {q.replies.map((r) => (
                  <div 
                    key={r.id} 
                    className={`p-4 rounded-[24px] border transition-all ${
                      r.isAdmin 
                        ? 'bg-brand-gold/5 border-brand-gold/20 shadow-[0_0_15px_rgba(212,165,116,0.05)]' 
                        : 'bg-white/50 dark:bg-brand-darkSurface/50 border-brand-light dark:border-brand-darkBorder'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {r.isAdmin ? (
                          <div className="w-6 h-6 rounded-full bg-brand-gold text-brand-dark flex items-center justify-center shadow-sm">
                            <ShieldCheck size={14} />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-brand-light dark:bg-white/5 flex items-center justify-center text-brand-medium">
                            <User size={12} />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold ${r.isAdmin ? 'text-brand-gold' : 'dark:text-white'}`}>
                              {r.author}
                            </span>
                            {r.isAdmin && (
                              <span className="text-[8px] bg-brand-gold text-brand-dark px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">
                                Guide
                              </span>
                            )}
                          </div>
                          <div className="text-[8px] text-brand-medium/50">{formatTime(r.timestamp)}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleLike(q.id, r.id)}
                        className="flex items-center gap-1 text-brand-medium/40 hover:text-brand-gold transition-colors"
                      >
                        <ThumbsUp size={12} className={r.likes > 0 ? "fill-brand-gold/10 text-brand-gold" : ""} />
                        <span className="text-[9px] font-bold">{r.likes}</span>
                      </button>
                    </div>
                    <p className="text-xs text-brand-dark/80 dark:text-brand-darkText/80 leading-relaxed pl-1">
                      {r.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
