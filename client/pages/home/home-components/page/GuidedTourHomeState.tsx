import { useEffect, useRef } from "react";
import { useGuidedTourSession } from "@/app/layouts/guidedTourSessionContext";
import { IS_DEMO_MODE } from "@/global-services/projectMode";
import { useIsMultiSelecting } from "@/pages/home/hooks/useIsMultiSelecting";
import { useSelectedJobs } from "@/pages/home/hooks/useSelectedJobs";
import { dispatchJobLocalChange } from "@/pages/home/utils/jobLocalChangeEvent";

export function GuidedTourHomeState() {
  const { homeInteractionState, demoDataRevision, demoJobs } =
    useGuidedTourSession();
  const { setIsMultiSelecting } = useIsMultiSelecting();
  const { selectedJobs, setSelectedJobs } = useSelectedJobs();
  const selectionReadyRef = useRef(false);

  useEffect(() => {
    if (!IS_DEMO_MODE) return;

    if (homeInteractionState === "selecting-cards") {
      selectionReadyRef.current = false;
      setIsMultiSelecting(true);
      setSelectedJobs([]);
      return;
    }

    if (
      homeInteractionState === "bulk-selected" ||
      homeInteractionState === "delete-confirmation"
    ) {
      setIsMultiSelecting(true);
      return;
    }

    setIsMultiSelecting(false);
    if (
      homeInteractionState === "idle" ||
      homeInteractionState === "select-control" ||
      homeInteractionState === "free"
    ) {
      setSelectedJobs([]);
    }
  }, [
    demoDataRevision,
    homeInteractionState,
    setIsMultiSelecting,
    setSelectedJobs,
  ]);

  useEffect(() => {
    if (!IS_DEMO_MODE || homeInteractionState !== "selecting-cards") return;

    if (selectedJobs.length === 0) {
      selectionReadyRef.current = true;
    }
    if (!selectionReadyRef.current) return;

    window.dispatchEvent(
      new CustomEvent("guided-tour-selection-count", {
        detail: { count: selectedJobs.length },
      })
    );
  }, [homeInteractionState, selectedJobs.length]);

  useEffect(() => {
    if (!IS_DEMO_MODE || homeInteractionState !== "selecting-cards") return;

    const selectInterviewCards = () => {
      setSelectedJobs(
        demoJobs.filter(
          (job) =>
            !job.isArchived &&
            !job.isDeleted &&
            (job.column === "interview" ||
              job.applicationStage === "interview")
        )
      );
    };

    window.addEventListener(
      "guided-tour-select-interview",
      selectInterviewCards
    );
    return () =>
      window.removeEventListener(
        "guided-tour-select-interview",
        selectInterviewCards
      );
  }, [demoJobs, homeInteractionState, setSelectedJobs]);

  useEffect(() => {
    if (!IS_DEMO_MODE) return;

    const acceptOfferForTour = () => {
      const offer = demoJobs.find(
        (job) => job.id === "demo-email-juniper-offer"
      );
      if (!offer) return;

      dispatchJobLocalChange({
        before: offer,
        after: {
          ...offer,
          column: "accepted",
          applicationStage: "accepted",
          reviewNeeded: false,
        },
      });
    };

    window.addEventListener("guided-tour-accept-offer", acceptOfferForTour);
    return () =>
      window.removeEventListener(
        "guided-tour-accept-offer",
        acceptOfferForTour
      );
  }, [demoJobs]);

  return null;
}
