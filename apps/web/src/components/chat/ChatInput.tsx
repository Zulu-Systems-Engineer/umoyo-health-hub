import { Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

const chatInputSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
});

type ChatInputForm = z.infer<typeof chatInputSchema>;

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function ChatInput({
  onSubmit,
  isLoading = false,
  disabled = false,
}: ChatInputProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChatInputForm>({
    resolver: zodResolver(chatInputSchema),
  });

  const onFormSubmit = (data: ChatInputForm) => {
    onSubmit(data.message);
    reset();
  };

  const isDisabled = disabled || isLoading;

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className="fixed bottom-0 left-0 right-0 bg-background border-t p-4"
    >
      <div className="container mx-auto max-w-4xl flex gap-2 items-end">
        <div className="flex-1">
          <Textarea
            {...register("message")}
            placeholder="Ask about symptoms, treatments, medications..."
            className="min-h-[60px] resize-none"
            disabled={isDisabled}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(onFormSubmit)();
              }
            }}
          />
          {errors.message && (
            <p className="text-sm text-destructive mt-1">
              {errors.message.message}
            </p>
          )}
        </div>
        <Button
          type="submit"
          disabled={isDisabled}
          size="icon"
          className="h-[60px] w-[60px]"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </form>
  );
}
