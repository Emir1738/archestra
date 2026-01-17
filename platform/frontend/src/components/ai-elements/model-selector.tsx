"use client";

import { providerDisplayNames, type SupportedProvider } from "@shared";
// EyeIcon ve GlobeIcon buraya eklendi
import { CheckIcon, EyeIcon, GlobeIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelector as ModelSelectorRoot,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { PromptInputButton } from "@/components/ai-elements/prompt-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useModelsByProvider } from "@/lib/chat-models.query";

interface ModelSelectorProps {
  /** Currently selected model */
  selectedModel: string;
  /** Callback when model is changed */
  onModelChange: (model: string) => void;
  /** Whether the selector should be disabled */
  disabled?: boolean;
  /** Number of messages in current conversation (for mid-conversation warning) */
  messageCount?: number;
  /** Callback when the selector opens or closes */
  onOpenChange?: (open: boolean) => void;
}

/** Map our provider names to logo provider names */
const providerToLogoProvider: Record<SupportedProvider, string> = {
  openai: "openai",
  anthropic: "anthropic",
  gemini: "google",
  cerebras: "cerebras",
  vllm: "vllm",
  ollama: "ollama",
  zhipuai: "zhipuai",
};

export function ModelSelector({
  selectedModel,
  onModelChange,
  disabled = false,
  messageCount = 0,
  onOpenChange: onOpenChangeProp,
}: ModelSelectorProps) {
  const { modelsByProvider } = useModelsByProvider();
  const [pendingModel, setPendingModel] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChangeProp?.(newOpen);
  };

  const availableProviders = useMemo(() => {
    return Object.keys(modelsByProvider) as SupportedProvider[];
  }, [modelsByProvider]);

  const getProviderForModel = (model: string): SupportedProvider | null => {
    for (const provider of availableProviders) {
      if (modelsByProvider[provider]?.some((m) => m.id === model)) {
        return provider;
      }
    }
    return null;
  };

  const selectedModelProvider = getProviderForModel(selectedModel);
  const selectedModelLogo = selectedModelProvider
    ? providerToLogoProvider[selectedModelProvider]
    : null;

  const selectedModelDisplayName = useMemo(() => {
    for (const provider of availableProviders) {
      const model = modelsByProvider[provider]?.find(
        (m) => m.id === selectedModel,
      );
      if (model) return model.displayName;
    }
    return selectedModel;
  }, [selectedModel, availableProviders, modelsByProvider]);

  const handleSelectModel = (model: string) => {
    if (model === selectedModel) {
      handleOpenChange(false);
      return;
    }
    handleOpenChange(false);
    if (messageCount > 0) {
      setPendingModel(model);
    } else {
      onModelChange(model);
    }
  };

  const handleConfirmChange = () => {
    if (pendingModel) {
      onModelChange(pendingModel);
      setPendingModel(null);
    }
  };

  const handleCancelChange = () => {
    setPendingModel(null);
  };

  const allAvailableModelIds = useMemo(
    () =>
      availableProviders.flatMap(
        (provider) => modelsByProvider[provider]?.map((m) => m.id) ?? [],
      ),
    [availableProviders, modelsByProvider],
  );
  const isModelAvailable = allAvailableModelIds.includes(selectedModel);

  if (availableProviders.length === 0) {
    return (
      <PromptInputButton disabled className="min-w-40">
        <ModelSelectorName>No models available</ModelSelectorName>
      </PromptInputButton>
    );
  }

  return (
    <>
      <ModelSelectorRoot open={open} onOpenChange={handleOpenChange}>
        <ModelSelectorTrigger asChild>
          <PromptInputButton disabled={disabled}>
            {selectedModelLogo && (
              <ModelSelectorLogo provider={selectedModelLogo} />
            )}
            <ModelSelectorName>
              {selectedModelDisplayName || "Select model"}
            </ModelSelectorName>
          </PromptInputButton>
        </ModelSelectorTrigger>
        <ModelSelectorContent
          title="Select Model"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <ModelSelectorInput placeholder="Search models..." />
          <ModelSelectorList>
            <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>

            {!isModelAvailable && selectedModel && (
              <ModelSelectorGroup heading="Current (API key missing)">
                <ModelSelectorItem
                  disabled
                  value={selectedModel}
                  className="text-yellow-600"
                >
                  {selectedModelLogo && (
                    <ModelSelectorLogo provider={selectedModelLogo} />
                  )}
                  <ModelSelectorName>{selectedModel}</ModelSelectorName>
                  <CheckIcon className="ml-auto size-4" />
                </ModelSelectorItem>
              </ModelSelectorGroup>
            )}

            {availableProviders.map((provider) => (
              <ModelSelectorGroup
                key={provider}
                heading={providerDisplayNames[provider]}
              >
                {modelsByProvider[provider]?.map((model) => (
                  <ModelSelectorItem
                    key={model.id}
                    value={model.id}
                    onSelect={() => handleSelectModel(model.id)}
                  >
                    <ModelSelectorLogo
                      provider={providerToLogoProvider[provider]}
                    />
                    <ModelSelectorName>{model.displayName}</ModelSelectorName>

                    {/* YETENEK İKONLARI BURAYA EKLENDİ */}
                    <div className="ml-auto flex items-center gap-2">
                      {model.capabilities?.vision && (
                        <EyeIcon className="size-3.5 text-muted-foreground" />
                      )}
                      {model.capabilities?.web_search && (
                        <GlobeIcon className="size-3.5 text-muted-foreground" />
                      )}
                      {selectedModel === model.id ? (
                        <CheckIcon className="size-4 ml-1" />
                      ) : (
                        <div className="size-4 ml-1" />
                      )}
                    </div>
                  </ModelSelectorItem>
                ))}
              </ModelSelectorGroup>
            ))}
          </ModelSelectorList>
        </ModelSelectorContent>
      </ModelSelectorRoot>

      <AlertDialog
        open={!!pendingModel}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelChange();
            onOpenChangeProp?.(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change model mid-conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              Switching models during a conversation may affect response quality
              and consistency.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmChange}>
              Change Model
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
