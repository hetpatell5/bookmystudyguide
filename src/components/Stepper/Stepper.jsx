import React from "react";
import "./Stepper.scss";

const DEFAULT_LABELS = ["Your details", "Account", "Verify"];

/**
 * @param {string[]} [props.steps] — custom labels
 * @param {number} [props.active] — 0-based (legacy)
 * @param {number} [props.currentStep] — 1-based (with totalSteps)
 * @param {number} [props.totalSteps]
 */
export default function Stepper({
  steps: stepsProp,
  active: activeProp = 0,
  currentStep,
  totalSteps = 3,
  onChange = () => {},
}) {
  const labels =
    stepsProp?.length > 0
      ? stepsProp
      : DEFAULT_LABELS.slice(0, totalSteps);

  const activeIndex =
    currentStep != null
      ? Math.min(Math.max(currentStep - 1, 0), labels.length - 1)
      : Math.min(Math.max(activeProp, 0), labels.length - 1);

  return (
    <nav className="bmsg-stepper" aria-label="Registration progress">
      <div className="bmsg-stepper-track" role="list">
        {labels.map((label, idx) => {
          const status =
            idx < activeIndex
              ? "completed"
              : idx === activeIndex
                ? "active"
                : "upcoming";
          const lineBeforeDone = idx > 0 && idx <= activeIndex;

          return (
            <React.Fragment key={idx}>
              {idx > 0 && (
                <div
                  className={`stepper-line-between ${lineBeforeDone ? "is-done" : ""}`}
                  aria-hidden
                />
              )}
              <div className={`stepper-item ${status}`} role="listitem">
                <div className="flex-stepper">
                  <button
                    type="button"
                    aria-current={idx === activeIndex ? "step" : undefined}
                    className="stepper-btn"
                    onClick={() => onChange(idx)}
                    disabled={idx > activeIndex}
                  >
                    <span className="stepper-circle">{idx + 1}</span>
                  </button>
                  <span className="stepper-label">{label}</span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <p className="bmsg-stepper-summary" aria-live="polite">
        Step {activeIndex + 1} of {labels.length}
      </p>
    </nav>
  );
}
