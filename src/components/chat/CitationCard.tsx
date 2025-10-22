"use client";

import { FileText, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Citation {
  index: number;
  title: string;
  filename: string;
  pageStart?: number;
  pageEnd?: number;
  formatted: string;
}

interface CitationCardProps {
  citations: Citation[];
  onCitationClick?: (citation: Citation) => void;
}

export function CitationCard({
  citations,
  onCitationClick,
}: CitationCardProps) {
  if (citations.length === 0) return null;

  return (
    <Card className="p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold">Sources</h4>
      </div>

      <div className="space-y-2">
        {citations.map((citation) => (
          <button
            key={citation.index}
            onClick={() => onCitationClick?.(citation)}
            className="
              w-full text-left p-3 rounded-lg
              border border-border
              hover:bg-accent hover:border-primary
              transition-all duration-200
              group
            "
          >
            <div className="flex items-start justify-between gap-2">
              {/* Citation Number & Title */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs shrink-0">
                    [{citation.index}]
                  </Badge>
                  <span className="text-sm font-medium truncate">
                    {citation.title}
                  </span>
                </div>

                {/* Filename & Pages */}
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {citation.filename}
                  {citation.pageStart && (
                    <span className="ml-2">
                      • {citation.pageStart === citation.pageEnd
                        ? `p.${citation.pageStart}`
                        : `pp.${citation.pageStart}-${citation.pageEnd}`}
                    </span>
                  )}
                </p>
              </div>

              {/* External Link Icon */}
              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
