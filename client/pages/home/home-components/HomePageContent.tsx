import { motion } from "framer-motion";
import { MultiSelectProvider } from "@/pages/home/providers/MultiSelectProvider";
import { UndoRedoProvider } from "@/pages/home/providers/UndoRedoProvider";
import { DragProvider } from "@/pages/home/providers/DragProvider";
import { SelectedJobsProvider } from "../providers/SelectedJobsProvider";

export function HomePageContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      key="content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex items-center justify-center flex-col relative"
    >
      <MultiSelectProvider>
        <UndoRedoProvider>
          <DragProvider>
            <SelectedJobsProvider>
                {children}
            </SelectedJobsProvider>
          </DragProvider>
        </UndoRedoProvider>
      </MultiSelectProvider>
    </motion.div>
  );
}
