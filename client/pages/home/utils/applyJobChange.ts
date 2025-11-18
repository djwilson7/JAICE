import type { JobCardType } from "@/types/jobCardType";
import { convertBroadcastToJobCard } from "@/pages/home/utils/convertToJobCard";

// Mapping function to handle the event types 
export function applyJobChange(prev: JobCardType[], event: any): JobCardType[] {
  switch (event.event) {
    case "INSERT":
      return handleInsert(prev, event);
    case "UPDATE":
      return handleUpdate(prev, event);
    case "DELETE":
      return handleDelete(prev, event);
    default:
      console.warn("Unhandled event type:", event.event);
      return prev;
  }
}

// Adds new job cards
function handleInsert(prev: JobCardType[], event: any): JobCardType[] {
  const newCard = convertBroadcastToJobCard(event);
  if (!newCard) return prev;

  const exists = prev.some((c) => c.id === newCard.id);
  if (exists) {
    return prev.map((c) => (c.id === newCard.id ? newCard : c));
  }
  return [newCard, ...prev];
}

// Updates existing job cards
function handleUpdate(prev: JobCardType[], event: any): JobCardType[] {
  const updatedCard = convertBroadcastToJobCard(event);
  if (!updatedCard) return prev;

  const exists = prev.some((c) => String(c.id) === String(updatedCard.id));
  if (!exists) {
    console.warn(`Update: no existing card with id ${updatedCard.id}`);
    return prev;
  }

  if (updatedCard.isArchived || updatedCard.isDeleted) {
    console.log(
      `Update: card ${updatedCard.id} marked archived/deleted, removing from view.`
    );
    return prev.filter((c) => String(c.id) !== String(updatedCard.id));
  }

  console.log(`Update: replaced card with id ${updatedCard.id}`, updatedCard);
  return prev.map((c) =>
    String(c.id) === String(updatedCard.id) ? updatedCard : c
  );
}

// Removes job cards that are deleted from the database
function handleDelete(prev: JobCardType[], event: any): JobCardType[] {
  const deletedId = event?.payload?.old?.provider_message_id;
  if (!deletedId) {
    console.warn("Delete event missing old.id:", event);
    return prev;
  }

  const targetId = String(deletedId);

  const next = prev.filter((card) => String(card.id) !== String(targetId));

  console.log(`Delete: removed card with id ${targetId}`);
  return next;
}
