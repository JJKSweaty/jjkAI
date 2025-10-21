import { AlertCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ContinuationPromptProps {
  message: string;
  cost: number;
  continuationCount: number;
  onContinue: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ContinuationPrompt({
  message,
  cost,
  continuationCount,
  onContinue,
  onCancel,
  isLoading = false
}: ContinuationPromptProps) {
  return (
    <Card className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 dark:from-yellow-950/20 dark:to-orange-950/20 dark:border-yellow-800">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-700 dark:text-yellow-400" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Long Response Detected
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            {message}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-4">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span className="font-medium">
                Cost so far: <span className="text-yellow-700 dark:text-yellow-400">${cost.toFixed(4)}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">
                Continuations: <span className="text-yellow-700 dark:text-yellow-400">{continuationCount}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onContinue}
              disabled={isLoading}
              className="bg-yellow-600 hover:bg-yellow-700 text-white shadow-sm"
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Continuing...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 mr-1.5" />
                  Continue Generating
                </>
              )}
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              disabled={isLoading}
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Stop Here
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}