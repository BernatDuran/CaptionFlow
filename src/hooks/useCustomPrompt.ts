import { useState } from "react";
import type { PromptSummary } from "../api/types";

export function useCustomPrompt(prompts: PromptSummary[], selectedPrompt: string) {
  const [isCustomPromptEnabled, setIsCustomPromptEnabled] = useState(false);
  const [customPromptContent, setCustomPromptContent] = useState("");
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);

  function handleToggleCustomPrompt(checked: boolean) {
    if (checked) {
      const prompt = prompts.find((item) => item.id === selectedPrompt);
      if (prompt) {
        setCustomPromptContent(prompt.content);
        setIsEditorModalOpen(true);
      }
      return;
    }

    resetCustomPrompt();
  }

  function handleSaveCustomPrompt(content: string) {
    setCustomPromptContent(content);
    setIsCustomPromptEnabled(true);
    setIsEditorModalOpen(false);
  }

  function resetCustomPrompt() {
    setIsEditorModalOpen(false);
    setIsCustomPromptEnabled(false);
    setCustomPromptContent("");
  }

  return {
    customPromptContent,
    handleSaveCustomPrompt,
    handleToggleCustomPrompt,
    isCustomPromptEnabled,
    isEditorModalOpen,
    resetCustomPrompt
  };
}
