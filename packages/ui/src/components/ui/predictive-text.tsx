"use client";

import { ArrowUp, ImageIcon, Mic } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import React, { useState, useEffect, useRef, useCallback } from "react";

interface PredictiveInputProps {
  dictionary?: string[];
  placeholder?: string;
  onSend?: (text: string) => void;
  className?: string;
}

const DEFAULT_WORDS = [
  "what",
  "whatever",
  "what's",
  "bright",
  "brighter",
  "brigade",
  "sunny",
  "sunset",
  "sun",
  "day",
  "dance",
  "data",
  "a",
  "an",
  "any",
];

export const PredictiveText: React.FC<PredictiveInputProps> = ({
  dictionary = DEFAULT_WORDS,
  placeholder = "Write a message",
  onSend,
  className = "",
}) => {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const [wordFrequency, setWordFrequency] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Build a combined dictionary from the provided list + frequently used words
  const enrichedDictionary = useCallback(() => {
    const freqWords = Object.keys(wordFrequency).sort(
      (a, b) => wordFrequency[b] - wordFrequency[a],
    );
    // Merge freq words first (for priority), then dedupe with base dictionary
    return Array.from(new Set([...freqWords, ...dictionary]));
  }, [dictionary, wordFrequency]);

  useEffect(() => {
    const words = text.split(/\s+/);
    const lastWord = words[words.length - 1].toLowerCase();

    if (lastWord.length > 0) {
      const dict = enrichedDictionary();
      const matches = dict
        .filter(
          (word) => word.toLowerCase().startsWith(lastWord) && word.toLowerCase() !== lastWord,
        )
        .slice(0, 3);

      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }

    // Reset active suggestion whenever text changes via typing
    setActiveSuggestionIndex(-1);
  }, [text, enrichedDictionary]);

  const applySuggestion = useCallback(
    (suggestion: string) => {
      const words = text.split(/\s+/);
      words[words.length - 1] = suggestion;
      const newText = words.join(" ") + " ";
      setText(newText);
      setActiveSuggestionIndex(-1);
      inputRef.current?.focus();
    },
    [text],
  );

  const handleSend = useCallback(() => {
    if (!text.trim()) return;

    // Track word frequency for smarter future suggestions
    const usedWords = text.trim().toLowerCase().split(/\s+/);
    setWordFrequency((prev) => {
      const updated = { ...prev };
      usedWords.forEach((w) => {
        updated[w] = (updated[w] ?? 0) + 1;
      });
      return updated;
    });

    onSend?.(text);
    setText("");
    setSuggestions([]);
  }, [text, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Enter": {
        if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
          e.preventDefault();
          applySuggestion(suggestions[activeSuggestionIndex]);
        } else {
          e.preventDefault();
          handleSend();
        }
        break;
      }

      case "Tab": {
        if (suggestions.length > 0) {
          e.preventDefault();
          // Cycle through suggestions, -1 means none selected
          const next = (activeSuggestionIndex + 1) % suggestions.length;
          setActiveSuggestionIndex(next);
        }
        break;
      }

      case "ArrowRight": {
        // Accept first suggestion on ArrowRight when cursor is at end
        const input = inputRef.current;
        if (suggestions.length > 0 && input && input.selectionStart === text.length) {
          e.preventDefault();
          applySuggestion(suggestions[0]);
        }
        break;
      }

      case "Escape": {
        if (suggestions.length > 0) {
          e.preventDefault();
          setSuggestions([]);
        } else if (text.length > 0) {
          e.preventDefault();
          setText("");
        }
        break;
      }

      default:
        break;
    }
  };

  return (
    <div
      className={`flex w-full flex-col items-center justify-center p-4 antialiased select-none sm:p-6 ${className}`}
    >
      <div className="relative mb-10 flex w-full max-w-[95%] flex-col items-start sm:mb-20 sm:max-w-md">
        <div className="mb-3 flex h-10 w-full items-center justify-start sm:h-12">
          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="flex items-center gap-0.5 rounded-full border-2 border-neutral-100 bg-white px-1 py-1 shadow-sm transition-colors dark:border-neutral-800 dark:bg-neutral-900"
              >
                {suggestions.map((word, i) => (
                  <button
                    key={word}
                    onClick={() => applySuggestion(word)}
                    className={`px-3 py-1 text-xs font-bold whitespace-nowrap transition-colors sm:px-4 sm:text-sm ${
                      i === activeSuggestionIndex
                        ? "text-blue-500 dark:text-blue-400"
                        : "text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
                    } ${i !== 0 ? "border-l-2 border-neutral-100 pl-3 sm:pl-4 dark:border-neutral-800" : ""} `}
                  >
                    {word}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="group relative w-full">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full rounded-4xl border-none bg-neutral-100 px-5 py-3.5 pr-20 text-sm font-bold tracking-wide text-black shadow-sm transition-all outline-none placeholder:text-neutral-400 focus:ring-1 focus:ring-neutral-200 sm:rounded-[22px] sm:px-6 sm:py-4 sm:pr-24 sm:text-base dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-800"
          />

          <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-2 sm:right-3 sm:gap-3">
            <AnimatePresence mode="wait">
              {text.length > 0 ? (
                <motion.button
                  key="send-btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleSend}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white shadow-md transition-all active:scale-90 sm:h-10 sm:w-10 dark:bg-white dark:text-black"
                >
                  <ArrowUp size={18} strokeWidth={3} />
                </motion.button>
              ) : (
                <motion.div
                  key="placeholder-icons"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 pr-1 text-neutral-400 sm:gap-4 sm:pr-2 dark:text-neutral-600"
                >
                  <ImageIcon
                    size={20}
                    className="cursor-pointer transition-colors hover:text-neutral-600 dark:hover:text-neutral-400"
                  />
                  <Mic
                    size={20}
                    className="cursor-pointer transition-colors hover:text-neutral-600 dark:hover:text-neutral-400"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
