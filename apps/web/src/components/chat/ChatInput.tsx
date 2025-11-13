import { Send, Mic, MicOff, Paperclip, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { useState, useRef, useEffect } from "react";

const chatInputSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
});

type ChatInputForm = z.infer<typeof chatInputSchema>;

interface QuickAction {
  icon: string;
  text: string;
  query: string;
}

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  quickActions?: QuickAction[];
  onQuickAction?: (query: string) => void;
}

export default function ChatInput({
  onSubmit,
  isLoading = false,
  disabled = false,
  quickActions,
  onQuickAction,
}: ChatInputProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ChatInputForm>({
    resolver: zodResolver(chatInputSchema),
  });

  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const message = watch("message");

  const onFormSubmit = (data: ChatInputForm) => {
    onSubmit(data.message);
    reset();
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const isDisabled = disabled || isLoading;

  // Auto-resize textarea on mount and when message changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [message]);

  const handleQuickAction = (query: string) => {
    if (onQuickAction) {
      onQuickAction(query);
    } else {
      setValue("message", query);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // In a real app, you would integrate with Web Speech API here
    if (!isRecording) {
      // Start recording
      console.log("Starting voice recording...");
    } else {
      // Stop recording
      console.log("Stopping voice recording...");
    }
  };

  const placeholderText = quickActions 
    ? "Ask about symptoms, treatments, medications..."
    : "Type your message here...";

  return (
    <div className="w-full">
      {/* Quick Actions Bar */}
      {/*
      {quickActions && quickActions.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Quick questions:</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleQuickAction(action.query)}
                disabled={isDisabled}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white border border-blue-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm"
              >
                <span className="text-lg">{action.icon}</span>
                <span className="text-gray-700 group-hover:text-blue-700 font-medium">
                  {action.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      */}
      {/* Input Form */}
      <form
        onSubmit={handleSubmit(onFormSubmit)}
        className="bg-background border border-blue-200 rounded-2xl p-2 shadow-sm hover:shadow-md transition-shadow duration-200"
      >
        <div className="flex gap-3 items-end">
          {/* Attachment Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isDisabled}
            className="h-10 w-10 rounded-xl flex-shrink-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <Textarea
              {...register("message")}
              ref={(e) => {
                // Merge refs for react-hook-form and our own ref
                const { ref: registerRef } = register("message");
                if (typeof registerRef === 'function') {
                  registerRef(e);
                }
                (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
              }}
              placeholder={placeholderText}
              className="min-h-[60px] max-h-[120px] resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-4 text-base"
              disabled={isDisabled}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (message?.trim()) {
                    handleSubmit(onFormSubmit)();
                  }
                }
              }}
            />
            
            {/* Character count / typing indicator */}
            {message && (
              <div className="absolute bottom-1 right-2">
                <div className="text-xs text-gray-400 bg-white/80 px-1 rounded">
                  {message.length}/500
                </div>
              </div>
            )}
          </div>

          {/* Voice Recording Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isDisabled}
            onClick={toggleRecording}
            className={`h-10 w-10 rounded-xl flex-shrink-0 transition-all duration-200 ${
              isRecording 
                ? "text-red-600 bg-red-50 animate-pulse" 
                : "text-gray-500 hover:text-blue-600 hover:bg-blue-50"
            }`}
            title={isRecording ? "Stop recording" : "Start voice recording"}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          {/* Send Button */}
          <Button
            type="submit"
            disabled={isDisabled || !message?.trim()}
            size="icon"
            className={`h-12 w-12 rounded-xl flex-shrink-0 transition-all duration-200 ${
              message?.trim() 
                ? "bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl" 
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-5 w-5 text-white" />
            )}
          </Button>
        </div>

        {/* Error Message */}
        {errors.message && (
          <div className="px-3 pt-2">
            <p className="text-sm text-red-600 flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
              {errors.message.message}
            </p>
          </div>
        )}
      </form>

      {/* Helper Text */}
      <div className="mt-2 text-center">
        <p className="text-xs text-gray-500">
          Press <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-blue-200 rounded shadow-sm">Enter</kbd> to send,{" "}
          <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-blue-200 rounded shadow-sm">Shift + Enter</kbd> for new line
        </p>
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl animate-pulse shadow-sm">
          <div className="flex items-center gap-3 text-red-700">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm font-medium">Recording... Click to stop</span>
          </div>
        </div>
      )}
    </div>
  );
}