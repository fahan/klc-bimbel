import React from 'react'
import { Check } from 'lucide-react'

interface EnrollmentStepperProps {
  currentStep: number
  steps: string[]
}

export default function EnrollmentStepper({ currentStep, steps }: EnrollmentStepperProps) {
  return (
    <div className="flex items-center justify-start gap-2">
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const isCompleted = stepNumber < currentStep
        const isActive = stepNumber === currentStep
        const isInactive = stepNumber > currentStep

        return (
          <React.Fragment key={index}>
            {/* Step Circle */}
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition ${
                isCompleted ? 'bg-green-100 text-green-700' : isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {isCompleted ? <Check className="w-6 h-6" /> : stepNumber}
            </div>

            {/* Step Label */}
            <span
              className={`text-sm font-medium ${
                isActive
                  ? 'text-blue-700'
                  : isCompleted
                    ? 'text-green-700'
                    : 'text-gray-500'
              }`}
            >
              {step}
            </span>

            {/* Divider (except for last step) */}
            {stepNumber < steps.length && (
              <div className={`h-0.5 w-12 mx-2 ${isCompleted ? 'bg-green-300' : 'bg-gray-300'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
