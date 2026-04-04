const STEP_LABELS = ['API Key', 'Teams', 'Amateurs', 'Fame', 'Review'];

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
}

export default function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center px-4 py-4">
      {STEP_LABELS.map((label, idx) => {
        const step = idx + 1;
        const isCompleted = completedSteps.has(step);
        const isCurrent = step === currentStep;
        const canNavigate = isCompleted || step < currentStep;

        return (
          <div key={step} className="flex items-center">
            {/* Step circle */}
            <button
              type="button"
              onClick={() => canNavigate && onStepClick(step)}
              disabled={!canNavigate}
              className={`
                flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold
                transition-all shrink-0
                ${isCurrent
                  ? 'bg-[#006747] text-white shadow-md ring-2 ring-[#006747]/30'
                  : isCompleted
                    ? 'bg-[#006747] text-white cursor-pointer active:scale-95'
                    : 'bg-gray-200 text-gray-400 cursor-default'
                }
              `}
              aria-label={`Step ${step}: ${label}`}
            >
              {isCompleted && !isCurrent ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step
              )}
            </button>

            {/* Label below */}
            <span
              className={`
                text-[10px] font-medium ml-1 mr-1
                ${isCurrent ? 'text-[#006747]' : isCompleted ? 'text-[#006747]/70' : 'text-gray-400'}
              `}
            >
              {label}
            </span>

            {/* Connector line */}
            {idx < STEP_LABELS.length - 1 && (
              <div
                className={`
                  w-4 h-0.5 mx-0.5
                  ${completedSteps.has(step) ? 'bg-[#006747]' : 'bg-gray-200'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
