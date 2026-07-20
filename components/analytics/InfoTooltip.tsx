import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// A small "i" badge next to a metric label — hover/focus for a plain-English
// explanation of what the term means, since "engagement rate" and "bounce
// rate" aren't self-evident to everyone reading this page.
export function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button type="button" aria-label="What does this mean?" className="inline-flex text-muted-foreground/60 hover:text-muted-foreground" />
        }
      >
        <Info className="size-3" />
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
