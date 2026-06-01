import { useEffect, useMemo, useState } from "react";
import type React from "react";
import type { ResumeData, ResumeFormatting, SavedResume } from "../types";
import { defaultResumeFormatting } from "../formatting";
import { defaultResumeData, normalizeResumeData, normalizeResumeDataForPayload } from "../resumeData";
import { createSavedResume, deleteSavedResume, listSavedResumes, updateSavedResume } from "../resumeApi";

type UseResumePersistenceParams = {
    resumeData: ResumeData;
    setResumeData: React.Dispatch<React.SetStateAction<ResumeData>>;
    currentResumeFormatting: ResumeFormatting;
    applyResumeFormatting: (formatting?: Partial<ResumeFormatting>) => void;
    resetDraftState: () => void;
    error: string | null;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    successMessage: string | null;
    setSuccessMessage: React.Dispatch<React.SetStateAction<string | null>>;
};

export const useResumePersistence = ({
    resumeData,
    setResumeData,
    currentResumeFormatting,
    applyResumeFormatting,
    resetDraftState,
    error,
    setError,
    successMessage,
    setSuccessMessage
}: UseResumePersistenceParams) => {
    const [resumesList, setResumesList] = useState<SavedResume[]>([]);
    const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
    const [resumeName, setResumeName] = useState("Primary Resume");
    const [isMaster, setIsMaster] = useState(false);
    const [showCloneModal, setShowCloneModal] = useState(false);
    const [dontAskClone, setDontAskClone] = useState(false);
    const [loadingList, setLoadingList] = useState(false);
    const [loadingSave, setLoadingSave] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [resumeSearchFocusSignal] = useState(0);

    const activeSavedResume = useMemo(() => {
        return resumesList.find((r) => r.id === activeResumeId) || null;
    }, [resumesList, activeResumeId]);

    const filteredResumes = useMemo(() => {
        const source = searchQuery.trim()
            ? resumesList.filter((res) => {
                const matchesName = res.name.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesFullName = res.resume_data.fullName && res.resume_data.fullName.toLowerCase().includes(searchQuery.toLowerCase());
                return matchesName || matchesFullName;
            })
            : resumesList;

        return [...source].sort((a, b) => {
            if (a.is_master !== b.is_master) return a.is_master ? -1 : 1;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
    }, [resumesList, searchQuery]);

    const loadResumeIntoWorkspace = (res: SavedResume) => {
        setActiveResumeId(res.id);
        setResumeName(res.name);
        setIsMaster(res.is_master);
        const normalizedData = normalizeResumeData(res.resume_data);
        setResumeData(normalizedData);
        applyResumeFormatting(normalizedData.formatting);
        resetDraftState();
        setError(null);
        setSuccessMessage(null);
    };

    const handleCreateResume = async (cloneMaster: boolean, forceMaster: boolean = false) => {
        setShowCloneModal(false);
        setActiveResumeId(null);
        resetDraftState();
        setError(null);
        setSuccessMessage(null);

        let nextData: ResumeData;
        let nextName = "New Resume Version";
        let nextIsMaster = false;
        let sourceResumeId: string | null = null;

        if (forceMaster) {
            nextData = defaultResumeData();
            nextName = "Primary Resume";
            nextIsMaster = true;
        } else if (cloneMaster) {
            const master = resumesList.find((r) => r.is_master);
            if (master) {
                nextData = normalizeResumeData(JSON.parse(JSON.stringify(master.resume_data)));
                nextName = `Copy of ${master.name}`;
                sourceResumeId = master.id;
            } else {
                nextData = defaultResumeData();
            }
        } else {
            const defaultFormatting = defaultResumeFormatting();
            nextData = {
                fullName: "Your Name",
                experience: [],
                education: [],
                skills: [],
                formatting: defaultFormatting
            };
        }

        setResumeData(nextData);
        applyResumeFormatting(nextData.formatting);
        setIsMaster(nextIsMaster);
        setResumeName(nextName);
        setLoadingSave(true);

        try {
            const resp = await createSavedResume({
                name: nextName,
                is_master: nextIsMaster,
                source_resume_id: sourceResumeId,
                resume_data: normalizeResumeDataForPayload(nextData)
            });

            if (resp.status === "success") {
                loadResumeIntoWorkspace(resp.resume);
                await fetchResumes(resp.resume.id);
                setSuccessMessage(
                    nextIsMaster
                        ? "Primary resume created and saved."
                        : cloneMaster && sourceResumeId
                        ? "Resume cloned from master and saved."
                        : "Blank resume created and saved."
                );
            }
        } catch (err) {
            console.error(err);
            setError((err as Error).message || "Failed to create resume.");
        } finally {
            setLoadingSave(false);
        }
    };

    const fetchResumes = async (preferredActiveResumeId?: string) => {
        setLoadingList(true);
        setError(null);
        try {
            const resp = await listSavedResumes();
            if (resp.status === "success") {
                setResumesList(resp.resumes);
                if (resp.resumes.length > 0) {
                    if (preferredActiveResumeId) {
                        const preferred = resp.resumes.find((r) => r.id === preferredActiveResumeId);
                        if (preferred) {
                            loadResumeIntoWorkspace(preferred);
                        }
                    } else if (!activeResumeId) {
                        const master = resp.resumes.find((r) => r.is_master) || resp.resumes[0];
                        loadResumeIntoWorkspace(master);
                    }
                } else {
                    await handleCreateResume(false, true);
                }
            }
        } catch (err) {
            console.error(err);
            setError((err as Error).message || "Failed to load saved resumes.");
        } finally {
            setLoadingList(false);
        }
    };

    const handleCreateNewClick = () => {
        const hasExistingMaster = resumesList.some((r) => r.is_master);
        if (resumesList.length === 0 || !hasExistingMaster) {
            handleCreateResume(false, true);
            return;
        }

        const preferredAction = localStorage.getItem("resume_clone_preference");
        if (preferredAction === "clone") {
            handleCreateResume(true, false);
        } else if (preferredAction === "scratch") {
            handleCreateResume(false, false);
        } else {
            setShowCloneModal(true);
        }
    };

    const handleSaveResume = async () => {
        setLoadingSave(false);
        setError(null);
        setSuccessMessage(null);

        const finalPayloadData = normalizeResumeDataForPayload({
            ...resumeData,
            formatting: currentResumeFormatting
        });

        setLoadingSave(true);
        try {
            const resp = activeResumeId
                ? await updateSavedResume(activeResumeId, {
                    name: resumeName,
                    is_master: isMaster,
                    resume_data: finalPayloadData
                })
                : await createSavedResume({
                    name: resumeName,
                    is_master: isMaster,
                    source_resume_id: resumesList.find((r) => r.is_master)?.id || null,
                    resume_data: finalPayloadData
                });

            if (resp.status === "success") {
                setSuccessMessage("Resume saved successfully!");
                resetDraftState();
                await fetchResumes(resp.resume.id);
            }
        } catch (err) {
            console.error(err);
            setError((err as Error).message || "Failed to save resume.");
        } finally {
            setLoadingSave(false);
        }
    };

    const handleDeleteResume = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this resume?")) return;

        setError(null);
        setSuccessMessage(null);
        try {
            const resp = await deleteSavedResume(id);
            if (resp.status === "success") {
                setSuccessMessage("Resume deleted.");
                if (activeResumeId === id) {
                    setActiveResumeId(null);
                    const nextData = defaultResumeData();
                    setResumeData(nextData);
                    applyResumeFormatting(nextData.formatting);
                }
                fetchResumes();
            }
        } catch (err) {
            console.error(err);
            setError((err as Error).message || "Failed to delete resume.");
        }
    };

    useEffect(() => {
        fetchResumes();
        // Intentionally run once on mount to preserve the original resume-loading flow.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [setSuccessMessage, successMessage]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError(null);
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [error, setError]);

    useEffect(() => {
        if (!activeSavedResume) {
            setIsDirty(true);
            return;
        }
        const savedString = JSON.stringify(normalizeResumeDataForPayload(activeSavedResume.resume_data));
        const currentString = JSON.stringify(normalizeResumeDataForPayload({
            ...resumeData,
            formatting: currentResumeFormatting
        }));
        setIsDirty(savedString !== currentString || activeSavedResume.name !== resumeName || activeSavedResume.is_master !== isMaster);
    }, [resumeData, resumeName, isMaster, activeSavedResume, currentResumeFormatting]);

    return {
        resumesList,
        activeResumeId,
        resumeName,
        setResumeName,
        isMaster,
        setIsMaster,
        showCloneModal,
        setShowCloneModal,
        dontAskClone,
        setDontAskClone,
        error,
        setError,
        successMessage,
        setSuccessMessage,
        loadingList,
        loadingSave,
        isDirty,
        setIsDirty,
        searchQuery,
        setSearchQuery,
        resumeSearchFocusSignal,
        filteredResumes,
        loadResumeIntoWorkspace,
        handleCreateNewClick,
        handleCreateResume,
        handleSaveResume,
        handleDeleteResume
    };
};
