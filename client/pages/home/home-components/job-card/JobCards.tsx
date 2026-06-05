import type { JobCardType } from "@/types/jobCardType";
import { useEffect, useState } from "react";
import { useIsMultiSelecting } from "@/pages/home/hooks/useIsMultiSelecting";
import { useJobCard } from "@/pages/home/hooks/useJobCard";
import { JobCardButtonRow } from "@/pages/home/home-components/job-card/JobCardButtonRow";
import { JobCardButton } from "@/pages/home/home-components/job-card/JobCardButton";
import { JobCardContent } from "@/pages/home/home-components/job-card/JobCardContent";
import { JobCardTitle } from "@/pages/home/home-components/job-card/JobCardTitle";
import { JobCardReviewHeader } from "@/pages/home/home-components/job-card/JobCardReviewHeader";
import { JobCardContainer } from "@/pages/home/home-components/job-card/JobCardContainer";
import { useJobMutation } from "@/pages/home/hooks/useJobMutation";
import { useDeleteConfirm } from "@/pages/home/hooks/useDeleteConfirm";
import { openGmailMessage } from "@/pages/home/hooks/useOpenGmailMessage";
import editIcon from "@/assets/icons/edit.svg";
import viewIcon from "@/assets/icons/view.svg";
import reviewIcon from "@/assets/icons/reviewed.svg";
import trashIcon from "@/assets/icons/trash.svg";
import ConfirmModal from "@/global-components/ConfirmModal";
import archiveIcon from "@/assets/icons/folder.svg";

export function JobCard({
  job,
  dimmed,
  openJobAppModal,
}: {
  job: JobCardType;
  dimmed: boolean;
  openJobAppModal: (job: JobCardType) => void;
}) {
  const { isMultiSelecting } = useIsMultiSelecting();
  const { mutateJob } = useJobMutation();
  const { expandAll } = useJobCard();

  const deleteConfirm = useDeleteConfirm(async () => {
    await mutateJob(job, { type: "delete" });
  });

  const [localOpen, setLocalOpen] = useState<boolean | null>(null);
  const [isSelected, setIsSelected] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isOpen = localOpen ?? expandAll;

  const onTrashClicked = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isMultiSelecting) return;
    await new Promise((resolve) => {
      deleteConfirm.requestDelete(resolve);
    });
  };

  useEffect(() => {
    if (!isMultiSelecting && isSelected) {
      setIsSelected(false);
    }
  }, [isMultiSelecting, isSelected]);

  return (
    <JobCardContainer
      job={job}
      dimmed={dimmed}
      setIsHovered={setIsHovered}
      isSelected={isSelected}
    >
      <JobCardReviewHeader isVisible={job.reviewNeeded!} />

      <JobCardTitle
        job={job}
        isSelected={isSelected}
        setIsSelected={setIsSelected}
        isOpen={isOpen}
        setLocalOpen={setLocalOpen}
      />

      <JobCardContent isOpen={isOpen} job={job} />

      <JobCardButtonRow isHovered={isHovered}>
        <JobCardButton
          onClick={() => openJobAppModal(job)}
          icon={editIcon}
          aria-label="Edit Job"
          title="Edit Job"
          iconHoverColor="greenIcon"
        />

        <JobCardButton
          onClick={onTrashClicked}
          icon={trashIcon}
          aria-label="Delete Job"
          title="Delete Job"
          iconHoverColor="redIcon"
        />

        <JobCardButton
          onClick={() => mutateJob(job, { type: "archive" })}
          icon={archiveIcon}
          aria-label="Archive Job"
          title="Archive Job"
          iconHoverColor="purpleIcon"
        />

        <JobCardButton
          onClick={() => openGmailMessage(job.id)}
          icon={viewIcon}
          iconHoverColor="blueIcon"
          aria-label="Open Email"
          title="Open Email"
          isVisible={job.providerSource !== "manual_entry"}
        />

        <JobCardButton
          onClick={() => mutateJob(job, { type: "review" })}
          icon={reviewIcon}
          iconHoverColor="orangeIcon"
          aria-label="Review Job"
          title="Mark Job as Reviewed"
          isVisible={job.reviewNeeded}
        />
      </JobCardButtonRow>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        title="Confirm Deletion"
        message="Are you sure you want to delete the selected item/s? You can undo this action from the Trash however it will be permanently deleted after 30 days."
        confirmLabel="Delete"
        isProcessing={deleteConfirm.processing}
        onCancel={deleteConfirm.cancel}
        onConfirm={deleteConfirm.confirm}
      />
    </JobCardContainer>
  );
}
