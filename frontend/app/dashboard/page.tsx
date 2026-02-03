"use client";
import { useStore } from '../../store/useStore';
import { AnimatePresence, motion } from 'framer-motion';
import Step1 from '../../components/steps/Step1_Input';
import Step2 from '../../components/steps/Step2_BOQ';
import Step3 from '../../components/steps/Step3_WBS';
import Step4 from '../../components/steps/Step4_BOM';
import Step5 from '../../components/steps/Step5_Cost';

export default function DashboardPage() {
  const { step } = useStore();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.99 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full h-full"
      >
        {step === 1 && <Step1 />}
        {step === 2 && <Step2 />}
        {step === 3 && <Step3 />}
        {step === 4 && <Step4 />}
        {step === 5 && <Step5 />}
      </motion.div>
    </AnimatePresence>
  );
}